import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CleanerDashboard.css';

function CleanerDashboard() {
  const [user, setUser] = useState(null);
  const [openTasks, setOpenTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [myReserves, setMyReserves] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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
    fetchData();
    document.title = 'SmartStays - Schoonmaker Dashboard';
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [openRes, myTasksRes, myReservesRes] = await Promise.all([
        axios.get('http://localhost:3000/api/cleaning-tasks?status=OPEN', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:3000/api/my-tasks', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:3000/api/my-reserves', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
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
        await axios.post(`http://localhost:3000/api/cleaning-tasks/${taskId}/assign`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Taak succesvol toegewezen!');
        fetchData();
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        alert(error.response?.data?.error || 'Fout bij toewijzen');
      }
    }
  };

  const handleReserveTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:3000/api/cleaning-tasks/${taskId}/reserve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Je staat nu op de reservelijst!');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      alert(error.response?.data?.error || 'Fout bij reserveren');
    }
  };

  const handleCancelReserve = async (reserveId) => {
    if (window.confirm('Weet je zeker dat je je reserve wilt annuleren?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3000/api/my-reserves/${reserveId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Reserve geannuleerd');
        fetchData();
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        alert('Fout bij annuleren');
      }
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

  if (!user) return <div>Laden...</div>;

  return (
    <div className="cleaner-container">
      <nav className="cleaner-nav">
        <div className="nav-brand">SmartStays</div>
        <div className="nav-user">
          <span>Welkom, {user.name}</span>
          <button onClick={handleLogout} className="logout-btn">Uitloggen</button>
        </div>
      </nav>
      
      <div className="cleaner-content">
        <div className="cleaner-header">
          <h1>Schoonmaker Dashboard</h1>
          <div className="tab-buttons">
            <button className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`} onClick={() => setActiveTab('available')}>
              Beschikbare taken
            </button>
            <button className={`tab-btn ${activeTab === 'my-tasks' ? 'active' : ''}`} onClick={() => setActiveTab('my-tasks')}>
              Mijn taken
            </button>
            <button className={`tab-btn ${activeTab === 'reserves' ? 'active' : ''}`} onClick={() => setActiveTab('reserves')}>
              Mijn reserves ({myReserves.length})
            </button>
          </div>
        </div>
        
        {message && <div className="success-message">{message}</div>}
        
        {loading && <div className="loading">Laden...</div>}
        
        {!loading && activeTab === 'available' && (
          <div className="tasks-grid">
            {openTasks.length === 0 ? (
              <div className="no-tasks">Geen beschikbare taken op dit moment</div>
            ) : (
              openTasks.map(task => (
                <div key={task.id} className="task-card">
                  <div className="task-header">
                    <h3>{task.property_name}</h3>
                    <span className="task-status open">Beschikbaar</span>
                  </div>
                  <div className="task-details">
                    <p><strong>Datum:</strong> {formatDate(task.scheduledAt)}</p>
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
              ))
            )}
          </div>
        )}
        
        {!loading && activeTab === 'my-tasks' && (
          <div className="tasks-grid">
            {myTasks.length === 0 ? (
              <div className="no-tasks">Je hebt nog geen taken toegewezen</div>
            ) : (
              myTasks.map(task => (
                <div key={task.id} className="task-card assigned">
                  <div className="task-header">
                    <h3>{task.property_name}</h3>
                    <span className="task-status assigned">Toegewezen</span>
                  </div>
                  <div className="task-details">
                    <p><strong>Datum:</strong> {formatDate(task.scheduledAt)}</p>
                    <p><strong>Duur:</strong> {task.duration} minuten</p>
                    <p><strong>Adres:</strong> {task.address || 'Geen adres'}</p>
                    {task.notes && <p><strong>Notities:</strong> {task.notes}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {!loading && activeTab === 'reserves' && (
          <div className="tasks-grid">
            {myReserves.length === 0 ? (
              <div className="no-tasks">Je staat nergens op de reservelijst</div>
            ) : (
              myReserves.map(reserve => (
                <div key={reserve.id} className="task-card reserve">
                  <div className="task-header">
                    <h3>{reserve.property_name}</h3>
                    <span className="task-status reserve">Reserve</span>
                  </div>
                  <div className="task-details">
                    <p><strong>Datum:</strong> {formatDate(reserve.scheduledAt)}</p>
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
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CleanerDashboard;