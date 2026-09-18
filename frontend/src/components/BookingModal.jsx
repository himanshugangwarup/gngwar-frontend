import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Gift, ShieldCheck, X, Wallet } from "lucide-react";
import { PRICING, SERVICES, getPriceFor, formatINR, DEFAULT_DURATION } from "@/data/services";
import { api, formatApiErrorDetail } from "@/lib/api";
import { loadRazorpay } from "@/lib/razorpay";
import { useAuth } from "@/context/AuthContext";

export default function BookingModal({ selected, onClose }) {
  const { user } = useAuth();
  const initialService = selected?.name || "";
  const initialDuration = selected?.duration || DEFAULT_DURATION;
  const [service, setService] = useState(initialService);
  const [duration, setDuration] = useState(initialDuration);
  const [form, setForm] = useState({ name: "", mobile: "", address: "", date: "", time: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState(null); // set after backend creates the booking
  const [paying, setPaying] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(true);
  const [quote, setQuote] = useState(null);

  const chosen = useMemo(() => getPriceFor(duration), [duration]);
  const authed = user && typeof user === "object";

  useEffect(() => {
    let cancelled = false;
    api.get("/payments/razorpay/config").then(({ data }) => {
      if (!cancelled) setPaymentEnabled(!!data.enabled);
    }).catch(() => {
      if (!cancelled) setPaymentEnabled(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Fetch pricing quote whenever duration or user changes
  useEffect(() => {
    let cancelled = false;
    api.post("/bookings/quote", { price: chosen.price })
      .then(({ data }) => { if (!cancelled) setQuote(data); })
      .catch(() => { if (!cancelled) setQuote(null); });
    return () => { cancelled = true; };
  }, [chosen.price, authed]);

  const update = (key) => (event) => {
    setError("");
    setForm({ ...form, [key]: event.target.value });
  };

  const submit = async () => {
    if (!service) {
      setError("Please choose a service to continue.");
      return;
    }
    const missing = [form.name, form.mobile, form.address, form.date, form.time].some(
      (v) => !v.trim()
    );
    if (missing) {
      setError("Please complete your name, mobile number, address, date and preferred time.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post("/bookings", {
        service,
        duration,
        price: chosen.price,
        original: chosen.original,
        ...form,
      });
      setBooking(data);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || "Booking failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const startPayment = async () => {
    if (!booking) return;
    setError("");
    setPaying(true);
    try {
      const Razorpay = await loadRazorpay();
      const { data: order } = await api.post("/payments/razorpay/order", { booking_id: booking.id });
      const rzp = new Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "GngWar",
        description: `${booking.service} · ${booking.duration}`,
        prefill: { name: order.name, contact: order.mobile },
        theme: { color: "#f05a78" },
        handler: async (resp) => {
          try {
            const { data: updated } = await api.post("/payments/razorpay/verify", {
              booking_id: booking.id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            setBooking(updated);
          } catch (e) {
            setError(formatApiErrorDetail(e.response?.data?.detail) || "Payment verification failed.");
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (e) {
      setPaying(false);
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message || "Could not open payment.");
    }
  };

  if (booking) {
    const paid = booking.payment_status === "paid";
    return (
      <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="booking-confirmation">
        <div className="confirmation-modal">
          <button
            className="icon-button modal-close"
            onClick={onClose}
            aria-label="Close"
            data-testid="confirmation-close"
          >
            <X size={20} />
          </button>
          <div className="confirmation-icon">
            <Check />
          </div>
          <div className="eyebrow">{paid ? "PAYMENT SUCCESSFUL" : "BOOKING CONFIRMED"}</div>
          <h2>{paid ? "You're all set." : "We've got it from here."}</h2>
          <p>
            {paid
              ? `Your ${booking.service} is paid and scheduled. Our team will reach ${booking.mobile} on ${booking.date}.`
              : `Your booking for ${booking.service} is saved. `}
            {!paid && paymentEnabled && "Pay now to lock in the slot, or our team will call to confirm."}
            {!paid && !paymentEnabled && "Our team will call to confirm the details."}
          </p>
          <div className="confirmation-details">
            <span>{booking.duration}</span>
            <strong>{formatINR(booking.price)}</strong>
            <span>{booking.date} · {booking.time.split(" · ")[0]}</span>
          </div>

          {!paid && paymentEnabled && (
            <button
              className="button button-pink full-button"
              onClick={startPayment}
              disabled={paying}
              data-testid="pay-now-button"
            >
              {paying ? "Opening payment…" : "Pay now"} <Wallet size={17} />
            </button>
          )}
          {error && <p className="form-error" role="alert" data-testid="payment-error">{error}</p>}
          <button
            className={`button ${paid || !paymentEnabled ? "button-dark" : "button-outline"} full-button confirmation-done`}
            onClick={onClose}
            data-testid="confirmation-done-button"
          >
            Done <Check size={17} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="booking-modal">
      <div className="booking-modal">
        <button
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Close booking"
          data-testid="booking-modal-close"
        >
          <X size={20} />
        </button>
        <div className="modal-kicker">BOOK YOUR SERVICE</div>
        <h2>Let's take care of it.</h2>
        <p className="modal-intro">
          Choose your timing and share the essentials. We'll keep the rest simple.
        </p>

        <div className="booking-summary" data-testid="booking-price-summary">
          <label>
            <span>Service</span>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              data-testid="booking-service-select"
            >
              <option value="">Choose a service</option>
              {SERVICES.map((s) => (
                <option key={s.slug} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Duration</span>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              data-testid="booking-duration-select"
            >
              {PRICING.map((p) => (
                <option key={p.duration}>{p.duration}</option>
              ))}
            </select>
          </label>
          <div className="summary-price">
            <span>Total</span>
            <strong data-testid="booking-total-price">
              {formatINR(quote?.final_price ?? chosen.price)}{" "}
              <del>{formatINR(chosen.original)}</del>
            </strong>
          </div>
        </div>

        {quote && (quote.discount_pct > 0 || quote.credit_used > 0) && (
          <div className="booking-perks" data-testid="booking-perks">
            {quote.discount_pct > 0 && (
              <span className="perk-chip" data-testid="perk-discount">
                <Gift size={13} /> {quote.discount_pct}% first-booking discount applied
              </span>
            )}
            {quote.credit_used > 0 && (
              <span className="perk-chip" data-testid="perk-credit">
                <Wallet size={13} /> {formatINR(quote.credit_used)} referral credit used
              </span>
            )}
          </div>
        )}

        <div className="form-grid">
          <label>
            Customer name
            <input
              value={form.name}
              onChange={update("name")}
              placeholder="Your full name"
              data-testid="booking-name-input"
              required
            />
          </label>
          <label>
            Mobile number
            <input
              value={form.mobile}
              onChange={update("mobile")}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              data-testid="booking-mobile-input"
              required
            />
          </label>
          <label className="full-field">
            Service address
            <input
              value={form.address}
              onChange={update("address")}
              placeholder="House / flat, street, locality"
              data-testid="booking-address-input"
              required
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={form.date}
              onChange={update("date")}
              data-testid="booking-date-input"
              required
            />
          </label>
          <label>
            Preferred time
            <select
              value={form.time}
              onChange={update("time")}
              data-testid="booking-time-select"
              required
            >
              <option value="">Select a time</option>
              <option>Morning · 8 AM – 12 PM</option>
              <option>Afternoon · 12 PM – 4 PM</option>
              <option>Evening · 4 PM – 8 PM</option>
            </select>
          </label>
        </div>

        {error && (
          <p className="form-error" role="alert" data-testid="booking-form-error">
            {error}
          </p>
        )}

        <p className="booking-note">
          <ShieldCheck size={16} /> Your price is locked in before you continue.
          {paymentEnabled && " Pay online after booking or ask our team to collect on site."}
        </p>

        <button
          className="button button-dark full-button"
          onClick={submit}
          disabled={busy}
          data-testid="continue-booking-button"
        >
          {busy ? "Booking…" : "Continue Booking"} <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
