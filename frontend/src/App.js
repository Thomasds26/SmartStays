import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Splash from './pages/Splash';
import Activate from './pages/Activate';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import CleanerDashboard from './pages/CleanerDashboard';
import Contact from './pages/Contact';
import SmartStaysLogo from './components/SmartStaysLogo';
import './App.css';

function App() {
  const isNativeMobileApp = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const nativeParam = urlParams.get('native');
    if (nativeParam === 'true') return true;
    
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('capacitor') || 
           userAgent.includes('cordova') || 
           userAgent.includes('smartstaysapp');
  };

  useEffect(() => {
    localStorage.setItem('isNativeApp', isNativeMobileApp() ? 'true' : 'false');
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
        {!isNative && <Route path="/" element={<Home />} />}
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
          path="/cleaner" 
          element={
            isAuthenticated() && getUserRole() === 'SCHOONMAKER' ? 
            <CleanerDashboard /> : 
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