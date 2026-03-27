import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Activate from './pages/Activate';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Contact from './pages/Contact';
import './App.css';

function App() {
  // Detecteer of het een mobiele app is (via URL parameter of user agent)
  const isMobileApp = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mobileParam = urlParams.get('mobile');
    if (mobileParam === 'true') return true;
    
    // Of detecteer via user agent (voor als de app in WebView draait)
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('smartstaysapp') || userAgent.includes('capacitor');
  };

  useEffect(() => {
    // Sla platform info op in localStorage
    localStorage.setItem('platform', isMobileApp() ? 'mobile' : 'web');
  }, []);

  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  const getUserRole = () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        return JSON.parse(user).role;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/activate/:token" element={<Activate />} />
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated() && getUserRole() === 'VERHUURDER' ? 
            <Dashboard /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/admin" 
          element={
            isAuthenticated() && getUserRole() === 'ADMIN' ? 
            <Admin /> : 
            <Navigate to="/login" />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;