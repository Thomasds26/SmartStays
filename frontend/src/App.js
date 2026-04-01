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
import Pricing from './pages/Pricing';
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
    // Alleen als er nog geen platform is opgeslagen, of als we expliciet willen resetten
    const existingPlatform = localStorage.getItem('isNativeApp');
    const urlNative = new URLSearchParams(window.location.search).get('native');
    
    if (urlNative === 'true') {
      localStorage.setItem('isNativeApp', 'true');
    } else if (urlNative === 'false') {
      localStorage.setItem('isNativeApp', 'false');
    } else if (!existingPlatform) {
      localStorage.setItem('isNativeApp', isNativeMobileApp() ? 'true' : 'false');
    }
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
        {/* Webapp routes */}
        {!isNative && (
          <>
            <Route path="/" element={<Home />} />
            {/* Splash bestaat niet in webapp, redirect naar home */}
            <Route path="/splash" element={<Navigate to="/" />} />
          </>
        )}
        
        {/* Native app routes */}
        {isNative && (
          <>
            <Route path="/" element={<Splash />} />
            <Route path="/splash" element={<Splash />} />
            {/* Home bestaat niet in native app, redirect naar splash */}
            <Route path="/home" element={<Navigate to="/" />} />
          </>
        )}
        
        {/* Gedeelde routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/activate/:token" element={<Activate />} />
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated() && getUserRole() === 'VERHUURDER' ? 
            <Dashboard /> : 
            <Navigate to={isNative ? "/" : "/login"} />
          } 
        />
        <Route 
          path="/cleaner" 
          element={
            isAuthenticated() && getUserRole() === 'SCHOONMAKER' ? 
            <CleanerDashboard /> : 
            <Navigate to={isNative ? "/" : "/login"} />
          } 
        />
        <Route 
          path="/admin" 
          element={
            isAuthenticated() && getUserRole() === 'ADMIN' ? 
            <Admin /> : 
            <Navigate to={isNative ? "/" : "/login"} />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;