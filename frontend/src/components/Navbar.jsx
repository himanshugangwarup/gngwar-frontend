import { useState } from "react";
import { ArrowRight, Menu, X, LogOut, UserRound, LayoutDashboard, CalendarClock, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "@/context/AuthContext";

export default function Navbar({ onOpenBooking, onOpenAuth }) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const { user, logout } = useAuth();

  const close = () => setOpen(false);
  const authed = user && typeof user === "object";
  const isAdmin = authed && user.role === "admin";

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

          {authed && (
            <Link
              to="/my-bookings"
              onClick={close}
              className="mobile-only-link"
              data-testid="mobile-my-bookings"
            >
              My Bookings
            </Link>
          )}
          {authed && (
            <Link
              to="/refer"
              onClick={close}
              className="mobile-only-link"
              data-testid="mobile-refer"
            >
              Refer & Earn
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={close}
              className="mobile-only-link"
              data-testid="mobile-admin"
            >
              Admin
            </Link>
          )}

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
              <button
                className="user-pill-main"
                onClick={() => setMenu((m) => !m)}
                aria-expanded={menu}
                data-testid="user-pill-toggle"
              >
                <UserRound size={14} />
                <span>{user.name?.split(" ")[0] || "Account"}</span>
              </button>
              {menu && (
                <div className="user-menu" role="menu" data-testid="user-menu">
                  <Link
                    to="/my-bookings"
                    onClick={() => setMenu(false)}
                    data-testid="menu-my-bookings"
                  >
                    <CalendarClock size={14} /> My Bookings
                  </Link>
                  <Link
                    to="/refer"
                    onClick={() => setMenu(false)}
                    data-testid="menu-refer"
                  >
                    <Gift size={14} /> Refer & Earn
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMenu(false)}
                      data-testid="menu-admin"
                    >
                      <LayoutDashboard size={14} /> Admin
                    </Link>
                  )}
                  <button
                    onClick={() => { setMenu(false); logout(); }}
                    data-testid="menu-logout"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
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
