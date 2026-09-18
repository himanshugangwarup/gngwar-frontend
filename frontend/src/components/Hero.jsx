import { ArrowRight, Check } from "lucide-react";

export default function Hero({ onBook }) {
  return (
    <section className="hero" id="home" data-testid="hero-section">
      <div className="container hero-grid">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> TRUSTED HOME SERVICES
          </div>
          <h1>
            Your Home,
            <br />
            <em>Our Priority.</em>
          </h1>
          <p className="hero-subtitle">
            Professional, reliable and affordable home services — right at your doorstep.
          </p>
          <div className="trust-points">
            <span><Check size={15} /> Verified Professionals</span>
            <span><Check size={15} /> Transparent Pricing</span>
            <span><Check size={15} /> Easy Booking</span>
          </div>
          <div className="hero-actions">
            <button
              className="button button-pink"
              onClick={() => onBook()}
              data-testid="hero-book-button"
            >
              Book Your Service <ArrowRight size={17} />
            </button>
            <a className="text-link" href="#services" data-testid="hero-services-link">
              Explore Services <ArrowRight size={17} />
            </a>
          </div>
        </div>

        <div className="hero-visual" data-testid="team-image-wrapper">
          <img
            src="/assets/images/team-crop.jpg"
            alt="GngWar female service professionals"
            className="team-image"
          />
          <div className="hero-caption">
            <span className="caption-dot" /> Your home, cared for
          </div>
        </div>
      </div>
    </section>
  );
}
