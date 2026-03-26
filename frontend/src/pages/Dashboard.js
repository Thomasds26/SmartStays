import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }
    
    setUser(JSON.parse(userData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return <div>Laden...</div>;

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">SmartStays</div>
        <div className="nav-user">
          <span>Welkom, {user.name}</span>
          <button onClick={handleLogout} className="logout-btn">Uitloggen</button>
        </div>
      </nav>
      
      <div className="dashboard-content">
        <h1>Mijn Kalender</h1>
        <p className="subtitle">Overzicht van alle boekingen en kuismomenten</p>
        
        {/* Kalender komt hier */}
        <div className="calendar-placeholder">
          <p>📅 Kalender wordt hier weergegeven</p>
          <p className="placeholder-text">(Boekingen synchronisatie volgt later)</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;