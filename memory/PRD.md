# GngWar Product Requirements

## Original problem statement

Build a complete, modern, production-style frontend website for GngWar, a professional doorstep home-services startup. The brand is “GngWar” with the tagline “Your Home • Our Priority”. The product must let customers discover 12 household services, select one of six durations, see exact selling and crossed-out original prices, enter booking details, and continue to a confirmation step. It must be responsive, trustworthy, clean, mobile-friendly, and structured so a backend and online payment system can be connected later. The exact female-team image was requested, but was unavailable; the user explicitly approved a clearly marked local image placeholder with no generated or substituted image. Login is hidden until a backend exists. Booking confirmation is stored in browser localStorage. Contact details must remain placeholders until real details are provided.

## Architecture decisions

- React frontend in `/app/frontend/src`, using reusable `ServiceCard`, `BookingModal`, and shared data arrays for services/pricing.
- Frontend-only booking flow for the current scope; no fake backend or API was added.
- Browser storage key `gngwar_booking` stores the validated booking summary.
- Exact team image slot is local at `/assets/images/team-placeholder.svg`, ready to replace with the real image later.
- Existing protected environment variables remain unchanged; no external image URL is used.
- Visual system follows charcoal, white, soft pink, and neutral gray with responsive CSS media queries.

## User personas

- Home residents who need reliable, affordable everyday household help.
- Busy customers who want to compare durations and prices quickly on mobile.
- Future operations/admin users who will connect real booking, support, and payment services later.

## Core requirements (static)

- Sticky navigation with Home, Services, How It Works, About Us, Contact, and Book Now; Login hidden.
- Hero with GngWar messaging, local team image placeholder, trust points, and primary actions.
- Scrollable quick-service strip.
- Exactly 12 individual services, each with all six duration options and exact price pairs:
  - 30 Minutes: ₹75 / ₹86
  - 45 Minutes: ₹110 / ₹127
  - 60 Minutes: ₹149 / ₹171
  - 90 Minutes: ₹222 / ₹255
  - 120 Minutes: ₹296 / ₹340
  - 180 Minutes: ₹439 / ₹505
- Booking modal automatically carries service, duration, price, and original price.
- Booking fields: name, mobile, address, date, preferred time.
- Incomplete bookings must not persist; complete bookings show confirmation and persist locally.
- How It Works, Why GngWar, Trust, About, CTA, Contact, and Footer sections.
- Responsive desktop, tablet, and mobile layouts with mobile navigation and no horizontal overflow.
- Every interactive/critical user-facing element has a descriptive `data-testid`.

## What's been implemented

### 2026-09-18

- Replaced the starter splash screen with the complete GngWar experience.
- Added responsive sticky navbar, hero, quick services strip, 12 service cards, filters, informational sections, CTA, contact placeholders, and footer.
- Added exact six-option pricing UI on every service card with crossed-out original prices.
- Added booking modal with duration-linked pricing and customer details.
- Added explicit validation for blank and partial booking attempts.
- Added localStorage persistence and booking confirmation summary.
- Added local team image placeholder at `frontend/public/assets/images/team-placeholder.svg`.
- Verified production build, desktop/mobile screenshots, booking flow, responsive menu, pricing, persistence, and validation with regression testing.

## Prioritized backlog

### P0 — next required product integrations

- Connect booking submission to a real backend/API.
- Replace localStorage confirmation with server-side booking records.
- Add payment provider flow after backend booking endpoint is available.
- Replace the placeholder asset with the exact GngWar female-team photo.

### P1 — customer experience

- Add real phone, support email, service locations, privacy policy, and terms content.
- Add booking status and customer booking history.
- Add real support/contact interaction.

### P2 — growth and operations

- Add backend-backed authentication when required.
- Add admin service and availability management.
- Add customer reviews only when real verified feedback exists.

## Remaining next tasks

1. Provide the exact female-team image and replace `team-placeholder.svg` without changing its local asset path contract.
2. Provide approved business contact and service-location details.
3. Connect the booking payload to a backend endpoint.
4. Add online payment after booking creation is server-backed.