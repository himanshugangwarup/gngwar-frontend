"""Backend API tests for GngWar (auth + bookings + referrals + reminders)."""
import os
import uuid
from datetime import datetime, timezone, timedelta
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://gngwar-pro-services.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@gngwar.com"
ADMIN_PASSWORD = "Admin@GngWar2026"


def _new_email():
    return f"TEST_{uuid.uuid4().hex[:10]}@test.com"


@pytest.fixture
def session():
    return requests.Session()


# ---- Health ----
def test_health():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---- Auth ----
def test_register_login_me_logout_flow(session):
    email = _new_email()
    # Register
    r = session.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": "Test User"})
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["email"].lower() == email.lower()
    assert "password_hash" not in data
    assert session.cookies.get("access_token")

    # /me should work with cookie
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["email"].lower() == email.lower()

    # Logout
    r = session.post(f"{API}/auth/logout")
    assert r.status_code == 200

    # /me should now fail
    session.cookies.clear()
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_register_duplicate_returns_409():
    email = _new_email()
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": "A"})
    assert r.status_code == 201
    s2 = requests.Session()
    r2 = s2.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": "B"})
    assert r2.status_code == 409
    assert "exists" in r2.json().get("detail", "").lower()


def test_login_wrong_password_returns_401():
    email = _new_email()
    s = requests.Session()
    s.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": "A"})
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrong"})
    assert r.status_code == 401
    assert isinstance(r.json().get("detail"), str)


def test_login_admin_seeded():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "admin"


def test_me_without_cookie_returns_401():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


# ---- Bookings ----
def _booking_payload(mobile="9876543210"):
    return {
        "service": "Home Cleaning",
        "duration": "60 min",
        "price": 150,
        "original": 173,
        "name": "Test Customer",
        "mobile": mobile,
        "address": "123 Test Street",
        "date": "2026-02-15",
        "time": "10:00 AM",
    }


def test_create_booking_anonymous_user_id_null():
    r = requests.post(f"{API}/bookings", json=_booking_payload())
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["user_id"] is None
    assert data["mobile"] == "9876543210"


def test_create_booking_invalid_mobile_422():
    r = requests.post(f"{API}/bookings", json=_booking_payload(mobile="123"))
    assert r.status_code == 422
    body = r.json()
    # FastAPI validation returns detail as list of dicts with msg strings
    assert isinstance(body.get("detail"), list)
    joined = str(body["detail"]).lower()
    assert "mobile" in joined or "valid" in joined


def test_create_booking_authenticated_associates_user_and_me_endpoint():
    email = _new_email()
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": "Auth User"})
    assert r.status_code == 201
    user_id = r.json()["id"]

    r = s.post(f"{API}/bookings", json=_booking_payload())
    assert r.status_code == 201
    assert r.json()["user_id"] == user_id

    r = s.get(f"{API}/bookings/me")
    assert r.status_code == 200
    lst = r.json()
    assert len(lst) >= 1
    assert all(b["user_id"] == user_id for b in lst)


def test_all_bookings_forbidden_for_customer():
    email = _new_email()
    s = requests.Session()
    s.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": "C"})
    r = s.get(f"{API}/bookings")
    assert r.status_code == 403


def test_all_bookings_admin_ok():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    r = s.get(f"{API}/bookings")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---- Payments (Razorpay intentionally disabled: empty keys) ----
def test_razorpay_config_disabled():
    r = requests.get(f"{API}/payments/razorpay/config")
    assert r.status_code == 200
    data = r.json()
    assert data["enabled"] is False
    assert data["key_id"] == ""


def test_razorpay_order_returns_503_when_disabled():
    # create booking first
    b = requests.post(f"{API}/bookings", json=_booking_payload()).json()
    r = requests.post(f"{API}/payments/razorpay/order", json={"booking_id": b["id"]})
    assert r.status_code == 503
    assert "not" in r.json().get("detail", "").lower()


