import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SmartStaysLogo from '../components/SmartStaysLogo';
import './Pricing.css';

function Pricing() {
  useEffect(() => {
    document.title = 'SmartStays - Aanbod en tarieven';
  }, []);

  const cleaningPrices = [
    { type: 'Studio / klein appartement', size: 'tot 50 m²', price: '€65' },
    { type: 'Appartement (1 slaapkamer)', size: 'tot 80 m²', price: '€80' },
    { type: 'Appartement / woning (2 slaapkamers)', size: 'tot 120 m²', price: '€95' },
    { type: 'Grote woning', size: 'tot 150 m²', price: '€110' },
    { type: 'Extra grote woning / villa', size: '150+ m²', price: 'Op maat' }
  ];

  const smartLocks = [
    {
      name: 'Nuki Smart Lock (3e generatie)',
      description: 'De slimste deurslot van Nuki. Automatisch ontgrendelen als je thuis komt.',
      price: '€249',
      features: ['Automatisch ontgrendelen', 'Toegang op afstand', 'Stemassistenten', '3 jaar garantie']
    },
    {
      name: 'Nuki Smart Lock Pro',
      description: 'Professionele versie met WiFi Bridge ingebouwd.',
      price: '€329',
      features: ['Alle functies van Smart Lock', 'Ingebouwde WiFi', 'Betere bereik', 'Integratie met systemen']
    },
    {
      name: 'Nuki Keypad',
      description: 'Digitale cijfercode toetsenbord voor toegang zonder telefoon.',
      price: '€89',
      features: ['6-cijferige codes', 'Gastcodes', 'Tijdelijke codes', 'Eenvoudige installatie']
    },
    {
      name: 'Nuki Fob',
      description: 'Sleutelhanger voor eenvoudige toegang.',
      price: '€49',
      features: ['Eén druk op de knop', 'Waterbestendig', 'Voor extra gebruikers', 'Batterij gaat jaren mee']
    }
  ];

  return (
    <div className="pricing-container">
      <nav className="pricing-nav">
        <div className="nav-brand">
          <SmartStaysLogo className="nav-logo" />
        </div>
        <Link to="/" className="back-home">Terug naar home</Link>
      </nav>

      <div className="pricing-content">
        <h1>Onze tarieven</h1>
        <p className="pricing-subtitle">
          Overzicht van onze schoonmaak tarieven en het Smart Lock aanbod.
          <br />Voor een exacte offerte komen wij vrijblijvend langs.
        </p>

        {/* Schoonmaak tarieven */}
        <section className="price-section">
          <h2>Schoonmaak tarieven</h2>
          <p className="section-description">
            Vaste prijzen per schoonmaakbeurt op basis van de grootte van je vakantiewoning.
          </p>
          
          <div className="price-table-container">
            <table className="price-table">
              <thead>
                <tr>
                  <th>Type accommodatie</th>
                  <th>Oppervlakte</th>
                  <th>Prijs per beurt</th>
                </tr>
              </thead>
              <tbody>
                {cleaningPrices.map((item, index) => (
                  <tr key={index}>
                    <td>{item.type}</td>
                    <td>{item.size}</td>
                    <td className="price-cell">{item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Smart Lock aanbod */}
        <section className="price-section">
          <h2>Smart Lock aanbod</h2>
          <p className="section-description">
            Bij afname van SmartStays ontvang je <strong>€50 korting</strong> op een Nuki Smart Lock.
            Wij installeren het gratis voor je.
          </p>

          <div className="smartlock-grid">
            {smartLocks.map((lock, index) => (
              <div key={index} className="smartlock-card">
                <h3>{lock.name}</h3>
                <p className="lock-description">{lock.description}</p>
                <div className="lock-price">{lock.price}</div>
                <ul className="lock-features">
                  {lock.features.map((feature, i) => (
                    <li key={i}>✓ {feature}</li>
                  ))}
                </ul>
                <div className="lock-discount">
                  Met SmartStays: <strong>{lock.price === '€249' ? '€199' : lock.price === '€329' ? '€279' : lock.price}</strong>
                  {lock.price !== '€49' && lock.price !== '€89' && <span className="discount-badge">-€50</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Offerte aanvraag */}
        <section className="offer-section">
          <h2>Vrijblijvende offerte aanvragen</h2>
          <p>
            Wil je weten wat de exacte kosten zijn voor jouw situatie?<br />
            We komen graag langs voor een vrijblijvende offerte. 
            Tijdens het bezoek kijken we naar jouw woning en bespreken we de mogelijkheden.
          </p>
          <Link to="/contact" className="offer-btn">Offerte aanvragen</Link>
        </section>
      </div>
    </div>
  );
}

export default Pricing;