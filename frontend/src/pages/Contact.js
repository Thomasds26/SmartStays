import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SmartStaysLogo from '../components/SmartStaysLogo';
import './Contact.css';

function Contact() {
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [packageType, setPackageType] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'SmartStays - Contact';
    
    // Check of er een pakket is meegegeven via URL
    const params = new URLSearchParams(location.search);
    const pkg = params.get('package');
    if (pkg) {
      setPackageType(pkg);
      setMessage(`Ik ben geïnteresseerd in het ${pkg} pakket.`);
    }
  }, [location]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (message.length > 500) {
      setError('Bericht mag maximaal 500 tekens bevatten');
      return;
    }
    
    setError('');
    console.log('Offerte aanvraag:', { name, email, phone, packageType, message });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  if (submitted) {
    return (
      <div className="contact-container">
        <div className="contact-card">
          <div className="contact-header">
            <h1><SmartStaysLogo /></h1>
            <p>Offerte aangevraagd</p>
          </div>
          <div className="success-message">
            <p>Bedankt voor je aanvraag!</p>
            <p>We nemen zo snel mogelijk contact met je op om een afspraak te maken.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-container">
      <div className="contact-card">
        <div className="contact-header">
          <h1><SmartStaysLogo /></h1>
          <p>Vraag een vrijblijvende offerte aan</p>
        </div>
        
        <div className="promo-info">
          <div>
            <strong>We komen langs voor een offerte!</strong>
            <p>Tijdens een vrijblijvend bezoek bekijken we jouw woning en bespreken we de mogelijkheden.</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Naam *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Telefoon</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>Adres (optioneel)</label>
            <input
              type="text"
              placeholder="Straat, nummer, stad"
            />
          </div>
          
          <div className="form-group">
            <label>Type woning *</label>
            <select required>
              <option value="">Selecteer type</option>
              <option value="studio">Studio / klein appartement (tot 50 m²)</option>
              <option value="appartement1">Appartement (1 slaapkamer, tot 80 m²)</option>
              <option value="appartement2">Appartement / woning (2 slaapkamers, tot 120 m²)</option>
              <option value="woning">Grote woning (tot 150 m²)</option>
              <option value="villa">Extra grote woning / villa (150+ m²)</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Bericht</label>
            <textarea
              rows="4"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Extra informatie over je woning of wensen..."
              maxLength="500"
            />
            <div className="char-counter">
              {message.length}/500 tekens
            </div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit">Offerte aanvragen</button>
        </form>
        
        <div className="contact-footer">
          <p>Of bel ons: <strong>+32 123 45 67 89</strong></p>
        </div>
      </div>
    </div>
  );
}

export default Contact;