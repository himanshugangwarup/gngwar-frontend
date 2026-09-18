# GngWar — Product Requirements Document

## Original problem statement
Modern home-services platform for GngWar (India). Sticky navbar, hero with the exact team image, 12 service cards with 6-duration pricing, booking flow that carries service/duration/price forward, marketing sections, auth, admin dashboard, payments (Razorpay), reminders, referral program.

## Personas
- Homeowner — books in <60 seconds, pays online.
- Registered customer — tracks bookings + refers friends for credit.
- Admin — reviews bookings, tracks revenue, runs reminders.

## Pricing (Feb 2026)
| Duration | Price | Strike |
|---|---|---|
| 30 min | ₹75 | ₹86 |
| 45 min | ₹112.50 | ₹129 |
| 60 min | ₹150 | ₹173 |
| 90 min | ₹225 | ₹259 |
| 120 min | ₹300 | ₹345 |
| 180 min | ₹450 | ₹518 |

## Referral program
- Every user gets a unique `GNG*` code on register.
- Registering with a friend's code → 15% off first booking (auto-applied server-side).
- Referrer credited ₹150 on the friend's first paid booking (or booking fully covered by credit).
- Credit balance auto-applies on the next booking at checkout.

## Reminders
- APScheduler runs `_run_reminder_job` hourly.
- Picks bookings where `date == tomorrow` and status ∈ [requested, confirmed] and reminder not yet queued.
- Logs message + writes to `reminders_log` collection. Idempotent.
- **SMS / WhatsApp provider is NOT wired yet** — hook up Twilio (or another provider) in `_run_reminder_job` when ready.

## Routes
- `/` — landing page (Home, Services, How It Works, Why, Trust, About, CTA, Contact)
- `/my-bookings` — signed-in customer's bookings + credit balance + Refer CTA
- `/admin` — admin-only booking control room + reminders panel + Run job button
- `/refer` — share link, credit balance, list of referred friends

## What's implemented
- Modular React + React Router v7.
- Team image auto-cropped from user's mockup (`/assets/images/team-crop.jpg`).
- Auth: register/login/logout/me (bcrypt + JWT httpOnly cookies).
- Referral: codes, discount, credit, /referrals/me, quotes.
- Bookings API + status update.
- Razorpay endpoints scaffolded (keys blank → graceful 503 + hidden Pay Now).
- Reminder scheduler (hourly) + admin panel + Run-now button.
- 31/31 backend pytest tests pass. Full Playwright UI verified.

## Test credentials
- Admin: `admin@gngwar.com` / `Admin@GngWar2026`

## Backlog
### P1 — needs user input
- **Razorpay keys** (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) — drop into `/app/backend/.env`, restart backend.
- **Twilio / MSG91 credentials** to actually send SMS/WhatsApp reminders.
- **Real contact details** (phone/email/service area).

### P2
- Wire actual SMS/WhatsApp send inside `_run_reminder_job`.
- Password reset flow, OTP mobile verification.
- Pagination on `/api/bookings`, `/api/bookings/me`, `/api/admin/reminders`.
- Admin: audit trail for status changes.
- Guard against concurrent double-credit in `_maybe_award_referrer` (use compound update matched_count check).

### P3
- Extract `server.py` (~780 lines) into `auth.py`, `referrals.py`, `payments.py`.
- SEO metadata / OG tags.
- Rate-limit login endpoint.
- Handle date change of a booking → invalidate old queued reminder.
