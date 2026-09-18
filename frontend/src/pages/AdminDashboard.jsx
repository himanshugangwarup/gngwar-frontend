import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Filter, Search, Wallet } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { formatINR } from "@/data/services";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";

const STATUS_OPTIONS = ["requested", "confirmed", "completed", "cancelled"];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (user === false) {
      navigate("/", { replace: true });
    } else if (user && typeof user === "object" && user.role !== "admin") {
      setError("This area is only available to GngWar admins.");
    }
  }, [user, navigate]);

  const refresh = async () => {
    try {
      const { data } = await api.get("/bookings");
      setItems(data);
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || "Could not load bookings.");
      setItems([]);
    }
  };

  useEffect(() => {
    if (user && typeof user === "object" && user.role === "admin") refresh();
  }, [user]);

  const updateStatus = async (id, next) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status: next });
      refresh();
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || "Update failed.");
    }
  };

  const filtered = useMemo(() => {
    if (!items) return null;
    return items.filter((b) => {
      if (filter !== "all" && b.status !== filter) return false;
      if (q.trim()) {
        const s = q.trim().toLowerCase();
        return [b.name, b.mobile, b.service, b.address].join(" ").toLowerCase().includes(s);
      }
      return true;
    });
  }, [items, filter, q]);

  const stats = useMemo(() => {
    const base = { requested: 0, confirmed: 0, completed: 0, cancelled: 0, paid: 0, revenue: 0 };
    (items || []).forEach((b) => {
      base[b.status] = (base[b.status] || 0) + 1;
      if (b.payment_status === "paid") {
        base.paid += 1;
        base.revenue += Number(b.price || 0);
      }
    });
    return base;
  }, [items]);

  if (user === null) return <Shell><p className="account-loading">Loading admin…</p></Shell>;
  if (user && typeof user === "object" && user.role !== "admin") {
    return (
      <Shell onLogout={logout}>
        <div className="account-header">
          <Link to="/" className="text-link back-link">
            <ArrowLeft size={16} /> Back to home
          </Link>
          <h1>Admins only.</h1>
          <p className="lead-copy">Sign in with an admin account to manage bookings.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onLogout={logout}>
      <div className="account-header">
        <Link to="/" className="text-link back-link" data-testid="admin-back-home">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <div className="eyebrow">GNGWAR ADMIN</div>
        <h1>Booking control room.</h1>
        <p className="lead-copy">Review requests, confirm visits, and track paid revenue in one place.</p>
      </div>

      <div className="admin-stats">
        <Stat label="New requests" value={stats.requested} testid="stat-requested" />
        <Stat label="Confirmed" value={stats.confirmed} testid="stat-confirmed" />
        <Stat label="Completed" value={stats.completed} testid="stat-completed" />
        <Stat label="Paid bookings" value={stats.paid} testid="stat-paid" />
        <Stat label="Paid revenue" value={formatINR(stats.revenue)} testid="stat-revenue" />
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={15} />
          <input
            placeholder="Search name, mobile, service, address"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="admin-search-input"
          />
        </div>
        <div className="admin-filter">
          <Filter size={15} />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            data-testid="admin-status-filter"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="form-error" role="alert" data-testid="admin-error">{error}</p>}

      <div className="admin-table" data-testid="admin-booking-table">
        <div className="admin-row admin-row-head">
          <span>Customer</span>
          <span>Service</span>
          <span>When</span>
          <span>Price</span>
          <span>Payment</span>
          <span>Status</span>
        </div>
        {filtered === null && <p className="account-loading">Loading…</p>}
        {filtered && filtered.length === 0 && <p className="empty-state">No bookings match.</p>}
        {filtered &&
          filtered.map((b) => (
            <div className="admin-row" key={b.id} data-testid={`admin-row-${b.id}`}>
              <span>
                <strong>{b.name}</strong>
                <small>{b.mobile}</small>
                <small className="muted">{b.address}</small>
              </span>
              <span>
                <strong>{b.service}</strong>
                <small>{b.duration}</small>
              </span>
              <span>
                <strong>{b.date || "TBD"}</strong>
                <small>{b.time.split(" · ")[0]}</small>
              </span>
              <span>
                <strong>{formatINR(b.price)}</strong>
                <small><del>{formatINR(b.original)}</del></small>
              </span>
              <span>
                <span className={b.payment_status === "paid" ? "chip chip-success" : "chip chip-warn"}>
                  <Wallet size={12} /> {b.payment_status}
                </span>
              </span>
              <span>
                <select
                  value={b.status}
                  onChange={(e) => updateStatus(b.id, e.target.value)}
                  data-testid={`admin-status-${b.id}`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </span>
            </div>
          ))}
      </div>
    </Shell>
  );
}

function Stat({ label, value, testid }) {
  return (
    <div className="stat-card" data-testid={testid}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function Shell({ children, onLogout }) {
  return (
    <div className="site-shell" data-testid="admin-page">
      <header className="navbar">
        <div className="container nav-inner">
          <Logo />
          <div className="nav-actions">
            {onLogout && (
              <button
                className="text-link"
                onClick={onLogout}
                data-testid="admin-logout"
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
