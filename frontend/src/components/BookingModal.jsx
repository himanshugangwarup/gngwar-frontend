import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ShieldCheck, X } from "lucide-react";
import { PRICING, SERVICES, getPriceFor, formatINR, DEFAULT_DURATION } from "@/data/services";
import { api, formatApiErrorDetail } from "@/lib/api";

export default function BookingModal({ selected, onClose, onConfirmed, onRequireService }) {
  const initialService = selected?.name || "";
  const initialDuration = selected?.duration || DEFAULT_DURATION;
  const [service, setService] = useState(initialService);
  const [duration, setDuration] = useState(initialDuration);
  const [form, setForm] = useState({ name: "", mobile: "", address: "", date: "", time: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);

  const chosen = useMemo(() => getPriceFor(duration), [duration]);

  useEffect(() => {
    // If BookingModal is opened without a service selected, prompt selection panel.
    if (!service && onRequireService) onRequireService();
  }, []); // eslint-disable-line

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
      const payload = {
        service,
        duration,
        price: chosen.price,
        original: chosen.original,
        ...form,
      };
      const { data } = await api.post("/bookings", payload);
      setSuccess(data);
      onConfirmed?.(data);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || "Booking failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (success) {
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
          <div className="eyebrow">BOOKING CONFIRMED</div>
          <h2>We've got it from here.</h2>
          <p>
            Your booking for <strong>{success.service}</strong> is saved. Our team will reach
            you on <strong>{success.mobile}</strong> to confirm details.
          </p>
          <div className="confirmation-details">
            <span>{success.duration}</span>
            <strong>{formatINR(success.price)}</strong>
            <span>{success.date} · {success.time.split(" · ")[0]}</span>
          </div>
          <button
            className="button button-dark full-button"
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
              {formatINR(chosen.price)} <del>{formatINR(chosen.original)}</del>
            </strong>
          </div>
        </div>

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
