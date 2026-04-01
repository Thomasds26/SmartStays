import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SmartStaysLogo from '../components/SmartStaysLogo';
import './Splash.css';

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'SmartStays';
    
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const isNative = localStorage.getItem('isNativeApp') === 'true';
    
    // Alleen als het echt een native app is, anders naar home
    if (!isNative) {
      navigate('/');
      return;
    }
    
    const timer = setTimeout(() => {
      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          if (user.role === 'ADMIN') {
            navigate('/admin');
          } else if (user.role === 'VERHUURDER') {
            navigate('/dashboard');
          } else if (user.role === 'SCHOONMAKER') {
            navigate('/cleaner');
          } else {
            navigate('/login');
          }
        } catch (e) {
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-container">
      <div className="splash-content">
        <div className="splash-logo">
          <img src="/logo.png" alt="SmartStays" className="splash-logo-img" />
        </div>
        <div className="splash-title">
          <SmartStaysLogo className="splash-logo-text" />
        </div>
        <div className="spinner"></div>
      </div>
    </div>
  );
}

export default Splash;