import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [currentCode] = useState('••••••');
  const [personalCodes, setPersonalCodes] = useState([]);
  const [batteryLevel] = useState(85);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showAddCodeModal, setShowAddCodeModal] = useState(false);
  const [editingCodeId, setEditingCodeId] = useState(null);
  const [editingCodeName, setEditingCodeName] = useState('');
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeValue, setNewCodeValue] = useState('');
  const [confirmCodeValue, setConfirmCodeValue] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'VERHUURDER') {
      navigate('/admin');
      return;
    }
    
    setUser(parsedUser);
    fetchProperties();
    fetchPersonalCodes();
    document.title = 'SmartStays - My Dashboard';
  }, [navigate]);

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/properties', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(response.data);
      if (response.data.length > 0) {
        setSelectedProperty(response.data[0]);
      }
    } catch (error) {
      console.error('Fout bij ophalen properties:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    }
  };

  const fetchPersonalCodes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/personal-codes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPersonalCodes(response.data);
    } catch (error) {
      console.error('Fout bij ophalen personal codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProperty = async (propertyId, currentName) => {
    const newName = prompt('Pas de naam van je woning aan:', currentName);
    if (newName && newName !== currentName) {
      try {
        const token = localStorage.getItem('token');
        await axios.put(`http://localhost:3000/api/properties/${propertyId}`, 
          { name: newName, address: '' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchProperties();
      } catch (error) {
        alert('Fout bij aanpassen naam');
      }
    }
  };

  const validateCode = (code) => {
    if (!/^\d{6}$/.test(code)) {
      return 'Code moet exact 6 cijfers zijn';
    }
    return null;
  };

  const handleAddCode = async () => {
    const error = validateCode(newCodeValue);
    if (error) {
      setCodeError(error);
      return;
    }
    
    if (newCodeValue !== confirmCodeValue) {
      setCodeError('Codes komen niet overeen');
      return;
    }
    
    if (personalCodes.length >= 4) {
      setCodeError('Maximaal 4 codes toegestaan');
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3000/api/personal-codes', {
        name: newCodeName || `Code ${personalCodes.length + 1}`,
        code: newCodeValue
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPersonalCodes([...personalCodes, response.data.code]);
      setShowAddCodeModal(false);
      setNewCodeName('');
      setNewCodeValue('');
      setConfirmCodeValue('');
      setCodeError('');
    } catch (error) {
      setCodeError(error.response?.data?.error || 'Fout bij toevoegen code');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCode = async () => {
    const error = validateCode(newCodeValue);
    if (error) {
      setCodeError(error);
      return;
    }
    
    if (newCodeValue !== confirmCodeValue) {
      setCodeError('Codes komen niet overeen');
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:3000/api/personal-codes/${editingCodeId}`, {
        name: editingCodeName || newCodeName,
        code: newCodeValue
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPersonalCodes(personalCodes.map(c => 
        c.id === editingCodeId ? response.data.code : c
      ));
      
      setShowCodeModal(false);
      setEditingCodeId(null);
      setEditingCodeName('');
      setNewCodeName('');
      setNewCodeValue('');
      setConfirmCodeValue('');
      setCodeError('');
    } catch (error) {
      setCodeError(error.response?.data?.error || 'Fout bij wijzigen code');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCode = async (codeId, codeName) => {
    if (window.confirm(`Weet je zeker dat je "${codeName}" wilt verwijderen?`)) {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3000/api/personal-codes/${codeId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setPersonalCodes(personalCodes.filter(c => c.id !== codeId));
      } catch (error) {
        alert('Fout bij verwijderen code');
      } finally {
        setLoading(false);
      }
    }
  };

  const openEditModal = (code) => {
    setEditingCodeId(code.id);
    setEditingCodeName(code.name);
    setNewCodeName(code.name);
    setNewCodeValue(code.code);
    setConfirmCodeValue(code.code);
    setCodeError('');
    setShowCodeModal(true);
  };

  const handleLogout = () => {
    const isNative = localStorage.getItem('isNativeApp') === 'true';
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    if (isNative) {
      // Native app: ga naar splash screen
      window.location.href = '/splash';
    } else {
      // Webapp: ga naar homepagina
      window.location.href = '/';
    }
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
      
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="sidebar-header">
            <h3>My Properties</h3>
          </div>
          <ul className="property-list">
            {properties.map(prop => (
              <li 
                key={prop.id} 
                className={`property-item ${selectedProperty?.id === prop.id ? 'active' : ''}`}
                onClick={() => setSelectedProperty(prop)}
              >
                <span className="property-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 9L12 3L21 9L19 11M5 9V19H9V13H15V19H19V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </span>
                <span className="property-name">{prop.name}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditProperty(prop.id, prop.name);
                  }}
                  className="edit-property-btn"
                  title="Naam aanpassen"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 3L21 7L7 21H3V17L17 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </button>
              </li>
            ))}
            {properties.length === 0 && (
              <li className="property-empty">
                <p>Geen properties</p>
                <p className="empty-hint">Neem contact op met de beheerder</p>
              </li>
            )}
          </ul>
        </aside>
        
        <main className="dashboard-main">
          <div className="main-header">
            <h1>{selectedProperty ? selectedProperty.name : 'My Calendar'}</h1>
            {selectedProperty && <span className="property-badge">Active property</span>}
          </div>
          
          <div className="calendar-section">
            <h2>Bookings</h2>
            <div className="calendar-placeholder">
              <p>Calendar</p>
              <p className="placeholder-text">Booking synchronization coming soon</p>
            </div>
          </div>
          
          <div className="codes-section">
            <h2>Access Codes</h2>
            
            <div className="code-card">
              <div className="code-header">
                <span className="code-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9V12C3.5 12.5 3 13 3 15V18C3 19.1 3.9 20 5 20H19C20.1 20 21 19.1 21 18V15C21 13 20.5 12.5 19 12V9C19 5.13 15.87 2 12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M9 22L12 20L15 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
                <span className="code-label">Current guest code</span>
              </div>
              <div className="code-value">{currentCode}</div>
              <div className="code-expiry">Expires after check-out</div>
            </div>
            
            <div className="personal-codes-header">
              <h3>Personal codes</h3>
              {personalCodes.length < 4 && (
                <button onClick={() => setShowAddCodeModal(true)} className="add-code-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Add code
                </button>
              )}
            </div>
            
            <div className="codes-grid">
              {personalCodes.map(code => (
                <div key={code.id} className="code-card personal-code-card">
                  <div className="code-header">
                    <span className="code-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      </svg>
                    </span>
                    <span className="code-label">{code.name}</span>
                    <div className="code-actions">
                      <button onClick={() => openEditModal(code)} className="icon-btn" title="Wijzigen">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17 3L21 7L7 21H3V17L17 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteCode(code.id, code.name)} className="icon-btn delete-icon" title="Verwijderen">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 7H20M10 11V16M14 11V16M5 7L6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19L19 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M9 7V4C9 3.4 9.4 3 10 3H14C14.6 3 15 3.4 15 4V7" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="code-value">{code.code}</div>
                </div>
              ))}
            </div>
            
            <div className="code-card battery-card">
              <div className="code-header">
                <span className="code-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M21 10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
                <span className="code-label">Battery status</span>
              </div>
              <div className="battery-level">
                <div className="battery-bar">
                  <div className={`battery-fill ${batteryLevel <= 20 ? 'low' : batteryLevel <= 50 ? 'medium' : 'high'}`} style={{ width: `${batteryLevel}%` }} />
                </div>
                <span className="battery-percentage">{batteryLevel}%</span>
              </div>
              {batteryLevel <= 20 && <div className="battery-warning">Battery low - replace soon</div>}
            </div>
          </div>
        </main>
      </div>

      {/* Modal voor code wijzigen */}
      {showCodeModal && (
        <div className="modal-overlay" onClick={() => setShowCodeModal(false)}>
          <div className="modal code-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Wijzig code</h2>
              <button className="modal-close" onClick={() => setShowCodeModal(false)}>✖</button>
            </div>
            <div className="modal-body">
              <div className="warning-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                  <path d="M12 8V12M12 16H12.01M3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3C7.03 3 3 7.03 3 12Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <span>Let op: Wijzig deze code alleen als je zeker weet dat je de nieuwe code onthoudt.</span>
              </div>
              <div className="form-group">
                <label>Naam</label>
                <input
                  type="text"
                  value={newCodeName}
                  onChange={(e) => setNewCodeName(e.target.value)}
                  placeholder="Bijv. Mijn code, Vrouw, Kind"
                />
              </div>
              <div className="form-group">
                <label>Nieuwe code (6 cijfers)</label>
                <input
                  type="text"
                  value={newCodeValue}
                  onChange={(e) => setNewCodeValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength="6"
                  className="code-input"
                />
              </div>
              <div className="form-group">
                <label>Herhaal code</label>
                <input
                  type="text"
                  value={confirmCodeValue}
                  onChange={(e) => setConfirmCodeValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength="6"
                  className="code-input"
                />
              </div>
              {codeError && <div className="error-message">{codeError}</div>}
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowCodeModal(false)} className="cancel-btn">Annuleren</button>
              <button onClick={handleEditCode} className="submit-btn">Opslaan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal voor nieuwe code toevoegen */}
      {showAddCodeModal && (
        <div className="modal-overlay" onClick={() => setShowAddCodeModal(false)}>
          <div className="modal code-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nieuwe code toevoegen</h2>
              <button className="modal-close" onClick={() => setShowAddCodeModal(false)}>✖</button>
            </div>
            <div className="modal-body">
              <div className="warning-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                  <path d="M12 8V12M12 16H12.01M3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3C7.03 3 3 7.03 3 12Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <span>Maximaal 4 codes toegestaan. Elke code moet 6 cijfers zijn.</span>
              </div>
              <div className="form-group">
                <label>Naam (optioneel)</label>
                <input
                  type="text"
                  value={newCodeName}
                  onChange={(e) => setNewCodeName(e.target.value)}
                  placeholder="Bijv. Vrouw, Kind, Schoonmoeder"
                />
              </div>
              <div className="form-group">
                <label>Code (6 cijfers)</label>
                <input
                  type="text"
                  value={newCodeValue}
                  onChange={(e) => setNewCodeValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength="6"
                  className="code-input"
                />
              </div>
              <div className="form-group">
                <label>Herhaal code</label>
                <input
                  type="text"
                  value={confirmCodeValue}
                  onChange={(e) => setConfirmCodeValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength="6"
                  className="code-input"
                />
              </div>
              {codeError && <div className="error-message">{codeError}</div>}
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowAddCodeModal(false)} className="cancel-btn">Annuleren</button>
              <button onClick={handleAddCode} className="submit-btn">Toevoegen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;