import { Instagram } from "lucide-react";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="footer" data-testid="footer">
      <div className="container footer-top">
        <div>
          <Logo tone="light" />
          <p>Your Home • Our Priority</p>
        </div>
        <div className="footer-links">
          <div>
            <b>Explore</b>
            <a href="#home" data-testid="footer-home">Home</a>
            <a href="#services" data-testid="footer-services">Services</a>
            <a href="#how-it-works" data-testid="footer-how-it-works">How It Works</a>
          </div>
          <div>
            <b>Company</b>
            <a href="#about" data-testid="footer-about">About Us</a>
            <a href="#contact" data-testid="footer-contact">Contact</a>
            <span data-testid="footer-privacy">Privacy Policy</span>
            <span data-testid="footer-terms">Terms &amp; Conditions</span>
          </div>
        </div>
        <div className="socials">
          <b>Follow along</b>
          <span>
            <Instagram />
            <span data-testid="social-placeholder">Social links coming soon</span>
          </span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 GngWar. Your home, our priority.</span>
        <span>Made for everyday living.</span>
      </div>
    </footer>
  );
}
