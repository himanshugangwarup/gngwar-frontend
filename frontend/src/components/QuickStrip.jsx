import { QUICK_SERVICES } from "@/data/services";

export default function QuickStrip() {
  return (
    <div className="quick-strip" data-testid="quick-services-strip">
      <div className="container quick-inner">
        {QUICK_SERVICES.map((item) => (
          <span
            key={item}
            data-testid={`quick-service-${item.slice(2).toLowerCase().replaceAll(" ", "-")}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
