import React from 'react';
import './SmartStaysLogo.css';

function SmartStaysLogo({ className = '' }) {
  return (
    <span className={`smartstays-logo ${className}`}>
      <span className="smart">Smart</span>
      <span className="stays">Stays</span>
    </span>
  );
}

export default SmartStaysLogo;