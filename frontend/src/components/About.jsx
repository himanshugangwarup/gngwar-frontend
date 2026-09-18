import { ArrowRight } from "lucide-react";

export default function About() {
  return (
    <section className="section about-section" id="about" data-testid="about-section">
      <div className="container about-grid">
        <div className="about-number">
          01<span>/</span>
        </div>
        <div>
          <div className="eyebrow">A LITTLE ABOUT US</div>
          <h2>
            Home care that
            <br />
            <em>fits real life.</em>
          </h2>
        </div>
        <div className="about-copy">
          <p>
            GngWar is a modern home-services platform designed to make everyday household services
            simple, convenient and accessible.
          </p>
          <p>
            Discover a service, choose a suitable duration and time, and book professional help at
            your doorstep.
          </p>
          <a
            className="button button-outline"
            href="#contact"
            data-testid="learn-more-button"
          >
            Learn More <ArrowRight size={17} />
          </a>
        </div>
      </div>
    </section>
  );
}
