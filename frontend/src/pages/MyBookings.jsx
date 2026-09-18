import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeCheck, Clock3, Wallet } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { formatINR } from "@/data/services";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";
import { loadRazorpay } from "@/lib/razorpay";

const STATUS_STYLE = {
  requested: { label: "Requested", cls: "chip chip-neutral" },
  confirmed: { label: "Confirmed", cls: "chip chip-success" },
  completed: { label: "Completed", cls: "chip chip-dark" },
  cancelled: { label: "Cancelled", cls: "chip chip-danger" },
};

const PAYMENT_STYLE = {
  unpaid: { label: "Unpaid", cls: "chip chip-warn" },
  pending: { label: "Payment pending", cls: "chip chip-warn" },
  paid: { label: "Paid", cls: "chip chip-success" },
};

export default function MyBookings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(null);

  useEffect(() => {
    if (user === false) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const refresh = async () => {
    try {
      const { data } = await api.get("/bookings/me");
      setItems(data);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || "Could not load bookings.");
      setItems([]);
    }
  };

  useEffect(() => {
    if (user && typeof user === "object") refresh();
  }, [user]);

  const now = new Date();
  const isFuture = (b) => {
    if (!b.date) return true;
    try {
      return new Date(`${b.date}T23:59:00`) >= now;
    } catch {
      return true;
    }
  };
  const upcoming = (items || []).filter((b) => isFuture(b) && b.status !== "cancelled");
  const past = (items || []).filter((b) => !isFuture(b) || b.status === "cancelled" || b.status === "completed");

  const payNow = async (booking) => {
    setPaying(booking.id);
    try {
      const { data: cfg } = await api.get("/payments/razorpay/config");
      if (!cfg.enabled) {
        setError("Payments are not yet configured. Our team will call you to confirm your booking.");
        return;
      }
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
            await api.post("/payments/razorpay/verify", {
              booking_id: booking.id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            await refresh();
          } catch (e) {
            setError(formatApiErrorDetail(e.response?.data?.detail) || "Payment verification failed.");
          }
        },
        modal: { ondismiss: () => setPaying(null) },
      });
      rzp.open();
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message || "Could not start payment.");
    } finally {
      setPaying(null);
    }
  };

  if (user === null) return <PageShell><p className="account-loading">Loading your account…</p></PageShell>;

  return (
    <PageShell onLogout={logout}>
      <div className="account-header">
        <Link to="/" className="text-link back-link" data-testid="back-to-home">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <div className="eyebrow">MY BOOKINGS</div>
        <h1>Hi {user?.name?.split(" ")[0] || "there"}, here's what's scheduled.</h1>
        <p className="lead-copy">Track upcoming visits, review past services, and pay for any that are still unpaid.</p>
      </div>

      {error && <p className="form-error" role="alert" data-testid="my-bookings-error">{error}</p>}

      <section className="account-block">
        <div className="account-block-head">
          <h2>Upcoming</h2>
          <span className="muted-count">{upcoming.length}</span>
        </div>
        {items === null ? (
          <p className="account-loading">Loading…</p>
        ) : upcoming.length === 0 ? (
          <EmptyState message="No upcoming bookings yet." ctaLabel="Book a service" onClick={() => navigate("/") } />
        ) : (
          <div className="booking-cards">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} onPay={payNow} paying={paying === b.id} />
            ))}
          </div>
        )}
      </section>

      <section className="account-block">
        <div className="account-block-head">
          <h2>History</h2>
          <span className="muted-count">{past.length}</span>
        </div>
        {items === null ? (
          <p className="account-loading">Loading…</p>
        ) : past.length === 0 ? (
          <EmptyState message="No past bookings yet." />
        ) : (
          <div className="booking-cards">
            {past.map((b) => (
              <BookingCard key={b.id} booking={b} readOnly />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function BookingCard({ booking, onPay, paying, readOnly }) {
  const status = STATUS_STYLE[booking.status] || STATUS_STYLE.requested;
  const pay = PAYMENT_STYLE[booking.payment_status] || PAYMENT_STYLE.unpaid;
  const showPay = !readOnly && booking.payment_status !== "paid" && booking.status !== "cancelled";
  return (
    <article className="booking-card" data-testid={`booking-card-${booking.id}`}>
      <div className="booking-card-top">
        <div>
          <div className="eyebrow tiny">{booking.duration}</div>
          <h3>{booking.service}</h3>
        </div>
        <div className="chips">
          <span className={status.cls} data-testid={`status-${booking.id}`}>
            <BadgeCheck size={12} /> {status.label}
          </span>
          <span className={pay.cls} data-testid={`payment-${booking.id}`}>
            <Wallet size={12} /> {pay.label}
          </span>
        </div>
      </div>
      <div className="booking-card-meta">
        <span><Clock3 size={13} /> {booking.date || "Date TBD"} · {booking.time.split(" · ")[0]}</span>
        <span className="booking-address">{booking.address}</span>
      </div>
      <div className="booking-card-foot">
        <strong>{formatINR(booking.price)} <del>{formatINR(booking.original)}</del></strong>
        {showPay && (
          <button
            className="button button-pink small"
            onClick={() => onPay(booking)}
            disabled={paying}
            data-testid={`pay-now-${booking.id}`}
          >
            {paying ? "Opening…" : "Pay now"} <ArrowRight size={14} />
          </button>
        )}
      </div>
    </article>
  );
}

function EmptyState({ message, ctaLabel, onClick }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {ctaLabel && (
        <button className="button button-outline small" onClick={onClick} data-testid="empty-cta">
          {ctaLabel} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function PageShell({ children, onLogout }) {
  const { user } = useAuth();
  const isAdmin = user && typeof user === "object" && user.role === "admin";
  return (
    <div className="site-shell" data-testid="my-bookings-page">
      <header className="navbar">
        <div className="container nav-inner">
          <Logo />
          <div className="nav-actions account-nav">
            <Link to="/" className="account-nav-link" data-testid="account-nav-home">
              Home
            </Link>
            {isAdmin && (
              <Link to="/admin" className="account-nav-link" data-testid="account-nav-admin">
                Admin
              </Link>
            )}
            {onLogout && (
              <button
                className="text-link"
                onClick={onLogout}
                data-testid="account-logout"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="container account-page">{children}</main>
    </div>
  );
}
