# GngWar — Product Requirements Document

## Original problem statement
Build a modern, production-style frontend site for GngWar home services with brand colors dark charcoal / white / soft pink, sticky navbar, hero using an exact user-provided female-team photo, 12 service cards with a fixed pricing matrix + strikethrough, a booking modal that carries service/duration/price forward, and standard marketing sections (How It Works, Why, Trust, About, CTA, Contact, Footer). User later requested (Feb 2026) modular components, updated pricing values, and a real FastAPI+MongoDB backend for bookings & authentication.

## User personas
- **Homeowner (primary)**: books cleaning / kitchen / laundry help from a phone in under 60 seconds.
- **Registered customer**: signs in to track their bookings.
- **Admin (GngWar staff)**: reviews all incoming bookings.

## Core requirements
- Brand: charcoal, white, soft pink accent; DM Sans + Manrope.
- Sticky navbar, hero, quick-services strip, 12 service cards (6 durations each with strikethrough original), booking flow, marketing sections, footer.
- Every "Book Now" opens the same booking modal; modal carries service + duration + price forward automatically.
- FastAPI + MongoDB backend, JWT httpOnly cookie auth, bookings persisted per user.
- Mobile-responsive down to 390 px; horizontally scrolling quick-services strip.
- No fake stats, no invented contact info.

## Pricing matrix (Feb 2026)
| Duration | Price | Original (strike) |
|---|---|---|
| 30 min | ₹75 | ₹86 |
| 45 min | ₹112.50 | ₹129 |
| 60 min | ₹150 | ₹173 |
| 90 min | ₹225 | ₹259 |
| 120 min | ₹300 | ₹345 |
| 180 min | ₹450 | ₹518 |

## What's implemented (2026-02)
- Modular React components under `src/components/` (Navbar, Hero, QuickStrip, Services, ServiceCard, HowItWorks, WhyGngWar, TrustBand, About, CTA, Contact, Footer, BookingModal, AuthModal, Logo).
- Services + pricing centralized in `src/data/services.js`; formatter handles ₹112.50 decimals cleanly.
- Auth: register/login/logout/me with bcrypt + JWT + httpOnly cookies (SameSite=None, Secure).
- Bookings: POST creates booking (anonymous or attached to signed-in user), GET /me returns caller's history, GET / admin-only for all.
- Admin seeded from env (`admin@gngwar.com`) on startup.
- 11/11 backend pytest tests pass; full Playwright UI flow verified.

## Backlog
### P1 — needs user input
- Replace hero placeholder SVG with the user's exact female-team photo.
- Fill in real contact details (phone, email, service area, support hours).

### P2 — enhancements
- "My bookings" screen for signed-in customers.
- Admin dashboard to list & update booking status.
- Payment integration (Stripe / Razorpay) after booking confirmation.
- Password reset flow.
- OTP verification for phone number.
- Add pagination to `/api/bookings` and `/api/bookings/me`.
- Optional-auth FastAPI dependency to replace manual try/except inside `create_booking`.

### P3 — polish
- Wire `CORS_ORIGINS` env if multi-origin support becomes needed (currently `FRONTEND_URL` only).
- Rate-limit login endpoint (brute-force protection).
- SEO metadata + Open Graph tags.
