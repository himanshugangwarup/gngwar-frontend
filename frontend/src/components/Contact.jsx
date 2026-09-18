import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

const ITEMS = [
  [Phone, "Phone", "Contact number coming soon"],
  [Mail, "Email", "Support email coming soon"],
  [MapPin, "Service location", "Service locations coming soon"],
  [MessageCircle, "Customer support", "Support hours coming soon"],
];

export default function Contact() {
  return (
    <section className="section contact-section" id="contact" data-testid="contact-section">
      <div className="container contact-grid">
        <div>
          <div className="eyebrow">GET IN TOUCH</div>
          <h2>
            We're here
            <br />
            <em>to help.</em>
          </h2>
          <p className="lead-copy">
            Have a question or need a hand choosing a service? Our support details will be
            available here soon.
          </p>
        </div>
        <div className="contact-list">
          {ITEMS.map(([Icon, label, placeholder]) => (
            <div key={label} data-testid={`contact-${label.toLowerCase().replaceAll(" ", "-")}`}>
              <Icon />
              <span>
                <b>{label}</b>
                <small>{placeholder}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
