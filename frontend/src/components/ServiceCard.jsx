import { useState } from "react";
import { ArrowRight, ChevronDown, Clock3 } from "lucide-react";
import { PRICING, DEFAULT_DURATION, getPriceFor, formatINR } from "@/data/services";

export default function ServiceCard({ service, onBook }) {
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const chosen = getPriceFor(duration);

  return (
    <article
      className="service-card"
      data-testid={`service-card-${service.slug}`}
    >
      <div className="service-icon">
        <span>{service.emoji}</span>
        <span className="service-tag">{service.tag}</span>
      </div>
      <h3>{service.name}</h3>
      <p>{service.description}</p>

      <div className="duration-select-wrap">
        <Clock3 size={15} />
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          aria-label={`${service.name} duration`}
          data-testid={`duration-select-${service.slug}`}
        >
          {PRICING.map((p) => (
            <option key={p.duration}>{p.duration}</option>
          ))}
        </select>
        <ChevronDown size={15} />
      </div>

      <div className="card-price" data-testid={`card-price-${service.slug}`}>
        <strong>{formatINR(chosen.price)}</strong>
        <del>{formatINR(chosen.original)}</del>
        <span>for {chosen.duration.toLowerCase()}</span>
      </div>

      <button
        className="button button-outline card-button"
        onClick={() => onBook({ name: service.name, duration })}
        data-testid={`book-service-${service.slug}`}
      >
        Book Now <ArrowRight size={16} />
      </button>
    </article>
  );
}
