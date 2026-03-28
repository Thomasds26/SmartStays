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
  const [personalCode, setPersonalCode] = useState('');
  const [confirmPersonalCode, setConfirmPersonalCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('');

  useEffect(() => {
    document.title = 'SmartStays - Activeer account';
    
    const fetchUserRole = async () => {
      try {
        const response = await axios.post('http://localhost:3000/api/check-activation', { token });
        setRole(response.data.role);
      } catch (error) {
        setMessage('Ongeldige activatie link');
      }
    };
    fetchUserRole();
  }, [token]);

  const validateCode = (code) => {
    if (code.length === 0) return null;
    if (!/^\d{6}$/.test(code)) {
      return 'Code moet exact 6 cijfers zijn';
    }
    return null;
  };

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
    
    if (role === 'SCHOONMAKER') {
      // Check of code exact 6 cijfers is
      if (!personalCode || personalCode.length !== 6) {
        setMessage('Persoonlijke code moet exact 6 cijfers zijn');
        return;
      }
      
      const codeError = validateCode(personalCode);
      if (codeError) {
        setMessage(codeError);
        return;
      }
      
      if (personalCode !== confirmPersonalCode) {
        setMessage('Persoonlijke codes komen niet overeen');
        return;
      }
    }
    
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:3000/api/activate', {
        token,
        name,
        password,
        personalCode: role === 'SCHOONMAKER' ? personalCode : null
      });
      
      setMessage(response.data.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Activatie mislukt');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPersonalCode(value);
  };

  const handleConfirmPersonalCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setConfirmPersonalCode(value);
  };

  return (
    <div className="activate-container">
      <div className="activate-card">
        <div className="activate-header">
          <h1>SmartStays</h1>
          <p>Activeer je {role === 'SCHOONMAKER' ? 'schoonmaker' : ''} account</p>
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
          
          {role === 'SCHOONMAKER' && (
            <>
              <div className="form-group">
                <label>Persoonlijke code (exact 6 cijfers)</label>
                <input
                  type="text"
                  value={personalCode}
                  onChange={handlePersonalCodeChange}
                  required
                  placeholder="123456"
                  maxLength="6"
                  className="code-input"
                />
                <small className="code-hint">Vul exact 6 cijfers in</small>
              </div>
              
              <div className="form-group">
                <label>Herhaal persoonlijke code</label>
                <input
                  type="text"
                  value={confirmPersonalCode}
                  onChange={handleConfirmPersonalCodeChange}
                  required
                  placeholder="123456"
                  maxLength="6"
                  className="code-input"
                />
              </div>
            </>
          )}
          
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