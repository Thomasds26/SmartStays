import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import SmartStaysLogo from './SmartStaysLogo';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isNative = localStorage.getItem('isNativeApp') === 'true';
  const isAuthenticated = localStorage.getItem('token') !== null;

  // Niet tonen in mobiele app of als gebruiker ingelogd is
  if (isNative || isAuthenticated) {
    return null;
  }

  const goToLogin = () => {
    navigate('/login');
  };

  // Bepaal welke link actief is
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <SmartStaysLogo className="nav-logo" />
        </Link>
        <div className="navbar-menu">
          <Link to="/" className={`navbar-link ${isActive('/') ? 'active' : ''}`}>
            Home
          </Link>
          <Link to="/pricing" className={`navbar-link ${isActive('/pricing') ? 'active' : ''}`}>
            Aanbod
          </Link>
          <Link to="/contact" className={`navbar-link ${isActive('/contact') ? 'active' : ''}`}>
            Afspraak
          </Link>
          <button onClick={goToLogin} className="navbar-login-btn">Log in</button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;