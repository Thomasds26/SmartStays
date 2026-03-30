import React, { useState, useEffect } from 'react';
import SmartStaysLogo from '../components/SmartStaysLogo';
import './Contact.css';

function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'SmartStays - Contact';
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (message.length > 500) {
      setError('Bericht mag maximaal 500 tekens bevatten');
      return;
    }
    
    setError('');
    console.log('Offerte aanvraag:', { name, email, phone, message });
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
            <p>We nemen zo snel mogelijk contact met je op.</p>
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
          <p>Vraag een offerte aan</p>
        </div>
        
        <div className="promo-info">
          <div>
            <strong>€50 korting op je smart lock + gratis installatie!</strong>
            <p>Bij afname van SmartStays ontvang je een Nuki Smart Lock met korting en gratis installatie.</p>
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
            <label>Bericht</label>
            <textarea
              rows="4"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hoe kunnen we je helpen?"
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