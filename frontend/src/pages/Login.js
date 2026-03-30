import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Login.css';
import SmartStaysLogo from '../components/SmartStaysLogo';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'SmartStays - Inloggen';
    
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === 'ADMIN') {
          window.location.href = '/admin';
        } else if (user.role === 'SCHOONMAKER') {
          window.location.href = '/cleaner';
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
      const response = await axios.post('http://localhost:3000/api/login', {
        email,
        password
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        if (localStorage.getItem('isNativeApp') === null) {
          const urlParams = new URLSearchParams(window.location.search);
          const isNative = urlParams.get('native') === 'true';
          localStorage.setItem('isNativeApp', isNative ? 'true' : 'false');
        }
        
        if (response.data.user.role === 'ADMIN') {
          window.location.href = '/admin';
        } else if (response.data.user.role === 'SCHOONMAKER') {
          window.location.href = '/cleaner';
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
          <h1><SmartStaysLogo /></h1>
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