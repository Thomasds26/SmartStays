import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'SmartStays - Inloggen';
    
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const isNative = localStorage.getItem('isNativeApp') === 'true';
    
    // Al ingelogd? Ga direct door
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === 'ADMIN') {
          window.location.href = '/admin';
        } else if (user.role === 'VERHUURDER') {
          window.location.href = '/dashboard';
        }
      } catch (e) {}
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://192.168.0.127:3000/api/login', {
        email,
        password
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Stel isNativeApp in als die nog niet bestaat
        if (localStorage.getItem('isNativeApp') === null) {
          const urlParams = new URLSearchParams(window.location.search);
          const isNative = urlParams.get('native') === 'true';
          localStorage.setItem('isNativeApp', isNative ? 'true' : 'false');
        }
        
        if (response.data.user.role === 'ADMIN') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Inloggen mislukt');
    } finally {
      setLoading(false);
    }
  };

  const isNative = localStorage.getItem('isNativeApp') === 'true';

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>SmartStays</h1>
          <p>Log in op je account</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="jouw@email.com"
            />
          </div>
          
          <div className="form-group">
            <label>Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" disabled={loading}>
            {loading ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>
        
        {/* Alleen voor web (niet native app) de link naar offerte */}
        {!isNative && (
          <div className="login-footer">
            <p className="no-account">
              Nog geen klant? <Link to="/contact" className="contact-link">Vraag een offerte aan</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;