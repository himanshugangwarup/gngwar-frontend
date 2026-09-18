from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import re
import hmac
import hashlib
import secrets
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Annotated

import bcrypt
import httpx
import jwt
import razorpay
from bson import ObjectId
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field, BeforeValidator, field_validator

try:
    from twilio.rest import Client as TwilioClient
except Exception:  # pragma: no cover
    TwilioClient = None


# ---------------------------------------------------------------------------
# App / DB
# ---------------------------------------------------------------------------
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24  # 1 day (session-friendly for MVP)
BOOKINGS_COLLECTION = "bookings"
USERS_COLLECTION = "users"
REMINDERS_COLLECTION = "reminders_log"

# Referral program
REFERRAL_FRIEND_DISCOUNT_PCT = 15  # First booking discount for the referred user
REFERRAL_REFERRER_CREDIT = 150.0    # Credited to referrer when referred user's first booking is paid

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "").strip()
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
RAZORPAY_ENABLED = bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_ENABLED else None

# Twilio (SMS + WhatsApp reminders)
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()
TWILIO_WHATSAPP_FROM = os.environ.get("TWILIO_WHATSAPP_FROM", "").strip()
TWILIO_CHANNEL = os.environ.get("TWILIO_CHANNEL", "whatsapp").strip().lower() or "whatsapp"
TWILIO_ENABLED = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TwilioClient is not None)
twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if TWILIO_ENABLED else None

# Resend (weekly email digest)
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
WEEKLY_REPORT_EMAIL = os.environ.get("WEEKLY_REPORT_EMAIL", "").strip()
RESEND_ENABLED = bool(RESEND_API_KEY and WEEKLY_REPORT_EMAIL)