def test_razorpay_verify_returns_503_when_disabled():
    r = requests.post(f"{API}/payments/razorpay/verify", json={
        "booking_id": "507f1f77bcf86cd799439011",
        "razorpay_order_id": "order_x",
        "razorpay_payment_id": "pay_x",
        "razorpay_signature": "sig_x",
    })
    assert r.status_code == 503


# ---- Booking status update ----
def _admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    return s


def test_status_update_admin_all_values():
    s = _admin_session()
    b = requests.post(f"{API}/bookings", json=_booking_payload()).json()
    for status_val in ["confirmed", "completed", "cancelled", "requested"]:
        r = s.patch(f"{API}/bookings/{b['id']}/status", json={"status": status_val})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == status_val


def test_status_update_invalid_status_422():
    s = _admin_session()
    b = requests.post(f"{API}/bookings", json=_booking_payload()).json()
    r = s.patch(f"{API}/bookings/{b['id']}/status", json={"status": "bogus"})
    assert r.status_code == 422


def test_status_update_invalid_id_400():
    s = _admin_session()
    r = s.patch(f"{API}/bookings/not-an-oid/status", json={"status": "confirmed"})
    assert r.status_code == 400


def test_status_update_missing_id_404():
    s = _admin_session()
    r = s.patch(f"{API}/bookings/507f1f77bcf86cd799439011/status", json={"status": "confirmed"})
    assert r.status_code == 404


def test_status_update_forbidden_for_non_admin():
    email = _new_email()
    s = requests.Session()
    s.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": "C"})
    b = requests.post(f"{API}/bookings", json=_booking_payload()).json()
    r = s.patch(f"{API}/bookings/{b['id']}/status", json={"status": "confirmed"})
    assert r.status_code == 403


# ---- /bookings/me sort + new fields ----
def test_bookings_me_sorted_and_has_payment_fields():
    email = _new_email()
    s = requests.Session()
    s.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": "Sort User"})
    ids = []
    for _ in range(3):
        r = s.post(f"{API}/bookings", json=_booking_payload())
        ids.append(r.json()["id"])
    r = s.get(f"{API}/bookings/me")
    assert r.status_code == 200
    lst = r.json()
    assert len(lst) >= 3
    # newest first — last created should be first
    assert lst[0]["id"] == ids[-1]
    for b in lst:
        assert "payment_status" in b
        assert "payment_id" in b
        assert "razorpay_order_id" in b
        assert b["payment_status"] == "unpaid"


# ============================================================================
# Referrals + Quotes + Reminders (iteration 5)
# ============================================================================
def test_register_returns_referral_code_and_zero_credit():
    email = _new_email()
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": "Ref User"})
    assert r.status_code == 201, r.text
    data = r.json()
    assert data.get("referral_code")
    assert data["referral_code"].startswith("GNG")
    assert data.get("credit_balance") == 0.0
    assert data.get("referred_by_code") in (None, "")


def test_admin_has_referral_code():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    # /referrals/me for admin
    r = s.get(f"{API}/referrals/me")
    assert r.status_code == 200
    data = r.json()
    assert data.get("referral_code")
    assert data.get("friend_discount_pct") == 15
    assert data.get("referrer_credit") == 150.0


def test_register_with_valid_referral_links_user():
    # Alice referrer
    alice_email = _new_email()
    a = requests.Session()
    r = a.post(f"{API}/auth/register", json={"email": alice_email, "password": "password123", "name": "Alice"})
    assert r.status_code == 201
    alice_code = r.json()["referral_code"]

    # Bob referred
    bob_email = _new_email()
    b = requests.Session()
    r = b.post(f"{API}/auth/register", json={
        "email": bob_email, "password": "password123", "name": "Bob",
        "referral_code": alice_code,
    })
    assert r.status_code == 201
    assert r.json()["referred_by_code"] == alice_code

    # Alice should see Bob in her referrals list
    r = a.get(f"{API}/referrals/me")
    assert r.status_code == 200
    data = r.json()
    emails = [ref["email"].lower() for ref in data["referrals"]]
    assert bob_email.lower() in emails
    bob_entry = next(ref for ref in data["referrals"] if ref["email"].lower() == bob_email.lower())
    assert bob_entry["rewarded"] is False
    assert "joined_at" in bob_entry
    assert "name" in bob_entry


