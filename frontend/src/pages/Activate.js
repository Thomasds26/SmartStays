import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Activate.css';

function Activate() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'SmartStays - Activeer account';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !password) {
      setMessage('Vul alle velden in');
      return;
    }
    
    if (password !== confirmPassword) {
      setMessage('Wachtwoorden komen niet overeen');
      return;
    }
    
    if (password.length < 6) {
      setMessage('Wachtwoord moet minimaal 6 tekens bevatten');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:3000/api/activate', {
        token,
        name,
        password
      });
      
      setMessage(response.data.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Activatie mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="activate-container">
      <div className="activate-card">
        <div className="activate-header">
          <h1>SmartStays</h1>
          <p>Activeer je account</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Volledige naam</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Jan Jansens"
            />
          </div>
          
          <div className="form-group">
            <label>Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Minimaal 6 tekens"
            />
          </div>
          
          <div className="form-group">
            <label>Herhaal wachtwoord</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          
          {message && <div className="message">{message}</div>}
          
          <button type="submit" disabled={loading}>
            {loading ? 'Bezig...' : 'Account activeren'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Activate;