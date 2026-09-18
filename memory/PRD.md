# GngWar — Product Requirements Document

## Original problem statement
Modern home-services web app for GngWar (India). Sticky navbar, hero with the exact team image, 12 service cards with 6-duration pricing matrix, booking flow that carries service/duration/price forward, and marketing sections. Follow-up asks: modular components, updated pricing (₹75/112.50/150/225/300/450), FastAPI + MongoDB backend with JWT httpOnly-cookie auth, My Bookings page for signed-in customers, Admin Dashboard for staff, Razorpay payment integration (test mode).

## User personas
- Homeowner (primary) — books help in under 60 seconds and pays online.
- Registered customer — tracks upcoming + past bookings, pays for pending ones.
- GngWar Admin — reviews all bookings, updates status, tracks revenue.

## Pricing (Feb 2026)
| Duration | Price | Strike |
|---|---|---|
| 30 min | ₹75 | ₹86 |
| 45 min | ₹112.50 | ₹129 |
| 60 min | ₹150 | ₹173 |
| 90 min | ₹225 | ₹259 |
| 120 min | ₹300 | ₹345 |
| 180 min | ₹450 | ₹518 |

## What's implemented (2026-02)
- Modular React components (`src/components/*`) + routed pages (`src/pages/MyBookings.jsx`, `AdminDashboard.jsx`).
- React Router v7 with `/`, `/my-bookings`, `/admin`.
- Cropped team image at `/assets/images/team-crop.jpg` (auto-cropped from user's mockup — shows all 3 women, no baked-in text).
- Auth: register/login/logout/me with bcrypt + JWT + httpOnly cookies.
- Bookings API with `payment_status`, `payment_id`, `razorpay_order_id`, `status`.
- Admin can PATCH `/api/bookings/{id}/status` (requested/confirmed/completed/cancelled).
- Razorpay integration scaffolded (`/api/payments/razorpay/config|order|verify`) — currently **not configured** (empty env keys). UI gracefully hides Pay Now when disabled.
- Admin Dashboard: stat cards (requested/confirmed/completed/paid/revenue), search, status filter, inline status update per row.
- My Bookings: upcoming vs history, Pay Now (visible when Razorpay is configured).
- 20/20 backend pytest tests pass (`/app/backend/tests/backend_test.py`). Full Playwright UI verified.

## Test credentials
- Admin: `admin@gngwar.com` / `Admin@GngWar2026`
- Customer: create via UI or `user1@test.com` / `password123`

## Backlog
### P1 — needs user input
- **Razorpay keys**: waiting on `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (test mode is fine to start). Drop into backend/.env and restart backend.
- **Real contact details** (phone/email/service area).

### P2
- Password reset flow.
- Email/SMS booking confirmation.
- OTP mobile verification.
- Pagination on `/api/bookings` + `/api/bookings/me`.
- Admin: audit trail for status changes.
- Wire `CORS_ORIGINS` env or drop the dead branch.

### P3
- SEO metadata + OG tags.
- Rate-limit login endpoint.
- Optional-user FastAPI dependency (replace manual try/except in `create_booking`).
