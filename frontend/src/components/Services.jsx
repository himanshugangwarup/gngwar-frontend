import { useMemo, useState } from "react";
import ServiceCard from "./ServiceCard";
import { SERVICES } from "@/data/services";

const FILTERS = [
  { key: "all", label: "All services" },
  { key: "cleaning", label: "Cleaning" },
  { key: "kitchen", label: "Kitchen" },
  { key: "laundry", label: "Laundry & care" },
];

export default function Services({ onBook }) {
  const [active, setActive] = useState("all");

  const filtered = useMemo(
    () => (active === "all" ? SERVICES : SERVICES.filter((s) => s.tag === active)),
    [active]
  );

  return (
    <section className="section services-section" id="services" data-testid="services-section">
      <div className="container">
        <div className="section-heading split-heading">
          <div>
            <div className="eyebrow">OUR SERVICES</div>
            <h2>
              Everyday help,
              <br />
              <em>made effortless.</em>
            </h2>
          </div>
          <p>Choose the service you need and book a professional at your preferred time.</p>
        </div>

        <div className="service-filters" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={active === f.key ? "filter active" : "filter"}
              onClick={() => setActive(f.key)}
              data-testid={`filter-${f.key}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="services-grid">
          {filtered.map((service) => (
            <ServiceCard key={service.slug} service={service} onBook={onBook} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="empty-filter" data-testid="empty-service-filter">
            More services are coming to this category soon. Browse all services to find your fit.
          </p>
        )}
      </div>
    </section>
  );
}
