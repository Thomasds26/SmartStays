import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Admin.css';

function Admin() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [cleaningTasks, setCleaningTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newUser, setNewUser] = useState({ email: '', role: 'VERHUURDER' });
  const [newProperty, setNewProperty] = useState({ name: '', address: '', ownerId: '' });
  const [usersList, setUsersList] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filteredUsersList, setFilteredUsersList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'ADMIN') {
      if (parsedUser.role === 'SCHOONMAKER') {
        navigate('/cleaner');
      } else {
        navigate('/dashboard');
      }
      return;
    }
    
    setUser(parsedUser);
    fetchUsers();
    fetchProperties();
    fetchUsersList();
    fetchCleaningTasks();
    document.title = 'SmartStays - Admin Panel';
  }, [navigate]);

  useEffect(() => {
    let result = [...users];
    if (searchTerm) {
      result = result.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === 'createdAt') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredUsers(result);
  }, [users, searchTerm, sortConfig]);

  useEffect(() => {
    let result = [...properties];
    if (searchTerm) {
      result = result.filter(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.owner_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredProperties(result);
  }, [properties, searchTerm]);

  useEffect(() => {
    let result = [...usersList];
    if (userSearchTerm) {
      result = result.filter(u => 
        u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
      );
    }
    setFilteredUsersList(result);
  }, [usersList, userSearchTerm]);

  useEffect(() => {
    let result = [...cleaningTasks];
    if (searchTerm) {
      result = result.filter(t => 
        t.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredTasks(result);
  }, [cleaningTasks, searchTerm]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Fout bij ophalen gebruikers:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    }
  };

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/admin/properties', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(response.data);
    } catch (error) {
      console.error('Fout bij ophalen properties:', error);
    }
  };

  const fetchUsersList = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const verhuurders = response.data.filter(u => u.role === 'VERHUURDER');
      setUsersList(verhuurders);
      setFilteredUsersList(verhuurders);
    } catch (error) {
      console.error('Fout bij ophalen gebruikers:', error);
    }
  };

  const fetchCleaningTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/cleaning-tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCleaningTasks(response.data);
    } catch (error) {
      console.error('Fout bij ophalen taken:', error);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.role) {
      setMessage({ text: 'Email en rol zijn verplicht', type: 'error' });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3000/api/users', newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: response.data.message, type: 'success' });
      setShowUserModal(false);
      setNewUser({ email: '', role: 'VERHUURDER' });
      fetchUsers();
      fetchUsersList();
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    } catch (error) {
      setMessage({ text: error.response?.data?.error || 'Fout bij toevoegen', type: 'error' });
    }
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    if (!newProperty.name || !newProperty.ownerId) {
      setMessage({ text: 'Naam en verhuurder zijn verplicht', type: 'error' });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/admin/properties', newProperty, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: 'Woning succesvol toegevoegd', type: 'success' });
      setShowPropertyModal(false);
      setNewProperty({ name: '', address: '', ownerId: '' });
      setUserSearchTerm('');
      fetchProperties();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: error.response?.data?.error || 'Fout bij toevoegen', type: 'error' });
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: `${userName} is verwijderd`, type: 'success' });
      setDeleteConfirm(null);
      fetchUsers();
      fetchUsersList();
      fetchProperties();
      fetchCleaningTasks();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: error.response?.data?.error || 'Fout bij verwijderen', type: 'error' });
    }
  };

  const handleDeleteProperty = async (propertyId, propertyName) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/admin/properties/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: `"${propertyName}" is verwijderd`, type: 'success' });
      fetchProperties();
      fetchCleaningTasks();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: 'Fout bij verwijderen', type: 'error' });
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

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return (
        <span className="sort-icon">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      );
    }
    return (
      <span className="sort-icon">
        {sortConfig.direction === 'asc' ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 19L12 5M12 5L7 10M12 5L17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5L12 19M12 19L7 14M12 19L17 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) return <div>Laden...</div>;

  return (
    <div className="admin-container">
      <nav className="admin-nav">
        <div className="nav-brand">SmartStays</div>
        <div className="nav-user">
          <span>Welkom, {user.name}</span>
          <button onClick={handleLogout} className="logout-btn">Uitloggen</button>
        </div>
      </nav>
      
      <div className="admin-content">
        <div className="admin-header">
          <h1>Beheerpaneel</h1>
          <div className="tab-buttons">
            <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              Gebruikers
            </button>
            <button className={`tab-btn ${activeTab === 'properties' ? 'active' : ''}`} onClick={() => setActiveTab('properties')}>
              Woningen
            </button>
            <button className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
              Kalender
            </button>
          </div>
        </div>
        
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        
        <div className="search-bar">
          <input
            type="text"
            placeholder={`Zoeken op ${activeTab === 'users' ? 'naam, email, rol of ID...' : activeTab === 'properties' ? 'naam, verhuurder of adres...' : 'property of adres...'}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="clear-search">✖</button>
          )}
        </div>

        {activeTab === 'users' && (
          <>
            <div className="section-header">
              <h2>Gebruikers</h2>
              <button onClick={() => setShowUserModal(true)} className="add-btn">+ Nieuwe gebruiker</button>
            </div>
            
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} className="sortable">ID {getSortIcon('id')}</th>
                    <th onClick={() => handleSort('name')} className="sortable">Naam {getSortIcon('name')}</th>
                    <th onClick={() => handleSort('email')} className="sortable">Email {getSortIcon('email')}</th>
                    <th onClick={() => handleSort('role')} className="sortable">Rol {getSortIcon('role')}</th>
                    <th>Status</th>
                    <th>Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td className="id-cell">{u.id}</td>
                      <td>{u.name || '-'}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-badge role-${u.role.toLowerCase()}`}>
                          {u.role === 'SCHOONMAKER' ? 'Schoonmaker' : u.role === 'VERHUURDER' ? 'Verhuurder' : 'Admin'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${u.isActive ? 'status-active' : 'status-pending'}`}>
                          {u.isActive ? 'Actief' : 'Wacht op activatie'}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => setDeleteConfirm({ id: u.id, name: u.name || u.email, type: 'user' })} 
                          className="action-btn" 
                          disabled={u.id === user.id}
                        >
                          Verwijderen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <div className="no-results">Geen gebruikers gevonden</div>}
            </div>
          </>
        )}

        {activeTab === 'properties' && (
          <>
            <div className="section-header">
              <h2>Woningen</h2>
              <button onClick={() => setShowPropertyModal(true)} className="add-btn">+ Nieuwe woning</button>
            </div>
            
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Naam</th>
                    <th>Adres</th>
                    <th>Verhuurder</th>
                    <th>Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.address || '-'}</td>
                      <td>{p.owner_name || p.owner_email || '-'}</td>
                      <td>
                        <button onClick={() => handleDeleteProperty(p.id, p.name)} className="action-btn">
                          Verwijderen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProperties.length === 0 && <div className="no-results">Geen woningen gevonden</div>}
            </div>
          </>
        )}

        {activeTab === 'calendar' && (
          <>
            <div className="section-header">
              <h2>Schoonmaak kalender</h2>
              <p className="info-text">Taken worden automatisch gegenereerd op basis van boekingen uit Airbnb en Booking.com</p>
            </div>
            
            <div className="calendar-container">
              {filteredTasks.length === 0 ? (
                <div className="calendar-placeholder">
                  <h3>Geen schoonmaak taken</h3>
                  <p>Er zijn nog geen schoonmaak taken gegenereerd.</p>
                  <p className="placeholder-note">Taken verschijnen hier zodra er boekingen worden gesynchroniseerd met Airbnb of Booking.com.</p>
                </div>
              ) : (
                <div className="tasks-calendar">
                  {filteredTasks.map(task => (
                    <div key={task.id} className="calendar-task-card">
                      <div className="task-time">{formatDate(task.scheduledAt)}</div>
                      <div className="task-info">
                        <h4>{task.property_name}</h4>
                        <p>{task.address}</p>
                        <p className="task-duration">⏱️ {task.duration} minuten</p>
                      </div>
                      <div className="task-status-badge">
                        <span className={`status-badge ${task.status === 'OPEN' ? 'status-pending' : 'status-active'}`}>
                          {task.status === 'OPEN' ? 'Open' : 'Toegewezen'}
                        </span>
                        {task.cleaner_name && (
                          <span className="cleaner-name">{task.cleaner_name}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal nieuwe gebruiker */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nieuwe gebruiker uitnodigen</h2>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>✖</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label>Email *</label>
                <input 
                  type="email" 
                  value={newUser.email} 
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})} 
                  required 
                  placeholder="naam@email.com" 
                />
              </div>
              <div className="form-group">
                <label>Rol *</label>
                <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})}>
                  <option value="VERHUURDER">Verhuurder</option>
                  <option value="SCHOONMAKER">Schoonmaker</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowUserModal(false)} className="cancel-btn">Annuleren</button>
                <button type="submit" className="submit-btn">Uitnodiging versturen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nieuwe woning */}
      {showPropertyModal && (
        <div className="modal-overlay" onClick={() => setShowPropertyModal(false)}>
          <div className="modal property-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nieuwe woning toevoegen</h2>
              <button className="modal-close" onClick={() => setShowPropertyModal(false)}>✖</button>
            </div>
            <form onSubmit={handleAddProperty}>
              <div className="form-group">
                <label>Naam *</label>
                <input 
                  type="text" 
                  value={newProperty.name} 
                  onChange={(e) => setNewProperty({...newProperty, name: e.target.value})} 
                  required 
                  placeholder="Bijv. Zonnewende 12" 
                />
              </div>
              <div className="form-group">
                <label>Adres</label>
                <input 
                  type="text" 
                  value={newProperty.address} 
                  onChange={(e) => setNewProperty({...newProperty, address: e.target.value})} 
                  placeholder="Straat, nummer, stad" 
                />
              </div>
              <div className="form-group">
                <label>Verhuurder *</label>
                <input
                  type="text"
                  placeholder="Zoek op naam of email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="search-select-input"
                />
                
                {!newProperty.ownerId && userSearchTerm && (
                  <div className="select-dropdown">
                    {filteredUsersList.length === 0 && (
                      <div className="dropdown-empty">Geen verhuurders gevonden</div>
                    )}
                    {filteredUsersList.map(u => (
                      <div 
                        key={u.id}
                        className="dropdown-item"
                        onClick={() => {
                          setNewProperty({...newProperty, ownerId: u.id});
                          setUserSearchTerm(`${u.name || u.email}`);
                        }}
                      >
                        <div className="dropdown-name">{u.name || 'Geen naam'}</div>
                        <div className="dropdown-email">{u.email}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {!newProperty.ownerId && !userSearchTerm && (
                  <div className="select-dropdown">
                    <div className="dropdown-hint">Typ minimaal 1 teken om te zoeken</div>
                  </div>
                )}
                
                {newProperty.ownerId && (
                  <div className="selected-info">
                    <span>
                      Geselecteerd: {usersList.find(u => u.id === newProperty.ownerId)?.name || 
                                    usersList.find(u => u.id === newProperty.ownerId)?.email}
                    </span>
                    <button 
                      type="button"
                      className="deselect-btn"
                      onClick={() => {
                        setNewProperty({...newProperty, ownerId: ''});
                        setUserSearchTerm('');
                      }}
                    >
                      Verwijderen
                    </button>
                  </div>
                )}
              </div>
              
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowPropertyModal(false)} className="cancel-btn">Annuleren</button>
                <button type="submit" className="submit-btn">Toevoegen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete bevestiging */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bevestig verwijderen</h2>
            </div>
            <p>Weet je zeker dat je <strong>{deleteConfirm.name}</strong> wilt verwijderen?</p>
            <p className="delete-warning">Deze actie kan niet ongedaan worden gemaakt.</p>
            <div className="modal-buttons">
              <button onClick={() => setDeleteConfirm(null)} className="cancel-btn">Annuleren</button>
              <button 
                onClick={() => handleDeleteUser(deleteConfirm.id, deleteConfirm.name)} 
                className="delete-confirm-btn"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;