# First-booking deal for every signed-in visitor (auto-applied, does NOT stack with referral)
FIRST_BOOKING_DISCOUNT_PCT = 10

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="GngWar API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("gngwar")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: str = "customer"
    referral_code: Optional[str] = None
    credit_balance: float = 0.0
    referred_by_code: Optional[str] = None
    created_at: Optional[str] = None


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=80)
    referral_code: Optional[str] = Field(default=None, max_length=20)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class BookingIn(BaseModel):
    service: str = Field(min_length=1, max_length=120)
    duration: str = Field(min_length=1, max_length=40)
    price: float
    original: float
    name: str = Field(min_length=1, max_length=80)
    mobile: str
    address: str = Field(min_length=3, max_length=300)
    date: str
    time: str

    @field_validator("mobile")
    @classmethod
    def _mobile(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10 or len(digits) > 13:
            raise ValueError("Enter a valid 10-digit mobile number")
        return digits


class BookingOut(BaseModel):
    id: str
    service: str
    duration: str
    price: float
    original: float
    list_price: float = 0.0
    discount_pct: int = 0
    credit_used: float = 0.0
    name: str
    mobile: str
    address: str
    date: str
    time: str
    status: str
    payment_status: str = "unpaid"
    payment_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    reminder_status: str = "pending"
    user_id: Optional[str] = None
    created_at: str


class BookingStatusUpdate(BaseModel):
    status: str = Field(pattern="^(requested|confirmed|completed|cancelled)$")


class RazorpayOrderIn(BaseModel):
    booking_id: str


class RazorpayVerifyIn(BaseModel):
    booking_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ---------------------------------------------------------------------------
# Password + JWT helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session token")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    try:
        user = await db[USERS_COLLECTION].find_one({"_id": ObjectId(payload["sub"])})
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    user["id"] = str(user.pop("_id"))
    user.pop("password_hash", None)
    return user


def _serialize_user_from_doc(doc: dict) -> UserOut:
    referred_code = None
    if doc.get("referred_by"):
        # embedded referral code kept on doc for fast display
        referred_code = doc.get("referred_by_code")
    return UserOut(
        id=str(doc.get("_id") or doc.get("id")),
        email=doc["email"],
        name=doc.get("name", ""),
        role=doc.get("role", "customer"),
        referral_code=doc.get("referral_code"),
        credit_balance=float(doc.get("credit_balance", 0) or 0),
        referred_by_code=referred_code,
        created_at=(doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at")),
    )


def serialize_user(user_doc: dict) -> UserOut:
    return _serialize_user_from_doc(user_doc)


def generate_referral_code() -> str:
    return "GNG" + secrets.token_hex(3).upper()  # e.g. GNG3F9A2C


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_TOKEN_MINUTES * 60,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie("access_token", path="/")


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api.post("/auth/register", response_model=UserOut, status_code=201)
async def register(body: RegisterIn, response: Response):
    email = body.email.lower().strip()
    existing = await db[USERS_COLLECTION].find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # Optional referral
    referred_by_id = None
    referred_by_code = None
    if body.referral_code:
        code = body.referral_code.strip().upper()
        referrer = await db[USERS_COLLECTION].find_one({"referral_code": code})
        if referrer:
            referred_by_id = str(referrer["_id"])
            referred_by_code = code

    # Unique referral code for this user
    ref_code = generate_referral_code()
    while await db[USERS_COLLECTION].find_one({"referral_code": ref_code}):
        ref_code = generate_referral_code()

    doc = {
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "role": "customer",
        "referral_code": ref_code,
        "credit_balance": 0.0,
        "referred_by": referred_by_id,
        "referred_by_code": referred_by_code,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db[USERS_COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id

    token = create_access_token(str(result.inserted_id), email)
    set_auth_cookie(response, token)
    return serialize_user(doc)


@api.post("/auth/login", response_model=UserOut)
async def login(body: LoginIn, response: Response):
    email = body.email.lower().strip()
    user = await db[USERS_COLLECTION].find_one({"email": email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token(str(user["_id"]), email)
    set_auth_cookie(response, token)
    return serialize_user(user)


@api.post("/auth/logout")
async def logout(response: Response, _: dict = Depends(get_current_user)):
    clear_auth_cookie(response)
    return {"ok": True}


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return serialize_user({**user, "_id": user["id"]})


# ---------------------------------------------------------------------------
# Booking routes
# ---------------------------------------------------------------------------
def _booking_to_out(doc: dict) -> BookingOut:
    return BookingOut(
        id=str(doc.get("_id") or doc.get("id")),
        service=doc["service"],
        duration=doc["duration"],
        price=float(doc["price"]),
        original=float(doc["original"]),
        list_price=float(doc.get("list_price", doc["price"])),
        discount_pct=int(doc.get("discount_pct", 0)),
        credit_used=float(doc.get("credit_used", 0)),
        name=doc["name"],
        mobile=doc["mobile"],
        address=doc["address"],
        date=doc["date"],
        time=doc["time"],
        status=doc.get("status", "requested"),
        payment_status=doc.get("payment_status", "unpaid"),
        payment_id=doc.get("payment_id"),
        razorpay_order_id=doc.get("razorpay_order_id"),
        reminder_status=doc.get("reminder_status", "pending"),
        user_id=doc.get("user_id"),
        created_at=doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else doc["created_at"],
    )


async def _maybe_award_referrer(user_id: str, booking_id: str) -> None:
    """When a user's *first* paid booking is completed, credit their referrer ₹150."""
    user_doc = await db[USERS_COLLECTION].find_one({"_id": ObjectId(user_id)})
    if not user_doc or not user_doc.get("referred_by"):
        return
    # Check whether the referrer has already been rewarded for this user
    if user_doc.get("first_paid_reward_at"):
        return
    referrer_oid = ObjectId(user_doc["referred_by"])
    # Mark this user as having received their referral reward
    await db[USERS_COLLECTION].update_one(
        {"_id": user_doc["_id"], "first_paid_reward_at": {"$exists": False}},
        {"$set": {"first_paid_reward_at": datetime.now(timezone.utc), "first_paid_booking_id": booking_id}},
    )
    # Credit the referrer
    await db[USERS_COLLECTION].update_one(
        {"_id": referrer_oid},
        {"$inc": {"credit_balance": REFERRAL_REFERRER_CREDIT}},
    )
    logger.info("Referral reward: %s credited to referrer of user %s (booking %s)", REFERRAL_REFERRER_CREDIT, user_id, booking_id)


async def _compute_booking_pricing(user_doc: Optional[dict], list_price: float) -> dict:
    """Return the pricing breakdown for an authenticated user (or list_price only)."""
    discount_pct = 0
    discount_reason = None
    credit_available = 0.0
    if user_doc:
        prior = await db[BOOKINGS_COLLECTION].count_documents({"user_id": str(user_doc["_id"])})
        # Higher discount wins. Referral 15% > First-booking 10%.
        if prior == 0:
            if user_doc.get("referred_by"):
                discount_pct = REFERRAL_FRIEND_DISCOUNT_PCT
                discount_reason = "referral"
            else:
                discount_pct = FIRST_BOOKING_DISCOUNT_PCT
                discount_reason = "first_booking"
        credit_available = float(user_doc.get("credit_balance", 0) or 0)

    after_discount = round(list_price * (100 - discount_pct) / 100, 2)
    credit_used = round(min(credit_available, after_discount), 2)
    final_price = round(after_discount - credit_used, 2)
    return {
        "list_price": round(float(list_price), 2),
        "discount_pct": discount_pct,
        "discount_reason": discount_reason,
        "after_discount": after_discount,
        "credit_available": round(credit_available, 2),
        "credit_used": credit_used,
        "final_price": final_price,
    }


@api.post("/bookings", response_model=BookingOut, status_code=201)
async def create_booking(body: BookingIn, request: Request):
    # Try to associate booking with logged-in user (optional)
    user_id: Optional[str] = None
    user_doc: Optional[dict] = None
    try:
        current = await get_current_user(request)
        user_id = current["id"]
        user_doc = await db[USERS_COLLECTION].find_one({"_id": ObjectId(user_id)})
    except HTTPException:
        user_id = None
        user_doc = None

    quote = await _compute_booking_pricing(user_doc, float(body.price))

    doc = {
        "_id": ObjectId(),
        "service": body.service,
        "duration": body.duration,
        "list_price": quote["list_price"],
        "price": quote["final_price"],
        "original": float(body.original),
        "discount_pct": quote["discount_pct"],
        "discount_reason": quote.get("discount_reason"),
        "credit_used": quote["credit_used"],
        "name": body.name.strip(),
        "mobile": body.mobile,
        "address": body.address.strip(),
        "date": body.date,
        "time": body.time,
        "status": "requested",
        "payment_status": "unpaid" if quote["final_price"] > 0 else "paid",
        "payment_id": None,
        "razorpay_order_id": None,
        "reminder_status": "pending",
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
    }
    await db[BOOKINGS_COLLECTION].insert_one(doc)

    # Deduct credit from user balance (if any)
    if user_id and quote["credit_used"] > 0:
        await db[USERS_COLLECTION].update_one(
            {"_id": ObjectId(user_id)},
            {"$inc": {"credit_balance": -quote["credit_used"]}},
        )

    # If price is fully covered by credit, treat as paid and reward referrer if first paid.
    if user_id and quote["final_price"] == 0:
        await _maybe_award_referrer(user_id, str(doc["_id"]))

    return _booking_to_out(doc)


@api.get("/bookings/me", response_model=List[BookingOut])
async def my_bookings(user: dict = Depends(get_current_user)):
    cursor = db[BOOKINGS_COLLECTION].find({"user_id": user["id"]}).sort("created_at", -1)
    docs = await cursor.to_list(200)
    return [_booking_to_out(d) for d in docs]


@api.get("/bookings", response_model=List[BookingOut])
async def all_bookings(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    cursor = db[BOOKINGS_COLLECTION].find({}).sort("created_at", -1)
    docs = await cursor.to_list(500)
    return [_booking_to_out(d) for d in docs]


@api.get("/health")
async def health():
    return {"status": "ok", "service": "gngwar-api", "razorpay": RAZORPAY_ENABLED}


@api.patch("/bookings/{booking_id}/status", response_model=BookingOut)
async def update_booking_status(booking_id: str, body: BookingStatusUpdate, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    try:
        oid = ObjectId(booking_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid booking id")
    result = await db[BOOKINGS_COLLECTION].find_one_and_update(
        {"_id": oid},
        {"$set": {"status": body.status}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Booking not found")
    return _booking_to_out(result)


# ---------------------------------------------------------------------------
# Payments (Razorpay)
# ---------------------------------------------------------------------------
@api.get("/payments/razorpay/config")
async def razorpay_config():
    return {"enabled": RAZORPAY_ENABLED, "key_id": RAZORPAY_KEY_ID if RAZORPAY_ENABLED else ""}


@api.post("/payments/razorpay/order")
async def create_razorpay_order(body: RazorpayOrderIn, request: Request):
    if not RAZORPAY_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Payments are not yet configured. Please contact GngWar support to complete your booking.",
        )
    try:
        oid = ObjectId(body.booking_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid booking id")

    booking = await db[BOOKINGS_COLLECTION].find_one({"_id": oid})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("payment_status") == "paid":
        raise HTTPException(status_code=409, detail="This booking is already paid.")

    amount_paise = int(round(float(booking["price"]) * 100))
    receipt = f"gngwar-{str(oid)[-12:]}"
    try:
        order = razorpay_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
            "notes": {"service": booking["service"], "booking_id": str(oid)},
        })
    except Exception as e:
        logger.exception("Razorpay order creation failed")
        raise HTTPException(status_code=502, detail=f"Payment gateway error: {e}")

    await db[BOOKINGS_COLLECTION].update_one(
        {"_id": oid},
        {"$set": {"razorpay_order_id": order["id"], "payment_status": "pending"}},
    )
    return {
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
        "booking_id": str(oid),
        "name": booking["name"],
        "mobile": booking["mobile"],
    }


@api.post("/payments/razorpay/verify", response_model=BookingOut)
async def verify_razorpay(body: RazorpayVerifyIn):
    if not RAZORPAY_ENABLED:
        raise HTTPException(status_code=503, detail="Payments are not yet configured.")

    signed_payload = f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode("utf-8")
    expected = hmac.new(RAZORPAY_KEY_SECRET.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature. Please try again.")

    try:
        oid = ObjectId(body.booking_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid booking id")

    result = await db[BOOKINGS_COLLECTION].find_one_and_update(
        {"_id": oid, "razorpay_order_id": body.razorpay_order_id},
        {
            "$set": {
                "payment_status": "paid",
                "payment_id": body.razorpay_payment_id,
                "status": "confirmed",
                "paid_at": datetime.now(timezone.utc),
            }
        },
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Booking not found for this order")

    # Trigger referral reward on first paid booking
    if result.get("user_id"):
        await _maybe_award_referrer(result["user_id"], str(result["_id"]))

    return _booking_to_out(result)


# ---------------------------------------------------------------------------
# Referrals + quotes
# ---------------------------------------------------------------------------
class QuoteIn(BaseModel):
    price: float = Field(ge=0)


@api.post("/bookings/quote")
async def booking_quote(body: QuoteIn, request: Request):
    """Compute the *effective* price for the caller (applies referral discount + credit)."""
    user_doc: Optional[dict] = None
    try:
        current = await get_current_user(request)
        user_doc = await db[USERS_COLLECTION].find_one({"_id": ObjectId(current["id"])})
    except HTTPException:
        user_doc = None
    return await _compute_booking_pricing(user_doc, float(body.price))


@api.get("/referrals/me")
async def my_referrals(user: dict = Depends(get_current_user)):
    doc = await db[USERS_COLLECTION].find_one({"_id": ObjectId(user["id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    # If the user was created before referrals landed, backfill a code now.
    if not doc.get("referral_code"):
        code = generate_referral_code()
        while await db[USERS_COLLECTION].find_one({"referral_code": code}):
            code = generate_referral_code()
        await db[USERS_COLLECTION].update_one({"_id": doc["_id"]}, {"$set": {"referral_code": code}})
        doc["referral_code"] = code

    referred_users = await db[USERS_COLLECTION].find(
        {"referred_by": user["id"]},
        {"email": 1, "name": 1, "created_at": 1, "first_paid_reward_at": 1},
    ).sort("created_at", -1).to_list(200)

    return {
        "referral_code": doc["referral_code"],
        "credit_balance": float(doc.get("credit_balance", 0) or 0),
        "friend_discount_pct": REFERRAL_FRIEND_DISCOUNT_PCT,
        "referrer_credit": REFERRAL_REFERRER_CREDIT,
        "referred_by_code": doc.get("referred_by_code"),
        "referrals": [
            {
                "name": r.get("name"),
                "email": r["email"],
                "joined_at": r.get("created_at").isoformat() if isinstance(r.get("created_at"), datetime) else r.get("created_at"),
                "rewarded": bool(r.get("first_paid_reward_at")),
            }
            for r in referred_users
        ],
    }


# ---------------------------------------------------------------------------
# Reminders (admin visibility)
# ---------------------------------------------------------------------------
@api.get("/admin/reminders")
async def list_reminders(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    cursor = db[REMINDERS_COLLECTION].find({}).sort("created_at", -1)
    docs = await cursor.to_list(200)
    return [
        {
            "id": str(d["_id"]),
            "booking_id": d.get("booking_id"),
            "service": d.get("service"),
            "date": d.get("date"),
            "mobile": d.get("mobile"),
            "channel": d.get("channel", "sms"),
            "status": d.get("status", "queued"),
            "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else d.get("created_at"),
        }
        for d in docs
    ]


@api.post("/admin/reminders/run")
async def run_reminder_job_now(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    queued = await _run_reminder_job()
    return {"queued": queued}


async def _run_reminder_job() -> int:
    """Look up bookings scheduled for tomorrow that haven't been reminded yet, and queue reminders.

    If Twilio env is configured, actually sends via SMS or WhatsApp (per TWILIO_CHANNEL).
    Otherwise, the message is only persisted to `reminders_log` and logged to stdout.
    """
    tomorrow = (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()
    cursor = db[BOOKINGS_COLLECTION].find({
        "date": tomorrow,
        "status": {"$in": ["requested", "confirmed"]},
        "$or": [
            {"reminder_status": {"$exists": False}},
            {"reminder_status": "pending"},
        ],
    })
    queued = 0
    async for booking in cursor:
        message = (
            f"Hi {booking.get('name', '')}, this is a friendly reminder from GngWar — "
            f"your {booking.get('service')} ({booking.get('duration')}) is scheduled for {booking.get('date')}, "
            f"{booking.get('time')}. Reply STOP to opt out."
        )
        channel = TWILIO_CHANNEL if TWILIO_ENABLED else "sms"
        entry = {
            "_id": ObjectId(),
            "booking_id": str(booking["_id"]),
            "service": booking.get("service"),
            "date": booking.get("date"),
            "mobile": booking.get("mobile"),
            "channel": channel,
            "status": "queued",
            "message": message,
            "created_at": datetime.now(timezone.utc),
        }

        # Attempt an actual Twilio send if configured
        send_error = None
        if TWILIO_ENABLED and twilio_client is not None:
            try:
                to = booking.get("mobile", "")
                if not to.startswith("+"):
                    to = "+91" + to  # default to India
                if channel == "whatsapp" and TWILIO_WHATSAPP_FROM:
                    twilio_client.messages.create(
                        from_=TWILIO_WHATSAPP_FROM,
                        to=f"whatsapp:{to}",
                        body=message,
                    )
                elif TWILIO_PHONE_NUMBER:
                    twilio_client.messages.create(
                        from_=TWILIO_PHONE_NUMBER,
                        to=to,
                        body=message,
                    )
                else:
                    send_error = "No Twilio sender configured"
                entry["status"] = "sent" if not send_error else "failed"
                if not send_error:
                    entry["sent_at"] = datetime.now(timezone.utc)
                else:
                    entry["error"] = send_error
            except Exception as e:  # pragma: no cover
                logger.exception("Twilio send failed")
                entry["status"] = "failed"
                entry["error"] = str(e)

        await db[REMINDERS_COLLECTION].insert_one(entry)
        await db[BOOKINGS_COLLECTION].update_one(
            {"_id": booking["_id"]},
            {"$set": {
                "reminder_status": entry["status"],
                "reminder_queued_at": datetime.now(timezone.utc),
            }},
        )
        logger.info("[reminder-scheduler] %s for booking %s → %s (%s)",
                    entry["status"], booking["_id"], booking.get("mobile"), channel)
        queued += 1
    return queued


scheduler: Optional[AsyncIOScheduler] = None


# ---------------------------------------------------------------------------
# Weekly report
# ---------------------------------------------------------------------------
async def _compute_weekly_report(days: int = 7) -> dict:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    docs = await db[BOOKINGS_COLLECTION].find({"created_at": {"$gte": since}}).to_list(2000)

    paid = [d for d in docs if d.get("payment_status") == "paid"]
    revenue = round(sum(float(d.get("price", 0)) for d in paid), 2)
    cancelled = [d for d in docs if d.get("status") == "cancelled"]

    # No-shows: bookings whose date is in the past but not completed / not cancelled
    today = now.date()
    no_shows = []
    for d in docs:
        try:
            d_date = datetime.strptime(d.get("date", ""), "%Y-%m-%d").date()
        except Exception:
            continue
        if d_date < today and d.get("status") not in ("completed", "cancelled"):
            no_shows.append(d)

    # Top services
    counts: dict = {}
    for d in docs:
        counts[d.get("service", "unknown")] = counts.get(d.get("service", "unknown"), 0) + 1
    top_services = sorted(
        [{"service": k, "count": v} for k, v in counts.items()],
        key=lambda r: r["count"],
        reverse=True,
    )[:5]

    return {
        "period_days": days,
        "range_start": since.isoformat(),
        "range_end": now.isoformat(),
        "total_bookings": len(docs),
        "paid_bookings": len(paid),
        "revenue": revenue,
        "cancelled": len(cancelled),
        "no_shows": len(no_shows),
        "top_services": top_services,
    }


@api.get("/admin/weekly-report")
async def weekly_report(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    return await _compute_weekly_report()


@api.post("/admin/weekly-report/email")
async def send_weekly_report_email(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    return await _send_weekly_report()


async def _send_weekly_report() -> dict:
    report = await _compute_weekly_report()
    if not RESEND_ENABLED:
        return {"sent": False, "reason": "Resend is not configured. Add RESEND_API_KEY and WEEKLY_REPORT_EMAIL to backend/.env.", "report": report}
    html = _format_weekly_report_html(report)
    try:
        async with httpx.AsyncClient(timeout=15) as hc:
            resp = await hc.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": "GngWar Weekly <weekly@gngwar.com>",
                    "to": [WEEKLY_REPORT_EMAIL],
                    "subject": f"GngWar weekly summary — {datetime.now(timezone.utc).strftime('%d %b %Y')}",
                    "html": html,
                },
            )
        resp.raise_for_status()
    except Exception as e:  # pragma: no cover
        logger.exception("Weekly report email failed")
        return {"sent": False, "reason": str(e), "report": report}
    return {"sent": True, "report": report}


def _format_weekly_report_html(r: dict) -> str:
    rows = "".join(
        f"<tr><td>{s['service']}</td><td style='text-align:right'>{s['count']}</td></tr>"
        for s in r["top_services"]
    ) or "<tr><td colspan=2>No bookings yet</td></tr>"
    return f"""
    <div style='font-family:Manrope,Arial;background:#f7f6f3;padding:24px;color:#111113'>
      <h2 style='margin:0 0 6px'>GngWar Weekly Summary</h2>
      <p style='color:#77747a;margin:0 0 20px'>{r['range_start'][:10]} → {r['range_end'][:10]}</p>
      <table style='width:100%;border-collapse:collapse'>
        <tr><td>Total bookings</td><td style='text-align:right'><b>{r['total_bookings']}</b></td></tr>
        <tr><td>Paid</td><td style='text-align:right'><b style='color:#207a44'>{r['paid_bookings']}</b></td></tr>
        <tr><td>Revenue</td><td style='text-align:right'><b>₹{r['revenue']}</b></td></tr>
        <tr><td>No-shows</td><td style='text-align:right'>{r['no_shows']}</td></tr>
        <tr><td>Cancelled</td><td style='text-align:right'>{r['cancelled']}</td></tr>
      </table>
      <h3 style='margin:22px 0 6px'>Top services</h3>
      <table style='width:100%;border-collapse:collapse'>{rows}</table>
    </div>
    """


# ---------------------------------------------------------------------------
# Integrations status (used by frontend to hide/show features)
# ---------------------------------------------------------------------------
@api.get("/integrations/status")
async def integrations_status():
    return {
        "razorpay": RAZORPAY_ENABLED,
        "twilio": TWILIO_ENABLED,
        "twilio_channel": TWILIO_CHANNEL if TWILIO_ENABLED else None,
        "resend": RESEND_ENABLED,
        "first_booking_discount_pct": FIRST_BOOKING_DISCOUNT_PCT,
        "referral_friend_discount_pct": REFERRAL_FRIEND_DISCOUNT_PCT,
        "referral_referrer_credit": REFERRAL_REFERRER_CREDIT,
    }


app.include_router(api)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
allow_origins = [frontend_url]
if "*" in os.environ.get("CORS_ORIGINS", ""):
    # Cannot use "*" with credentials; use frontend URL only.
    pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    await db[USERS_COLLECTION].create_index("email", unique=True)
    await db[USERS_COLLECTION].create_index("referral_code", unique=True, sparse=True)
    await db[USERS_COLLECTION].create_index("referred_by")
    await db[BOOKINGS_COLLECTION].create_index("user_id")
    await db[BOOKINGS_COLLECTION].create_index("created_at")
    await db[BOOKINGS_COLLECTION].create_index("date")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@gngwar.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db[USERS_COLLECTION].find_one({"email": admin_email})
    if existing is None:
        code = generate_referral_code()
        await db[USERS_COLLECTION].insert_one({
            "email": admin_email,
            "name": "GngWar Admin",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "referral_code": code,
            "credit_balance": 0.0,
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Seeded admin user: %s", admin_email)
    else:
        updates = {}
        if not verify_password(admin_password, existing.get("password_hash", "")):
            updates["password_hash"] = hash_password(admin_password)
            updates["role"] = "admin"
        if not existing.get("referral_code"):
            code = generate_referral_code()
            while await db[USERS_COLLECTION].find_one({"referral_code": code}):
                code = generate_referral_code()
            updates["referral_code"] = code
        if updates:
            await db[USERS_COLLECTION].update_one({"_id": existing["_id"]}, {"$set": updates})

    # Start reminder scheduler (hourly) + weekly report scheduler (Sun 06:00 UTC)
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler(timezone="UTC")
        scheduler.add_job(_run_reminder_job, "interval", minutes=60, id="reminder-job", replace_existing=True)
        scheduler.add_job(
            _send_weekly_report,
            CronTrigger(day_of_week="sun", hour=6, minute=0),
            id="weekly-report",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("Schedulers started — reminders (hourly), weekly report (Sun 06:00 UTC)")


@app.on_event("shutdown")
async def on_shutdown():
    global scheduler
    if scheduler is not None:
        scheduler.shutdown(wait=False)
        scheduler = None
    client.close()
