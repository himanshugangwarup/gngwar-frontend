import { useMemo, useState } from "react";
import {
  ArrowRight, BadgeCheck, CalendarDays, Check, ChevronDown, Clock3,
  Coffee, CookingPot, Fan, HandPlatter, HelpCircle, House, Instagram,
  Layers3, Leaf, Menu, Package, Phone, ShieldCheck, Sparkles, Star,
  Utensils, WashingMachine, X, Wrench, MapPin, Mail, MessageCircle
} from "lucide-react";
import "@/App.css";

const pricing = [
  { duration: "30 Minutes", price: 75, original: 86 },
  { duration: "45 Minutes", price: 110, original: 127 },
  { duration: "60 Minutes", price: 149, original: 171 },
  { duration: "90 Minutes", price: 222, original: 255 },
  { duration: "120 Minutes", price: 296, original: 340 },
  { duration: "180 Minutes", price: 439, original: 505 },
];

const services = [
  ["Sweeping + Mopping", "A spotless, refreshed floor from room to room.", "🧹", Leaf],
  ["Utensils / Dishwashing", "Thoughtful kitchen cleanup, handled with care.", "🍽️", HandPlatter],
  ["Dusting + Wiping", "Detail-led dust removal for a cleaner everyday home.", "✨", Sparkles],
  ["Bathroom Cleaning", "A hygienic, sparkling reset for your bathroom.", "🚿", WashingMachine],
  ["Kitchen Cleaning", "Grease, spills and surfaces made fresh again.", "🍳", CookingPot],
  ["Laundry", "Neat, reliable laundry help that fits your routine.", "👕", WashingMachine],
  ["Ironing + Folding", "Crisp clothes, neatly folded and ready to wear.", "🧺", Layers3],
  ["Window Cleaning", "Clearer glass and brighter rooms, without the hassle.", "🪟", House],
  ["Fan Cleaning", "A careful clean for fresher air and quieter fans.", "🌀", Fan],
  ["Balcony Cleaning", "Bring your outdoor corner back to life.", "🌿", Leaf],
  ["Kitchen Prep / Basic Cooking Help", "A helping hand for everyday kitchen prep.", "🥣", Utensils],
  ["Packing / Unpacking", "Make moving days calmer, one box at a time.", "📦", Package],
];

const quickServices = ["🧹 Sweeping + Mopping", "🍽️ Utensils / Dishwashing", "✨ Dusting + Wiping", "🚿 Bathroom Cleaning", "🍳 Kitchen Cleaning", "👕 Laundry"];

function Logo() {
  return <a href="#home" className="logo" data-testid="brand-logo"><span className="logo-mark">G</span><span>GngWar</span></a>;
}

function BookingModal({ selected, onClose, onConfirm }) {
  const [duration, setDuration] = useState(selected?.duration || "60 Minutes");
  const [form, setForm] = useState({ name: "", mobile: "", address: "", date: "", time: "" });
  const selectedPrice = pricing.find((item) => item.duration === duration) || pricing[2];
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="booking-modal">
    <div className="booking-modal">
      <button className="icon-button modal-close" onClick={onClose} aria-label="Close booking" data-testid="booking-modal-close"><X size={20} /></button>
      <div className="modal-kicker">BOOK YOUR SERVICE</div>
      <h2>Let’s take care of it.</h2>
      <p className="modal-intro">Choose your timing and share the essentials. We’ll keep the rest simple.</p>
      <div className="booking-summary" data-testid="booking-price-summary">
        <div><span>Selected service</span><strong>{selected?.name || "Choose a service"}</strong></div>
        <label><span>Duration</span><select value={duration} onChange={(e) => setDuration(e.target.value)} data-testid="booking-duration-select">{pricing.map((item) => <option key={item.duration}>{item.duration}</option>)}</select></label>
        <div className="summary-price"><span>Total</span><strong>₹{selectedPrice.price} <del>₹{selectedPrice.original}</del></strong></div>
      </div>
      <div className="form-grid">
        <label>Customer name<input value={form.name} onChange={update("name")} placeholder="Your full name" data-testid="booking-name-input" required /></label>
        <label>Mobile number<input value={form.mobile} onChange={update("mobile")} placeholder="10-digit mobile number" data-testid="booking-mobile-input" required /></label>
        <label className="full-field">Service address<input value={form.address} onChange={update("address")} placeholder="House / flat, street, locality" data-testid="booking-address-input" required /></label>
        <label>Date<input type="date" value={form.date} onChange={update("date")} data-testid="booking-date-input" required /></label>
        <label>Preferred time<select value={form.time} onChange={update("time")} data-testid="booking-time-select" required><option value="">Select a time</option><option>Morning · 8 AM – 12 PM</option><option>Afternoon · 12 PM – 4 PM</option><option>Evening · 4 PM – 8 PM</option></select></label>
      </div>
      <p className="booking-note"><ShieldCheck size={16} /> Your price is locked in before you continue. Payment can be connected here later.</p>
      <button className="button button-dark full-button" onClick={() => onConfirm({ ...form, service: selected?.name || "", duration, price: selectedPrice.price, original: selectedPrice.original })} data-testid="continue-booking-button">Continue Booking <ArrowRight size={17} /></button>
    </div>
  </div>;
}

