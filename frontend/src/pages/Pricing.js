import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SmartStaysLogo from '../components/SmartStaysLogo';
import './Pricing.css';

function Pricing() {
  useEffect(() => {
    document.title = 'SmartStays - Aanbod en tarieven';
  }, []);

  // Prijzen
  const prices = {
    lockGo: 199,
    bridge: 89,
    lockPro: 329,
    lockUltra: 399,
    keypad1: 79,
    keypad2: 137.90,
    opener: 115,
    fob: 49
  };

  // Smart Locks
  const smartLocks = [
    {
      name: 'Nuki Smart Lock Go + Bridge',
      description: 'Instapmodel. Geschikt voor basisgebruik. Bridge nodig voor afstandsbediening.',
      price: prices.lockGo + prices.bridge,
      features: ['Ingebouwde Bluetooth', 'Afstandsbediening via Bridge', 'Makkelijk te installeren', '3 jaar garantie']
    },
    {
      name: 'Nuki Smart Lock Pro',
      description: 'Alles-in-één met ingebouwde WiFi. Geen extra Bridge nodig.',
      price: prices.lockPro,
      features: ['Ingebouwde WiFi', 'Toegang op afstand', 'Automatisch ontgrendelen', 'Stemassistenten', '3 jaar garantie']
    },
    {
      name: 'Nuki Smart Lock Ultra',
      description: 'Premium model met Matter ondersteuning. Stillere werking.',
      price: prices.lockUltra,
      features: ['Matter ondersteuning', 'Thread technologie', 'Ingebouwde WiFi', 'Ultra-compact design', '3 jaar garantie']
    }
  ];

  // Smart Lock vergelijking
  const smartLockComparison = [
    { name: 'Ingebouwde WiFi', go: false, pro: true, ultra: true },
    { name: 'Toegang op afstand', go: 'via Bridge', pro: true, ultra: true },
    { name: 'Matter ondersteuning', go: false, pro: false, ultra: true },
    { name: 'Thread technologie', go: false, pro: false, ultra: true },
    { name: 'Stemassistenten', go: 'via Bridge', pro: true, ultra: true },
    { name: 'Automatisch ontgrendelen', go: false, pro: true, ultra: true },
    { name: 'Ultra-compact design', go: false, pro: false, ultra: true }
  ];

  // Keypads
  const keypads = [
    {
      name: 'Nuki Keypad',
      description: 'Digitale cijfercode toetsenbord. Gasten gebruiken een code zonder smartphone.',
      price: prices.keypad1,
      features: ['6-cijferige codes', 'Tijdelijke codes', 'Werkt via Bluetooth', 'Batterij gaat jaren mee']
    },
    {
      name: 'Nuki Keypad 2.0',
      description: 'Keypad met vingerafdrukscanner. Nog snellere toegang.',
      price: prices.keypad2,
      features: ['6-cijferige codes', 'Vingerafdrukscanner', 'Tijdelijke codes', 'WiFi ondersteuning', 'Premium afwerking']
    }
  ];

  // Keypad vergelijking
  const keypadComparison = [
    { name: '6-cijferige codes', keypad1: true, keypad2: true },
    { name: 'Vingerafdrukscanner', keypad1: false, keypad2: true },
    { name: 'WiFi ondersteuning', keypad1: false, keypad2: true },
    { name: 'Tijdelijke codes', keypad1: true, keypad2: true }
  ];

  // Accessoires
  const accessories = [
    { name: 'Nuki Opener', price: prices.opener, description: 'Voor gemeenschappelijke voordeur in appartementsgebouwen.' },
    { name: 'Nuki Fob', price: prices.fob, description: 'Sleutelhanger voor extra gebruikers.' }
  ];

  // Combo packs
  const comboPacks = [
    {
      name: 'Starter Pack',
      items: ['Nuki Smart Lock Go + Bridge', 'Nuki Keypad'],
      price: prices.lockGo + prices.bridge + prices.keypad1,
      savings: 20
    },
    {
      name: 'Pro Pack',
      items: ['Nuki Smart Lock Pro', 'Nuki Keypad 2.0'],
      price: prices.lockPro + prices.keypad2,
      savings: 30,
      recommended: true
    },
    {
      name: 'Ultra Pack',
      items: ['Nuki Smart Lock Ultra', 'Nuki Keypad 2.0'],
      price: prices.lockUltra + prices.keypad2,
      savings: 40
    }
  ];

  const newCustomerDiscount = 50;

  return (
    <div className="pricing-container">
      <nav className="pricing-nav">
        <div className="nav-brand">
          <SmartStaysLogo className="nav-logo" />
        </div>
        <Link to="/" className="back-home">Terug naar home</Link>
      </nav>

      <div className="pricing-content">
        <h1>Ons aanbod</h1>
        <p className="pricing-subtitle">
          SmartStays abonnement: <strong>€4,99 per maand</strong> — automatische codes, kalender integratie en schoonmaak planning.
        </p>

        {/* Nieuwe klanten korting - blauwe banner */}
        <div className="discount-banner">
          <div className="discount-text">
            <strong>Nieuwe klanten ontvangen €{newCustomerDiscount} korting op hun Smart Lock</strong>
            <p className="discount-note">Deze korting wordt later verrekend op de factuur.</p>
          </div>
        </div>

        {/* Smart Locks */}
        <section className="product-section">
          <h2>Smart Locks</h2>
          <div className="products-grid">
            {smartLocks.map((lock, index) => (
              <div key={index} className="product-card">
                <h3>{lock.name}</h3>
                <p className="product-description">{lock.description}</p>
                <div className="product-price">€{lock.price.toFixed(2)}</div>
                <ul className="product-features">
                  {lock.features.map((feature, i) => (
                    <li key={i}>✓ {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Smart Lock vergelijkingstabel */}
          <div className="comparison-section">
            <h3>Vergelijking Smart Locks</h3>
            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Functie</th>
                    <th>Smart Lock Go + Bridge</th>
                    <th>Smart Lock Pro</th>
                    <th>Smart Lock Ultra</th>
                  </tr>
                </thead>
                <tbody>
                  {smartLockComparison.map((feature, index) => (
                    <tr key={index}>
                      <td className="feature-name">{feature.name}</td>
                      <td className="feature-value">
                        {feature.go === true ? (
                          <svg className="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : feature.go === false ? (
                          <svg className="cross-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <span className="via-text">{feature.go}</span>
                        )}
                      </td>
                      <td className={`feature-value ${feature.pro ? 'yes' : 'no'}`}>
                        {feature.pro ? (
                          <svg className="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        ) : (
                          <svg className="cross-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        )}
                      </td>
                      <td className={`feature-value ${feature.ultra ? 'yes' : 'no'}`}>
                        {feature.ultra ? (
                          <svg className="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        ) : (
                          <svg className="cross-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Keypads - met essentieel badge */}
        <section className="product-section">
          <h2>Keypads <span className="essential-badge">essentieel</span></h2>
          <p className="section-description">
            Een keypad geeft gasten de mogelijkheid om met een code binnen te komen, zonder smartphone.
          </p>
          
          <div className="products-grid two-columns">
            {keypads.map((keypad, index) => (
              <div key={index} className="product-card">
                <h3>{keypad.name}</h3>
                <p className="product-description">{keypad.description}</p>
                <div className="product-price">€{keypad.price.toFixed(2)}</div>
                <ul className="product-features">
                  {keypad.features.map((feature, i) => (
                    <li key={i}>✓ {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Keypad vergelijkingstabel */}
          <div className="comparison-section">
            <h3>Vergelijking Keypads</h3>
            <div className="comparison-table-wrapper">
              <table className="comparison-table small">
                <thead>
                  <tr>
                    <th>Functie</th>
                    <th>Keypad</th>
                    <th>Keypad 2.0</th>
                  </tr>
                </thead>
                <tbody>
                  {keypadComparison.map((feature, index) => (
                    <tr key={index}>
                      <td className="feature-name">{feature.name}</td>
                      <td className={`feature-value ${feature.keypad1 ? 'yes' : 'no'}`}>
                        {feature.keypad1 ? (
                          <svg className="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        ) : (
                          <svg className="cross-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        )}
                      </td>
                      <td className={`feature-value ${feature.keypad2 ? 'yes' : 'no'}`}>
                        {feature.keypad2 ? (
                          <svg className="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        ) : (
                          <svg className="cross-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Accessoires */}
        <section className="product-section">
          <h2>Accessoires <span className="optional-badge">optioneel</span></h2>
          <div className="products-grid two-columns">
            {accessories.map((item, index) => (
              <div key={index} className="product-card">
                <h3>{item.name}</h3>
                <p className="product-description">{item.description}</p>
                <div className="product-price">€{item.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Combo Packs */}
        <section className="product-section">
          <h2>Combo Packs</h2>
          <div className="combo-grid">
            {comboPacks.map((pack, index) => (
              <div key={index} className={`combo-card ${pack.recommended ? 'recommended' : ''}`}>
                {pack.recommended && <div className="recommended-badge">Aanbevolen</div>}
                <h3>{pack.name}</h3>
                <div className="combo-items">
                  {pack.items.map((item, i) => (
                    <span key={i} className="combo-item">{item}</span>
                  ))}
                </div>
                <div className="combo-prices">
                  <span className="original-price">€{(pack.price + pack.savings).toFixed(2)}</span>
                  <span className="combo-price">€{pack.price.toFixed(2)}</span>
                </div>
                <div className="combo-savings">Bespaar €{pack.savings.toFixed(2)}</div>
                <Link to="/contact" className="combo-btn">Adviesgesprek</Link>
              </div>
            ))}
          </div>
        </section>

        {/* Schoonmaak info */}
        <div className="cleaning-info">
          <h3>Schoonmaakdienst</h3>
          <p>
            De schoonmaak van jouw vakantiewoning wordt bepaald op basis van het type en de grootte van de woning.
            Tijdens een vrijblijvend bezoek kijken we naar jouw woning, bespreken we de mogelijkheden en maken we een passende offerte.
          </p>
        </div>

        {/* Adviesgesprek */}
        <div className="offer-section">
          <h2>Adviesgesprek aanvragen</h2>
          <p>We komen langs, bekijken je woning en bespreken alle opties.</p>
          <Link to="/contact" className="offer-btn">Adviesgesprek</Link>
        </div>
      </div>
    </div>
  );
}

export default Pricing;