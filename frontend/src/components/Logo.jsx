export default function Logo({ tone = "dark" }) {
  return (
    <a
      href="#home"
      className={`logo logo-${tone}`}
      data-testid="brand-logo"
    >
      <span className="logo-mark">G</span>
      <span>GngWar</span>
    </a>
  );
}
