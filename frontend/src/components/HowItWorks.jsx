import { ArrowRight } from "lucide-react";

const STEPS = [
  ["01", "Choose a Service", "Find the right kind of help for your home."],
  ["02", "Select Duration & Time", "Pick a duration and time that works for you."],
  ["03", "Professional Arrives", "A trained professional comes to your doorstep."],
  ["04", "Service Completed", "Enjoy a home that feels looked after."],
];

export default function HowItWorks() {
  return (
    <section
      className="section dark-section how-section"
      id="how-it-works"
      data-testid="how-it-works-section"
    >
      <div className="container">
        <div className="section-heading centered">
          <div className="eyebrow light">THE SIMPLE WAY</div>
          <h2>How GngWar Works</h2>
          <p>From "I need help" to "that feels better" in four easy steps.</p>
        </div>
        <div className="steps-grid">
          {STEPS.map(([num, title, copy], i) => (
            <div className="step" key={num} data-testid={`how-step-${num}`}>
              <span className="step-num">{num}</span>
              <div className="step-line" />
              <h3>{title}</h3>
              <p>{copy}</p>
              {i < 3 && <ArrowRight className="step-arrow" size={19} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