function ServiceCard({ service, onBook }) {
  const [duration, setDuration] = useState("60 Minutes");
  const [name, description, emoji, Icon] = service;
  const chosen = pricing.find((item) => item.duration === duration);
  return <article className="service-card" data-testid={`service-card-${name.toLowerCase().replaceAll(" ", "-").replaceAll("/", "")}`}>
    <div className="service-icon"><span>{emoji}</span><Icon size={18} /></div>
    <h3>{name}</h3><p>{description}</p>
    <div className="duration-select-wrap"><Clock3 size={15} /><select value={duration} onChange={(e) => setDuration(e.target.value)} aria-label={`${name} duration`} data-testid={`duration-select-${name.toLowerCase().replaceAll(" ", "-")}`}>{pricing.map((item) => <option key={item.duration}>{item.duration}</option>)}</select><ChevronDown size={15} /></div>
    <div className="card-price"><strong>₹{chosen.price}</strong><del>₹{chosen.original}</del><span>for {chosen.duration.toLowerCase()}</span></div>
    <button className="button button-outline card-button" onClick={() => onBook({ name, duration })} data-testid={`book-service-${name.toLowerCase().replaceAll(" ", "-")}`}>Book Now <ArrowRight size={16} /></button>
  </article>;
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [booking, setBooking] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All services");
  const filteredServices = useMemo(() => activeCategory === "All services" ? services : services.filter((service) => service[0].toLowerCase().includes(activeCategory.toLowerCase())), [activeCategory]);
  const openBooking = (service = null) => { setBooking(service || { name: services[0][0], duration: "60 Minutes" }); setMenuOpen(false); };
  const confirmBooking = (details) => { localStorage.setItem("gngwar_booking", JSON.stringify(details)); setBooking(null); setConfirmation(details); };

  return <div className="site-shell" data-testid="gngwar-app">
    <header className="navbar" data-testid="main-navbar"><div className="container nav-inner"><Logo /><nav className={menuOpen ? "nav-links open" : "nav-links"} data-testid="desktop-navigation"><a href="#home" onClick={() => setMenuOpen(false)} data-testid="nav-home">Home</a><a href="#services" onClick={() => setMenuOpen(false)} data-testid="nav-services">Services</a><a href="#how-it-works" onClick={() => setMenuOpen(false)} data-testid="nav-how-it-works">How It Works</a><a href="#about" onClick={() => setMenuOpen(false)} data-testid="nav-about">About Us</a><a href="#contact" onClick={() => setMenuOpen(false)} data-testid="nav-contact">Contact</a><button className="button button-pink mobile-book" onClick={() => openBooking()} data-testid="mobile-book-button">Book Now <ArrowRight size={16} /></button></nav><div className="nav-actions"><button className="button button-pink desktop-book" onClick={() => openBooking()} data-testid="navbar-book-button">Book Now <ArrowRight size={16} /></button><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" data-testid="mobile-menu-button">{menuOpen ? <X /> : <Menu />}</button></div></div></header>

    <main>
      <section className="hero" id="home" data-testid="hero-section"><div className="container hero-grid"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> TRUSTED HOME SERVICES</div><h1>Your Home,<br /><em>Our Priority.</em></h1><p className="hero-subtitle">Professional, reliable and affordable home services — right at your doorstep.</p><div className="trust-points"><span><Check size={15} /> Verified Professionals</span><span><Check size={15} /> Transparent Pricing</span><span><Check size={15} /> Easy Booking</span></div><div className="hero-actions"><button className="button button-pink" onClick={() => openBooking()} data-testid="hero-book-button">Book Your Service <ArrowRight size={17} /></button><a className="text-link" href="#services" data-testid="hero-services-link">Explore Services <ArrowRight size={17} /></a></div></div><div className="hero-visual" data-testid="team-image-placeholder"><div className="team-placeholder"><div className="placeholder-badge"><ImageSlotIcon /><span>GngWar team image</span></div><strong>Replace this local slot<br />with the exact team photo</strong><small>public/assets/images/team-placeholder.svg</small></div><div className="hero-caption"><span className="caption-dot" /> Your home, cared for</div></div></div></section>
      <div className="quick-strip" data-testid="quick-services-strip"><div className="container quick-inner">{quickServices.map((item) => <span key={item} data-testid={`quick-service-${item.slice(2).toLowerCase().replaceAll(" ", "-")}`}>{item}</span>)}</div></div>

      <section className="section services-section" id="services" data-testid="services-section"><div className="container"><div className="section-heading split-heading"><div><div className="eyebrow">OUR SERVICES</div><h2>Everyday help,<br /><em>made effortless.</em></h2></div><p>Choose the service you need and book a professional at your preferred time.</p></div><div className="service-filters"><button className={activeCategory === "All services" ? "filter active" : "filter"} onClick={() => setActiveCategory("All services")} data-testid="filter-all-services">All services</button><button className={activeCategory === "cleaning" ? "filter active" : "filter"} onClick={() => setActiveCategory("cleaning")} data-testid="filter-cleaning">Cleaning</button><button className={activeCategory === "kitchen" ? "filter active" : "filter"} onClick={() => setActiveCategory("kitchen")} data-testid="filter-kitchen">Kitchen</button><button className={activeCategory === "laundry" ? "filter active" : "filter"} onClick={() => setActiveCategory("laundry")} data-testid="filter-laundry">Laundry & care</button></div><div className="services-grid">{filteredServices.map((service) => <ServiceCard key={service[0]} service={service} onBook={openBooking} />)}</div>{filteredServices.length === 0 && <p className="empty-filter" data-testid="empty-service-filter">More services are coming to this category soon. Browse all services to find your fit.</p>}</div></section>

      <section className="section dark-section how-section" id="how-it-works" data-testid="how-it-works-section"><div className="container"><div className="section-heading centered"><div className="eyebrow light">THE SIMPLE WAY</div><h2>How GngWar Works</h2><p>From “I need help” to “that feels better” in four easy steps.</p></div><div className="steps-grid">{[["01", "Choose a Service", "Find the right kind of help for your home."], ["02", "Select Duration & Time", "Pick a duration and time that works for you."], ["03", "Professional Arrives", "A trained professional comes to your doorstep."], ["04", "Service Completed", "Enjoy a home that feels looked after."]].map(([num, title, copy], i) => <div className="step" key={num} data-testid={`how-step-${num}`}><span className="step-num">{num}</span><div className="step-line" /> <h3>{title}</h3><p>{copy}</p>{i < 3 && <ArrowRight className="step-arrow" size={19} />}</div>)}</div></div></section>

      <section className="section why-section" data-testid="why-section"><div className="container why-grid"><div><div className="eyebrow">WHY GNGWAR</div><h2>Care you can<br /><em>feel good about.</em></h2><p className="lead-copy">A dependable helping hand for the tasks that keep your home running beautifully.</p><button className="text-link dark-link" onClick={() => openBooking()} data-testid="why-book-button">Find your service <ArrowRight size={17} /></button></div><div className="benefits-grid">{[[BadgeCheck, "Verified Professionals"], [ShieldCheck, "Transparent Pricing"], [Clock3, "Easy Booking"], [Star, "On-Time Service"], [Wrench, "Professional Service"], [MessageCircle, "Customer Support"]].map(([Icon, title]) => <div className="benefit" key={title} data-testid={`benefit-${title.toLowerCase().replaceAll(" ", "-")}`}><Icon /><span>{title}</span></div>)}</div></div></section>

      <section className="trust-band" data-testid="trust-section"><div className="container trust-content"><div><div className="eyebrow">THE GNGWAR PROMISE</div><h2>Reliable Service.<br /><em>Every Time.</em></h2><p>Your home deserves professional care.</p></div><div className="trust-items"><span><BadgeCheck /> Verified Professionals</span><span><TagIcon /> Transparent Pricing</span><span><ShieldCheck /> Secure Booking</span><span><MessageCircle /> Customer Support</span></div></div></section>

      <section className="section about-section" id="about" data-testid="about-section"><div className="container about-grid"><div className="about-number">01<span>/</span></div><div><div className="eyebrow">A LITTLE ABOUT US</div><h2>Home care that<br /><em>fits real life.</em></h2></div><div className="about-copy"><p>GngWar is a modern home-services platform designed to make everyday household services simple, convenient and accessible.</p><p>Discover a service, choose a suitable duration and time, and book professional help at your doorstep.</p><button className="button button-outline" onClick={() => document.getElementById("contact").scrollIntoView()} data-testid="learn-more-button">Learn More <ArrowRight size={17} /></button></div></div></section>

      <section className="cta-section" data-testid="cta-section"><div className="container cta-inner"><div><div className="eyebrow light">READY WHEN YOU ARE</div><h2>Need help around<br />your home?</h2></div><button className="button button-light" onClick={() => openBooking()} data-testid="cta-book-button">Book Your Service <ArrowRight size={17} /></button></div></section>

      <section className="section contact-section" id="contact" data-testid="contact-section"><div className="container contact-grid"><div><div className="eyebrow">GET IN TOUCH</div><h2>We’re here<br /><em>to help.</em></h2><p className="lead-copy">Have a question or need a hand choosing a service? Our support details will be available here soon.</p></div><div className="contact-list"><div><Phone /><span><b>Phone</b><small>Contact details coming soon</small></span></div><div><Mail /><span><b>Email</b><small>Support email coming soon</small></span></div><div><MapPin /><span><b>Service location</b><small>Service locations coming soon</small></span></div><div><MessageCircle /><span><b>Customer support</b><small>Support hours coming soon</small></span></div></div></div></section>
    </main>

    <footer className="footer" data-testid="footer"><div className="container footer-top"><div><Logo /><p>Your Home • Our Priority</p></div><div className="footer-links"><div><b>Explore</b><a href="#home" data-testid="footer-home">Home</a><a href="#services" data-testid="footer-services">Services</a><a href="#how-it-works" data-testid="footer-how-it-works">How It Works</a></div><div><b>Company</b><a href="#about" data-testid="footer-about">About Us</a><a href="#contact" data-testid="footer-contact">Contact</a><span data-testid="footer-privacy">Privacy Policy</span><span data-testid="footer-terms">Terms & Conditions</span></div></div><div className="socials"><b>Follow along</b><span><Instagram /><span data-testid="social-placeholder">Social links coming soon</span></span></div></div><div className="container footer-bottom"><span>© 2025 GngWar. Your home, our priority.</span><span>Made for everyday living.</span></div></footer>
    {booking && <BookingModal selected={booking} onClose={() => setBooking(null)} onConfirm={confirmBooking} />}
    {confirmation && <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="booking-confirmation"><div className="confirmation-modal"><div className="confirmation-icon"><Check /></div><div className="eyebrow">BOOKING REQUEST SAVED</div><h2>We’ve got it from here.</h2><p>Your request for <strong>{confirmation.service}</strong> is saved in this browser. A backend and payment step can be connected next.</p><div className="confirmation-details"><span>{confirmation.duration}</span><strong>₹{confirmation.price}</strong><span>{confirmation.date || "Date to be confirmed"}</span></div><button className="button button-dark full-button" onClick={() => setConfirmation(null)} data-testid="confirmation-done-button">Done <Check size={17} /></button></div></div>}
  </div>;
}

function ImageSlotIcon() { return <div className="slot-icon"><House size={18} /></div>; }
function TagIcon() { return <div className="tag-icon">₹</div>; }
export default App;