import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Gift, Share2, Wallet } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/data/services";
import Logo from "@/components/Logo";

export default function Refer() {
  const { user, logout } = useAuth();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || typeof user !== "object") return;
    api.get("/referrals/me").then(({ data }) => setInfo(data)).catch((e) => {
      setError(formatApiErrorDetail(e.response?.data?.detail) || "Could not load referrals.");
    });
  }, [user]);

  if (user === null) return <Shell><p className="account-loading">Loading…</p></Shell>;
  if (user === false) {
    return (
      <Shell>
        <div className="account-header">
          <Link to="/" className="text-link back-link">
            <ArrowLeft size={16} /> Back to home
          </Link>
          <h1>Sign in to share GngWar.</h1>
          <p className="lead-copy">Log in to grab your referral link and start earning credits.</p>
        </div>
      </Shell>
    );
  }

  const link = info ? `${window.location.origin}/?ref=${info.referral_code}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "GngWar — Your Home, Our Priority",
          text: `Get ${info.friend_discount_pct}% off your first GngWar booking with my link:`,
          url: link,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  return (
    <Shell onLogout={logout} user={user}>
      <div className="account-header">
        <Link to="/" className="text-link back-link" data-testid="refer-back-home">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <div className="eyebrow">REFER A FRIEND</div>
        <h1>Give {info?.friend_discount_pct || 15}%. Get {formatINR(info?.referrer_credit || 150)}.</h1>
        <p className="lead-copy">
          Share GngWar with a friend. They get {info?.friend_discount_pct || 15}% off their first booking. You get {formatINR(info?.referrer_credit || 150)} credit the moment their first paid booking is confirmed.
        </p>
      </div>

      {error && <p className="form-error" role="alert" data-testid="refer-error">{error}</p>}

      {info && (
        <>
          <div className="refer-hero">
            <div className="refer-code-card" data-testid="refer-code-card">
              <span className="eyebrow tiny">YOUR REFERRAL LINK</span>
              <div className="refer-link">
                <code data-testid="refer-link">{link}</code>
                <button
                  className="button button-outline small"
                  onClick={copy}
                  data-testid="refer-copy-button"
                >
                  <Copy size={14} /> {copied ? "Copied" : "Copy"}
                </button>
                <button
                  className="button button-pink small"
                  onClick={share}
                  data-testid="refer-share-button"
                >
                  <Share2 size={14} /> Share
                </button>
              </div>
              <div className="refer-code-row">
                <span>Or share your code:</span>
                <strong data-testid="refer-code-value">{info.referral_code}</strong>
              </div>
            </div>

            <div className="refer-balance" data-testid="refer-balance">
              <Wallet />
              <div>
                <span className="stat-label">Credit balance</span>
                <strong>{formatINR(info.credit_balance)}</strong>
                <small>Auto-applied on your next booking</small>
              </div>
            </div>
          </div>

          <section className="account-block">
            <div className="account-block-head">
              <h2>Friends you've referred</h2>
              <span className="muted-count">{info.referrals.length}</span>
            </div>
            {info.referrals.length === 0 ? (
              <div className="empty-state">
                <p>Nobody's joined through your link yet. Share it and start earning credits.</p>
              </div>
            ) : (
              <div className="refer-list">
                {info.referrals.map((r, i) => (
                  <div key={i} className="refer-row" data-testid={`refer-row-${i}`}>
                    <div>
                      <strong>{r.name || r.email}</strong>
                      <small>joined {new Date(r.joined_at).toLocaleDateString()}</small>
                    </div>
                    <span className={r.rewarded ? "chip chip-success" : "chip chip-neutral"}>
                      <Gift size={12} /> {r.rewarded ? `+${formatINR(info.referrer_credit)} earned` : "waiting on first paid booking"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}

function Shell({ children, onLogout, user }) {
  const isAdmin = user && typeof user === "object" && user.role === "admin";
  return (
    <div className="site-shell" data-testid="refer-page">
      <header className="navbar">
        <div className="container nav-inner">
          <Logo />
          <div className="nav-actions account-nav">
            <Link to="/" className="account-nav-link">Home</Link>
            {user && typeof user === "object" && (
              <Link to="/my-bookings" className="account-nav-link">My Bookings</Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="account-nav-link">Admin</Link>
            )}
            {onLogout && (
              <button className="text-link" onClick={onLogout}>Sign out</button>
            )}
          </div>
        </div>
      </header>
      <main className="container account-page">{children}</main>
    </div>
  );
}
