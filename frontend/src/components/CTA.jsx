import { ArrowRight } from "lucide-react";

export default function CTA({ onBook }) {
  return (
    <section className="cta-section" data-testid="cta-section">
      <div className="container cta-inner">
        <div>
          <div className="eyebrow light">READY WHEN YOU ARE</div>
          <h2>
            Need help around
            <br />
            your home?
          </h2>
        </div>
        <button
          className="button button-light"
          onClick={() => onBook()}
          data-testid="cta-book-button"
        >
          Book Your Service <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );
}