def test_register_with_unknown_referral_silently_ignored():
    email = _new_email()
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={
        "email": email, "password": "password123", "name": "NoRef",
        "referral_code": "GNGZZZZZZ",
    })
    assert r.status_code == 201
    assert r.json().get("referred_by_code") in (None, "")


def test_referrals_me_requires_auth():
    r = requests.get(f"{API}/referrals/me")
    assert r.status_code == 401


def test_quote_no_auth_returns_no_discount():
    r = requests.post(f"{API}/bookings/quote", json={"price": 200})
    assert r.status_code == 200
    data = r.json()
    assert data["list_price"] == 200
    assert data["discount_pct"] == 0
    assert data["final_price"] == 200
    assert data["credit_used"] == 0


def test_quote_first_booking_referred_user_gets_15pct_then_zero_after_booking():
    # Alice referrer
    a = requests.Session()
    r = a.post(f"{API}/auth/register", json={"email": _new_email(), "password": "password123", "name": "AliceQ"})
    alice_code = r.json()["referral_code"]

    # Bob referred
    b = requests.Session()
    r = b.post(f"{API}/auth/register", json={
        "email": _new_email(), "password": "password123", "name": "BobQ",
        "referral_code": alice_code,
    })
    assert r.status_code == 201

    # First quote -> 15%
    r = b.post(f"{API}/bookings/quote", json={"price": 200})
    assert r.status_code == 200
    q = r.json()
    assert q["discount_pct"] == 15
    assert q["after_discount"] == 170.0
    assert q["final_price"] == 170.0

    # Place booking
    payload = _booking_payload()
    payload["price"] = 200
    r = b.post(f"{API}/bookings", json=payload)
    assert r.status_code == 201
    bk = r.json()
    assert bk["discount_pct"] == 15
    assert bk["list_price"] == 200
    assert bk["price"] == 170.0
    assert bk["credit_used"] == 0
    assert "reminder_status" in bk

    # Second quote -> 0%
    r = b.post(f"{API}/bookings/quote", json={"price": 200})
    q2 = r.json()
    assert q2["discount_pct"] == 0
    assert q2["final_price"] == 200


def test_bookings_me_exposes_list_price_discount_credit_reminder():
    email = _new_email()
    s = requests.Session()
    s.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": "FieldsUser"})
    s.post(f"{API}/bookings", json=_booking_payload())
    r = s.get(f"{API}/bookings/me")
    assert r.status_code == 200
    lst = r.json()
    assert len(lst) >= 1
    for k in ("list_price", "discount_pct", "credit_used", "reminder_status"):
        assert k in lst[0], f"missing {k}"


