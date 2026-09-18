import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import QuickStrip from "@/components/QuickStrip";
import Services from "@/components/Services";
import HowItWorks from "@/components/HowItWorks";
import WhyGngWar from "@/components/WhyGngWar";
import TrustBand from "@/components/TrustBand";
import About from "@/components/About";
import CTA from "@/components/CTA";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";
import AuthModal from "@/components/AuthModal";
import MyBookings from "@/pages/MyBookings";
import AdminDashboard from "@/pages/AdminDashboard";
import "@/App.css";

function Home() {
  const [booking, setBooking] = useState(null);
  const [authMode, setAuthMode] = useState(null);

  const openBooking = (service = null) => {
    setBooking(service || { name: "", duration: "60 Minutes" });
  };

  return (
    <div className="site-shell" data-testid="gngwar-app">
      <Navbar
        onOpenBooking={openBooking}
        onOpenAuth={(m) => setAuthMode(m || "login")}
      />
      <main>
        <Hero onBook={openBooking} />
        <QuickStrip />
        <Services onBook={openBooking} />
        <HowItWorks />
        <WhyGngWar onBook={openBooking} />
        <TrustBand />
        <About />
        <CTA onBook={openBooking} />
        <Contact />
      </main>
      <Footer />

      {booking && (
        <BookingModal
          selected={booking}
          onClose={() => setBooking(null)}
        />
      )}
      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSwitchMode={setAuthMode}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
