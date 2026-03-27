import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Splash.css';

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'SmartStays';
    
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const isNative = localStorage.getItem('isNativeApp') === 'true';
    
    setTimeout(() => {
      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          if (user.role === 'ADMIN') {
            navigate('/admin');
          } else if (user.role === 'VERHUURDER') {
            navigate('/dashboard');
          } else {
            navigate('/login');
          }
        } catch (e) {
          navigate('/login');
        }
      } else {
        // Niet ingelogd: altijd naar login voor native app
        navigate('/login');
      }
    }, 1500);
  }, [navigate]);

  return (
    <div className="splash-container">
      <div className="splash-content">
        <div className="splash-logo">
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="20" fill="#1e88e5"/>
            <text x="50" y="68" fontSize="48" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontWeight="bold">S</text>
          </svg>
        </div>
        <h1>SmartStays</h1>
        <div className="spinner"></div>
      </div>
    </div>
  );
}

export default Splash;