def test_credit_covers_full_price_marks_paid_and_awards_referrer():
    """Simulate: bob is referred, gives him 200 credit via mongo, first booking of 150 fully covered.
    Booking should be created payment_status=paid, credit deducted, and Alice awarded ₹150."""
    from motor.motor_asyncio import AsyncIOMotorClient
    from bson import ObjectId
    import asyncio

    async def _seed_and_test():
        client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        db = client[os.environ.get("DB_NAME", "test_database")]

        # Alice
        alice_email = _new_email()
        a = requests.Session()
        r = a.post(f"{API}/auth/register", json={"email": alice_email, "password": "password123", "name": "AliceCredit"})
        alice_code = r.json()["referral_code"]
        alice_id = r.json()["id"]

        # Alice starting balance
        alice_before = await db["users"].find_one({"_id": ObjectId(alice_id)})
        alice_bal_before = float(alice_before.get("credit_balance", 0) or 0)

        # Bob referred
        bob_email = _new_email()
        b = requests.Session()
        r = b.post(f"{API}/auth/register", json={
            "email": bob_email, "password": "password123", "name": "BobCredit",
            "referral_code": alice_code,
        })
        bob_id = r.json()["id"]

        # Grant Bob 500 credit directly
        await db["users"].update_one({"_id": ObjectId(bob_id)}, {"$set": {"credit_balance": 500.0}})

        # First booking: list price 200, referral discount 15% -> 170, credit covers all -> final 0
        payload = _booking_payload()
        payload["price"] = 200
        r = b.post(f"{API}/bookings", json=payload)
        assert r.status_code == 201, r.text
        bk = r.json()
        assert bk["discount_pct"] == 15
        assert bk["list_price"] == 200
        assert bk["credit_used"] == 170.0
        assert bk["price"] == 0
        assert bk["payment_status"] == "paid"

        # Bob balance should be 500 - 170 = 330
        bob_after = await db["users"].find_one({"_id": ObjectId(bob_id)})
        assert abs(float(bob_after["credit_balance"]) - 330.0) < 0.01

        # Alice should have been credited 150
        alice_after = await db["users"].find_one({"_id": ObjectId(alice_id)})
        assert abs(float(alice_after["credit_balance"]) - (alice_bal_before + 150.0)) < 0.01

        # Second paid booking for Bob should NOT re-credit Alice
        # Give Bob more credit
        await db["users"].update_one({"_id": ObjectId(bob_id)}, {"$set": {"credit_balance": 500.0}})
        payload2 = _booking_payload()
        payload2["price"] = 100
        r = b.post(f"{API}/bookings", json=payload2)
        assert r.status_code == 201
        # Alice balance should be unchanged
        alice_after2 = await db["users"].find_one({"_id": ObjectId(alice_id)})
        assert abs(float(alice_after2["credit_balance"]) - float(alice_after["credit_balance"])) < 0.01

        # /referrals/me for Alice should mark Bob rewarded=True
        r = a.get(f"{API}/referrals/me")
        data = r.json()
        bob_row = next(ref for ref in data["referrals"] if ref["email"].lower() == bob_email.lower())
        assert bob_row["rewarded"] is True

        client.close()

    asyncio.run(_seed_and_test())


# ---- Reminders ----
def test_admin_reminders_forbidden_for_non_admin():
    email = _new_email()
    s = requests.Session()
    s.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": "RemUser"})
    r = s.get(f"{API}/admin/reminders")
    assert r.status_code == 403
    r = s.post(f"{API}/admin/reminders/run")
    assert r.status_code == 403


def test_admin_reminders_run_queues_for_tomorrow_and_is_idempotent():
    # Create an authenticated booking for tomorrow
    email = _new_email()
    s = requests.Session()
    s.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": "RemBooker"})
    tomorrow = (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()
    payload = _booking_payload()
    payload["date"] = tomorrow
    r = s.post(f"{API}/bookings", json=payload)
    assert r.status_code == 201
    booking_id = r.json()["id"]

    admin = _admin_session()
    # First run -> should queue at least this booking
    r = admin.post(f"{API}/admin/reminders/run")
    assert r.status_code == 200
    first_count = r.json()["queued"]
    assert first_count >= 1

    # List reminders — our booking should be there
    r = admin.get(f"{API}/admin/reminders")
    assert r.status_code == 200
    reminders = r.json()
    assert any(rem["booking_id"] == booking_id for rem in reminders)

    # Second run — should NOT re-queue same booking (idempotent per booking)
    r = admin.post(f"{API}/admin/reminders/run")
    assert r.status_code == 200
    second_count = r.json()["queued"]

    # Count reminders for our booking — must be exactly 1
    r = admin.get(f"{API}/admin/reminders")
    matching = [rem for rem in r.json() if rem["booking_id"] == booking_id]
    assert len(matching) == 1, f"expected 1 reminder for booking, got {len(matching)}"

    # Verify booking now has reminder_status=queued
    r = s.get(f"{API}/bookings/me")
    booking = next(b for b in r.json() if b["id"] == booking_id)
    assert booking["reminder_status"] == "queued"

