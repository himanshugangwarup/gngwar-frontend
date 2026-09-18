"""Backend API tests for GngWar (auth + bookings)."""
import os
import uuid
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
