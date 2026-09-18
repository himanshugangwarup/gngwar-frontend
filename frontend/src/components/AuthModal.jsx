import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AuthModal({ mode = "login", onClose, onSwitchMode }) {
  const { login, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => {
    setError("");
    setForm({ ...form, [key]: event.target.value });
  };

  const submit = async () => {
    setError("");
    if (mode === "register" && !form.name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!form.email.trim() || !form.password) {
      setError("Please enter your email and password.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    const result = mode === "login"
      ? await login(form.email, form.password)
      : await register(form.name, form.email, form.password);
    setBusy(false);
    if (result.ok) {
      onClose?.();
    } else {
      setError(result.error || "Something went wrong.");
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid={`auth-modal-${mode}`}>
      <div className="booking-modal auth-modal">
        <button
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Close"
          data-testid="auth-modal-close"
        >
          <X size={20} />
        </button>
        <div className="modal-kicker">
          {mode === "login" ? "WELCOME BACK" : "JOIN GNGWAR"}
        </div>
        <h2>{mode === "login" ? "Sign in to GngWar" : "Create your account"}</h2>
        <p className="modal-intro">
          {mode === "login"
            ? "Access your saved bookings and manage upcoming services."
            : "Track your bookings and get faster checkout every time."}
        </p>

        <div className="form-grid">
          {mode === "register" && (
            <label className="full-field">
              Full name
              <input
                value={form.name}
                onChange={update("name")}
                placeholder="Your full name"
                data-testid="auth-name-input"
                autoComplete="name"
              />
            </label>
          )}
          <label className="full-field">
            Email
            <input
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="you@example.com"
              data-testid="auth-email-input"
              autoComplete="email"
            />
          </label>
          <label className="full-field">
            Password
            <input
              type="password"
              value={form.password}
              onChange={update("password")}
              placeholder="At least 6 characters"
              data-testid="auth-password-input"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
        </div>

        {error && (
          <p className="form-error" role="alert" data-testid="auth-form-error">
            {error}
          </p>
        )}

        <button
          className="button button-dark full-button"
          onClick={submit}
          disabled={busy}
          data-testid="auth-submit-button"
        >
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}{" "}
          <ArrowRight size={17} />
        </button>

        <p className="auth-switch">
          {mode === "login" ? (
            <>
              New to GngWar?{" "}
              <button
                type="button"
                onClick={() => onSwitchMode("register")}
                data-testid="switch-to-register"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => onSwitchMode("login")}
                data-testid="switch-to-login"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
