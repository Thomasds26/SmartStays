import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SmartStaysLogo from '../components/SmartStaysLogo';
import API_URL from '../config';
import './CleanerDashboard.css';

function CleanerDashboard() {
  const [user, setUser] = useState(null);
  const [openTasks, setOpenTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [myReserves, setMyReserves] = useState([]);
  const [personalCode, setPersonalCode] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [newPersonalCode, setNewPersonalCode] = useState('');
  const [confirmPersonalCode, setConfirmPersonalCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'SCHOONMAKER') {
      if (parsedUser.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
      return;
    }
    
    setUser(parsedUser);
    setPersonalCode(parsedUser.personalCode || '••••••');
    fetchData();
    document.title = 'SmartStays - Schoonmaker Dashboard';
  }, [navigate]);

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching data for cleaner...');
      
      const [openRes, myTasksRes, myReservesRes] = await Promise.all([
        axios.get(`${API_URL}/api/cleaning-tasks?status=OPEN&withDetails=true`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/my-tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/my-reserves`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      console.log('Open taken:', openRes.data.length);
      console.log('Mijn taken:', myTasksRes.data.length);
      console.log('Mijn reserves:', myReservesRes.data.length);
      
      setOpenTasks(openRes.data);
      setMyTasks(myTasksRes.data);
      setMyReserves(myReservesRes.data);
    } catch (error) {
      console.error('Fout bij ophalen data:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = async (taskId) => {
    if (window.confirm('Weet je zeker dat je deze taak wilt uitvoeren?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/api/cleaning-tasks/${taskId}/assign`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Taak succesvol toegewezen!', 'success');
        fetchData();
      } catch (error) {
        showToast(error.response?.data?.error || 'Fout bij toewijzen', 'error');
      }
    }
  };

  const handleCancelAssignment = async (taskId) => {
    if (window.confirm('Weet je zeker dat je je wilt afmelden voor deze taak? De eerste reserve wordt dan automatisch de nieuwe hoofdschoonmaker.')) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/api/cleaning-tasks/${taskId}/cancel-assignment`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Je bent afgemeld voor deze taak', 'success');
        fetchData();
      } catch (error) {
        showToast(error.response?.data?.error || 'Fout bij afmelden', 'error');
      }
    }
  };

  const handleReserveTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/cleaning-tasks/${taskId}/reserve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Je staat nu op de reservelijst!', 'success');
      fetchData();
    } catch (error) {
      showToast(error.response?.data?.error || 'Fout bij reserveren', 'error');
    }
  };

  const handleCancelReserve = async (reserveId) => {
    if (window.confirm('Weet je zeker dat je je reserve wilt annuleren?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/api/my-reserves/${reserveId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Reserve geannuleerd', 'success');
        fetchData();
      } catch (error) {
        showToast('Fout bij annuleren', 'error');
      }
    }
  };

  const validateCode = (code) => {
    if (!/^\d{6}$/.test(code)) {
      return 'Code moet exact 6 cijfers zijn';
    }
    return null;
  };

  const handleChangePersonalCode = async () => {
    const error = validateCode(newPersonalCode);
    if (error) {
      setCodeError(error);
      return;
    }
    
    if (newPersonalCode !== confirmPersonalCode) {
      setCodeError('Codes komen niet overeen');
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/api/cleaner/personal-code`, 
        { personalCode: newPersonalCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setPersonalCode(updatedUser.personalCode);
      
      setShowCodeModal(false);
      setNewPersonalCode('');
      setConfirmPersonalCode('');
      setCodeError('');
      showToast('Persoonlijke code is gewijzigd!', 'success');
    } catch (error) {
      setCodeError(error.response?.data?.error || 'Fout bij wijzigen code');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const isNative = localStorage.getItem('isNativeApp') === 'true';
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    if (isNative) {
      window.location.href = '/splash';
    } else {
      window.location.href = '/';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short'
    });
  };

  if (!user) return <div>Laden...</div>;

  return (
    <div className="cleaner-container">
      <nav className="cleaner-nav">
        <div className="nav-brand">
          <SmartStaysLogo className="nav-logo" />
        </div>
        <div className="nav-user">
          <span>Welkom, {user.name}</span>
          <button onClick={handleLogout} className="logout-btn">Uitloggen</button>
        </div>
      </nav>
      
      {toast.show && (
        <div className={`toast-message ${toast.type}`}>
          {toast.message}
        </div>
      )}
      
      <div className="cleaner-content">
        <div className="cleaner-header">
          <h1>Schoonmaker Dashboard</h1>
          <div className="tab-buttons">
            <button className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`} onClick={() => setActiveTab('available')}>
              Beschikbare taken ({openTasks.length})
            </button>
            <button className={`tab-btn ${activeTab === 'my-tasks' ? 'active' : ''}`} onClick={() => setActiveTab('my-tasks')}>
              Mijn taken ({myTasks.length})
            </button>
            <button className={`tab-btn ${activeTab === 'reserves' ? 'active' : ''}`} onClick={() => setActiveTab('reserves')}>
              Mijn reserves ({myReserves.length})
            </button>
            <button className={`tab-btn ${activeTab === 'my-code' ? 'active' : ''}`} onClick={() => setActiveTab('my-code')}>
              Mijn code
            </button>
          </div>
        </div>
        
        {loading && <div className="loading">Laden...</div>}
        
        {!loading && activeTab === 'available' && (
          <div className="tasks-grid">
            {openTasks.length === 0 ? (
              <div className="no-tasks">Geen beschikbare taken op dit moment</div>
            ) : (
              openTasks.map(task => {
                const startDate = new Date(task.scheduledAt);
                const endDate = task.cleaningEnd ? new Date(task.cleaningEnd) : startDate;
                const isPeriod = startDate.toDateString() !== endDate.toDateString();
                
                return (
                  <div key={task.id} className="task-card">
                    <div className="task-header">
                      <h3>{task.property_name}</h3>
                      <span className="task-status open">Beschikbaar</span>
                    </div>
                    <div className="task-details">
                      <p><strong>Schoonmaak periode:</strong> {isPeriod ? (
                        <>{formatDateOnly(task.scheduledAt)} - {formatDateOnly(task.cleaningEnd)}</>
                      ) : (
                        formatDate(task.scheduledAt)
                      )}</p>
                      <p><strong>Duur:</strong> {task.duration} minuten</p>
                      <p><strong>Adres:</strong> {task.address || 'Geen adres'}</p>
                      {task.notes && <p><strong>Notities:</strong> {task.notes}</p>}
                      <p><strong>Reserves:</strong> {task.reserve_count}/3</p>
                    </div>
                    <div className="task-actions">
                      <button onClick={() => handleAssignTask(task.id)} className="assign-btn">
                        Taak uitvoeren
                      </button>
                      <button onClick={() => handleReserveTask(task.id)} className="reserve-btn" disabled={task.reserve_count >= 3}>
                        {task.reserve_count >= 3 ? 'Reservelijst vol' : 'Als reserve'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        
        {!loading && activeTab === 'my-tasks' && (
          <div className="tasks-grid">
            {myTasks.length === 0 ? (
              <div className="no-tasks">Je hebt nog geen taken toegewezen</div>
            ) : (
              myTasks.map(task => {
                const startDate = new Date(task.scheduledAt);
                const endDate = task.cleaningEnd ? new Date(task.cleaningEnd) : startDate;
                const isPeriod = startDate.toDateString() !== endDate.toDateString();
                
                return (
                  <div key={task.id} className="task-card assigned">
                    <div className="task-header">
                      <h3>{task.property_name}</h3>
                      <span className="task-status assigned">Toegewezen</span>
                    </div>
                    <div className="task-details">
                      <p><strong>Schoonmaak periode:</strong> {isPeriod ? (
                        <>{formatDateOnly(task.scheduledAt)} - {formatDateOnly(task.cleaningEnd)}</>
                      ) : (
                        formatDate(task.scheduledAt)
                      )}</p>
                      <p><strong>Duur:</strong> {task.duration} minuten</p>
                      <p><strong>Adres:</strong> {task.address || 'Geen adres'}</p>
                      {task.notes && <p><strong>Notities:</strong> {task.notes}</p>}
                    </div>
                    <div className="task-actions">
                      <button onClick={() => handleCancelAssignment(task.id)} className="cancel-btn">
                        Afmelden
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        
        {!loading && activeTab === 'reserves' && (
          <div className="tasks-grid">
            {myReserves.length === 0 ? (
              <div className="no-tasks">Je staat nergens op de reservelijst</div>
            ) : (
              myReserves.map(reserve => {
                const startDate = new Date(reserve.scheduledAt);
                const endDate = reserve.cleaningEnd ? new Date(reserve.cleaningEnd) : startDate;
                const isPeriod = startDate.toDateString() !== endDate.toDateString();
                
                return (
                  <div key={reserve.id} className="task-card reserve">
                    <div className="task-header">
                      <h3>{reserve.property_name}</h3>
                      <span className="task-status reserve">Reserve #{reserve.position || '?'}</span>
                    </div>
                    <div className="task-details">
                      <p><strong>Schoonmaak periode:</strong> {isPeriod ? (
                        <>{formatDateOnly(reserve.scheduledAt)} - {formatDateOnly(reserve.cleaningEnd)}</>
                      ) : (
                        formatDate(reserve.scheduledAt)
                      )}</p>
                      <p><strong>Duur:</strong> {reserve.duration} minuten</p>
                      <p><strong>Adres:</strong> {reserve.address || 'Geen adres'}</p>
                      {reserve.cleaner_name && (
                        <p><strong>Toegewezen aan:</strong> {reserve.cleaner_name}</p>
                      )}
                    </div>
                    <div className="task-actions">
                      <button onClick={() => handleCancelReserve(reserve.id)} className="cancel-btn">
                        Annuleer reserve
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        
        {!loading && activeTab === 'my-code' && (
          <div className="code-section">
            <div className="code-card-large">
              <div className="code-header-large">
                <h3>Mijn persoonlijke code</h3>
                <p className="code-description">
                  Deze code gebruik je om toegang te krijgen tot de woningen waar je moet schoonmaken.
                  Je kunt deze code wijzigen wanneer je wilt.
                </p>
              </div>
              <div className="code-display">
                <div className="code-value-large">{personalCode}</div>
                <button onClick={() => setShowCodeModal(true)} className="change-code-btn-large">
                  Code wijzigen
                </button>
              </div>
              <div className="code-warning">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8V12M12 16H12.01M3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3C7.03 3 3 7.03 3 12Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <span>Deze code is persoonlijk en wordt niet gedeeld met anderen. Wijzig hem alleen als je zeker weet dat je de nieuwe code onthoudt.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal voor code wijzigen */}
      {showCodeModal && (
        <div className="modal-overlay" onClick={() => setShowCodeModal(false)}>
          <div className="modal code-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Persoonlijke code wijzigen</h2>
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
                <label>Nieuwe code (6 cijfers)</label>
                <input 
                  type="text" 
                  value={newPersonalCode} 
                  onChange={(e) => setNewPersonalCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                  placeholder="123456" 
                  maxLength="6"
                  className="code-input"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                />
              </div>
              <div className="form-group">
                <label>Herhaal code</label>
                <input 
                  type="text" 
                  value={confirmPersonalCode} 
                  onChange={(e) => setConfirmPersonalCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                  placeholder="123456" 
                  maxLength="6"
                  className="code-input"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                />
              </div>
              {codeError && <div className="error-message">{codeError}</div>}
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowCodeModal(false)} className="cancel-btn">Annuleren</button>
              <button onClick={handleChangePersonalCode} className="submit-btn">Code wijzigen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CleanerDashboard;