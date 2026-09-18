import { BadgeCheck, MessageCircle, ShieldCheck } from "lucide-react";

function TagIcon() {
  return <div className="tag-icon">₹</div>;
}

export default function TrustBand() {
  return (
    <section className="trust-band" data-testid="trust-section">
      <div className="container trust-content">
        <div>
          <div className="eyebrow">THE GNGWAR PROMISE</div>
          <h2>
            Reliable Service.
            <br />
            <em>Every Time.</em>
          </h2>
          <p>Your home deserves professional care.</p>
        </div>
        <div className="trust-items">
          <span><BadgeCheck /> Verified Professionals</span>
          <span><TagIcon /> Transparent Pricing</span>
          <span><ShieldCheck /> Secure Booking</span>
          <span><MessageCircle /> Customer Support</span>
        </div>
      </div>
    </section>
  );
}
