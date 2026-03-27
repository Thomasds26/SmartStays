import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'SmartStays - Slim toegangsbeheer voor vakantieverhuur';
    
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
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
      {/* Hero sectie */}
      <section className="hero">
        <div className="hero-content">
          <h1>SmartStays</h1>
          <p className="tagline">Slim toegangsbeheer voor vakantieverhuur</p>
          <p className="description">
            Automatisch codes voor Airbnb en Booking.com.<br />
            Beheer slimme sloten, boekingen en kuisdiensten vanaf één platform.
          </p>
          <button onClick={goToLogin} className="cta-btn">Start nu</button>
        </div>
        <div className="hero-image">
          <div className="mockup">
            <div className="mockup-header">
              <span>SmartStays</span>
              <span className="mockup-badge">Demo</span>
            </div>
            <div className="mockup-content">
              <div className="calendar-demo">
                <div className="demo-date">📅 15-20 Maart</div>
                <div className="demo-guest">Gast: Jan Jansen</div>
              </div>
              <div className="lock-demo">
                <div className="demo-code">🔒 Code: 123456</div>
                <div className="demo-status">Actief tot 20/03</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promotie banner */}
      <section className="promo-banner">
        <div className="promo-content">
          <div className="promo-text">
            <h3>€50 korting op je smart lock + gratis installatie!</h3>
            <p>Bij afname van SmartStays ontvang je een Nuki Smart Lock met €50 korting en laten wij het gratis voor je installeren.</p>
          </div>
          <Link to="/contact" className="promo-btn">Vraag offerte aan</Link>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <h2>Alles-in-één platform</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔐</div>
            <h3>Automatische codes</h3>
            <p>Genereer unieke codes voor elke gast en kuisdienst</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Kalender integratie</h3>
            <p>Synchroniseer met Airbnb en Booking.com</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🧹</div>
            <h3>Kuisdienst planning</h3>
            <p>Plan en beheer kuismomenten automatisch</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
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