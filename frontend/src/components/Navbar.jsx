import { useState } from "react";
import { ArrowRight, Menu, X, LogOut, UserRound } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "@/context/AuthContext";

export default function Navbar({ onOpenBooking, onOpenAuth }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  const close = () => setOpen(false);
  const authed = user && typeof user === "object";

  return (
    <header className="navbar" data-testid="main-navbar">
      <div className="container nav-inner">
        <Logo />
        <nav
          className={open ? "nav-links open" : "nav-links"}
          data-testid="desktop-navigation"
        >
          <a href="#home" onClick={close} data-testid="nav-home">Home</a>
          <a href="#services" onClick={close} data-testid="nav-services">Services</a>
          <a href="#how-it-works" onClick={close} data-testid="nav-how-it-works">How It Works</a>
          <a href="#about" onClick={close} data-testid="nav-about">About Us</a>
          <a href="#contact" onClick={close} data-testid="nav-contact">Contact</a>

          {!authed ? (
            <button
              className="nav-link-btn mobile-only-link"
              onClick={() => { close(); onOpenAuth("login"); }}
              data-testid="mobile-login-link"
            >
              Login
            </button>
          ) : (
            <button
              className="nav-link-btn mobile-only-link"
              onClick={() => { close(); logout(); }}
              data-testid="mobile-logout-link"
            >
              Sign out
            </button>
          )}

          <button
            className="button button-pink mobile-book"
            onClick={() => { close(); onOpenBooking(); }}
            data-testid="mobile-book-button"
          >
            Book Now <ArrowRight size={16} />
          </button>
        </nav>

        <div className="nav-actions">
          {!authed ? (
            <button
              className="text-link desktop-login"
              onClick={() => onOpenAuth("login")}
              data-testid="navbar-login-button"
            >
              Login
            </button>
          ) : (
            <div className="user-pill desktop-login" data-testid="navbar-user-pill">
              <UserRound size={14} />
              <span>{user.name?.split(" ")[0] || "Account"}</span>
              <button
                className="icon-button"
                onClick={logout}
                aria-label="Sign out"
                data-testid="navbar-logout-button"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
          <button
            className="button button-pink desktop-book"
            onClick={() => onOpenBooking()}
            data-testid="navbar-book-button"
          >
            Book Now <ArrowRight size={16} />
          </button>
          <button
            className="menu-toggle"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            data-testid="mobile-menu-button"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
