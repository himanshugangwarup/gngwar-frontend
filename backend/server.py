from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field, BeforeValidator, field_validator


# ---------------------------------------------------------------------------
# App / DB
# ---------------------------------------------------------------------------
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24  # 1 day (session-friendly for MVP)
BOOKINGS_COLLECTION = "bookings"
USERS_COLLECTION = "users"

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
    created_at: Optional[str] = None


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=80)


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
    name: str
    mobile: str
    address: str
    date: str
    time: str
    status: str
    user_id: Optional[str] = None
    created_at: str


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


def serialize_user(user_doc: dict) -> UserOut:
    return UserOut(
        id=str(user_doc.get("_id") or user_doc.get("id")),
        email=user_doc["email"],
        name=user_doc.get("name", ""),
        role=user_doc.get("role", "customer"),
        created_at=(user_doc.get("created_at").isoformat() if isinstance(user_doc.get("created_at"), datetime) else user_doc.get("created_at")),
    )


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

    doc = {
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "role": "customer",
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
        name=doc["name"],
        mobile=doc["mobile"],
        address=doc["address"],
        date=doc["date"],
        time=doc["time"],
        status=doc.get("status", "requested"),
        user_id=doc.get("user_id"),
        created_at=doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else doc["created_at"],
    )


@api.post("/bookings", response_model=BookingOut, status_code=201)
async def create_booking(body: BookingIn, request: Request):
    # Try to associate booking with logged-in user (optional)
    user_id: Optional[str] = None
    try:
        current = await get_current_user(request)
        user_id = current["id"]
    except HTTPException:
        user_id = None

    doc = {
        "_id": ObjectId(),
        "service": body.service,
        "duration": body.duration,
        "price": float(body.price),
        "original": float(body.original),
        "name": body.name.strip(),
        "mobile": body.mobile,
        "address": body.address.strip(),
        "date": body.date,
        "time": body.time,
        "status": "requested",
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
    }
    await db[BOOKINGS_COLLECTION].insert_one(doc)
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
    return {"status": "ok", "service": "gngwar-api"}


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
    await db[BOOKINGS_COLLECTION].create_index("user_id")
    await db[BOOKINGS_COLLECTION].create_index("created_at")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@gngwar.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db[USERS_COLLECTION].find_one({"email": admin_email})
    if existing is None:
        await db[USERS_COLLECTION].insert_one({
            "email": admin_email,
            "name": "GngWar Admin",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Seeded admin user: %s", admin_email)
    else:
        if not verify_password(admin_password, existing.get("password_hash", "")):
            await db[USERS_COLLECTION].update_one(
                {"_id": existing["_id"]},
                {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
            )
            logger.info("Refreshed admin password for: %s", admin_email)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
