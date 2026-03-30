import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Home.css';
import SmartStaysLogo from '../components/SmartStaysLogo';

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'SmartStays - Slim toegangsbeheer voor vakantieverhuur';
    
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const isNative = localStorage.getItem('isNativeApp') === 'true';
    
    if (token && user && !isNative) {
      try {
        const userData = JSON.parse(user);
        if (userData.role === 'ADMIN') {
          navigate('/admin');
        } else if (userData.role === 'VERHUURDER') {
          navigate('/dashboard');
        }
      } catch (e) {}
    }
  }, [navigate]);

  const goToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="home-container">
      {/* Hero sectie met cloud afbeelding */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-logo">
            <img src="/logo.png" alt="SmartStays" className="hero-logo-img" />
          </div>
          <div className="smartstays-title-wrapper">
            <SmartStaysLogo className="hero-logo-text" />
          </div>
          <p className="tagline">Slim toegangsbeheer voor vakantieverhuur</p>
          <p className="description">
            Automatisch toegangbeheer voor Airbnb en Booking.com.<br />
            Beheer slimme sloten, boekingen en schoonmaakdiensten vanaf één platform.
          </p>
          <button onClick={goToLogin} className="cta-btn">Start nu</button>
        </div>
        <div className="hero-image">
          <img src="/cloud.png" alt="SmartStays cloud solution" className="cloud-image" />
        </div>
      </section>

      {/* Promotie banner */}
      <section className="promo-banner">
        <div className="promo-content">
          <div className="promo-text">
            <h3>€50 korting op je smart lock + gratis installatie!</h3>
            <p>Bij afname van SmartStays ontvang je een Smart Lock met €50 korting en laten wij het gratis voor je installeren.</p>
          </div>
          <div className="promo-buttons">
            <Link to="/contact" className="promo-btn">Vraag offerte aan</Link>
            <Link to="/pricing" className="promo-btn secondary">Ontdek aanbod</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <h2>Alles-in-één platform</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9V12C3.5 12.5 3 13 3 15V18C3 19.1 3.9 20 5 20H19C20.1 20 21 19.1 21 18V15C21 13 20.5 12.5 19 12V9C19 5.13 15.87 2 12 2Z" stroke="#1e88e5" strokeWidth="1.5" fill="none"/>
                <path d="M9 22L12 20L15 22" stroke="#1e88e5" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Automatische codes</h3>
            <p>Genereer unieke codes voor elke gast en schoonmaaksdienst om veiligheid te garanderen</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H20V20H4V4Z" stroke="#1e88e5" strokeWidth="1.5" fill="none"/>
                <path d="M8 8H16M8 12H16M8 16H12" stroke="#1e88e5" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Kalender integratie</h3>
            <p>Synchroniseer met Airbnb en Booking.com</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 21L21 3M8 3L5 6L8 9M16 15L19 18L22 15" stroke="#1e88e5" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="3" stroke="#1e88e5" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            <h3>Schoonmaakdienst planning</h3>
            <p>Schoonmaakmomenten worden automatisch beheerd op basis van boekingen</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="6" width="18" height="12" rx="2" stroke="#1e88e5" strokeWidth="1.5" fill="none"/>
                <path d="M21 10V14" stroke="#1e88e5" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Mobiele app</h3>
            <p>Beheer alles onderweg via je smartphone</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>&copy; 2025 SmartStays. Alle rechten voorbehouden.</p>
        <p>info@smartstays.be</p>
      </footer>
    </div>
  );
}

export default Home;