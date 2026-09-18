import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  MessageCircle,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";

const BENEFITS = [
  [BadgeCheck, "Verified Professionals"],
  [ShieldCheck, "Transparent Pricing"],
  [Clock3, "Easy Booking"],
  [Star, "On-Time Service"],
  [Wrench, "Professional Service"],
  [MessageCircle, "Customer Support"],
];

export default function WhyGngWar({ onBook }) {
  return (
    <section className="section why-section" data-testid="why-section">
      <div className="container why-grid">
        <div>
          <div className="eyebrow">WHY GNGWAR</div>
          <h2>
            Care you can
            <br />
            <em>feel good about.</em>
          </h2>
          <p className="lead-copy">
            A dependable helping hand for the tasks that keep your home running beautifully.
          </p>
          <button
            className="text-link dark-link"
            onClick={() => onBook()}
            data-testid="why-book-button"
          >
            Find your service <ArrowRight size={17} />
          </button>
        </div>
        <div className="benefits-grid">
          {BENEFITS.map(([Icon, title]) => (
            <div
              className="benefit"
              key={title}
              data-testid={`benefit-${title.toLowerCase().replaceAll(" ", "-")}`}
            >
              <Icon />
              <span>{title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
