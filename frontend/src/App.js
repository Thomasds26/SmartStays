import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Splash from './pages/Splash';
import Activate from './pages/Activate';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Contact from './pages/Contact';
import './App.css';

function App() {
  // Detecteer of het een echte mobiele app is (geen browser)
  const isNativeMobileApp = () => {
    // Check via URL parameter (wordt gebruikt door de ingebouwde app)
    const urlParams = new URLSearchParams(window.location.search);
    const nativeParam = urlParams.get('native');
    if (nativeParam === 'true') return true;
    
    // Check via user agent voor Capacitor/Cordova/WebView
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('capacitor') || 
           userAgent.includes('cordova') || 
           userAgent.includes('smartstaysapp');
  };

  useEffect(() => {
    // Sla platform info op in localStorage
    const isNative = isNativeMobileApp();
    localStorage.setItem('isNativeApp', isNative ? 'true' : 'false');
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

  const isNative = localStorage.getItem('isNativeApp') === 'true';

  return (
    <Router>
      <Routes>
        {/* Home pagina alleen voor web (niet native app) */}
        {!isNative && <Route path="/" element={<Home />} />}
        
        {/* Voor native app: splash screen als startpagina */}
        {isNative && <Route path="/" element={<Splash />} />}
        
        <Route path="/splash" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/activate/:token" element={<Activate />} />
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated() && getUserRole() === 'VERHUURDER' ? 
            <Dashboard /> : 
            <Navigate to={isNative ? "/splash" : "/login"} />
          } 
        />
        <Route 
          path="/admin" 
          element={
            isAuthenticated() && getUserRole() === 'ADMIN' ? 
            <Admin /> : 
            <Navigate to={isNative ? "/splash" : "/login"} />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;