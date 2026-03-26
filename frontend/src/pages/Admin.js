import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Admin.css';

function Admin() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'VERHUURDER',
    password: ''
  });
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
    if (parsedUser.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    
    setUser(parsedUser);
    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Fout bij ophalen gebruikers:', error);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/users', newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Gebruiker succesvol toegevoegd!');
      setShowForm(false);
      setNewUser({ email: '', name: '', role: 'VERHUURDER', password: '' });
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Fout bij toevoegen gebruiker');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return <div>Laden...</div>;

  return (
    <div className="admin-container">
      <nav className="admin-nav">
        <div className="nav-brand">SmartStays Admin</div>
        <div className="nav-user">
          <span>Welkom, {user.name}</span>
          <button onClick={handleLogout} className="logout-btn">Uitloggen</button>
        </div>
      </nav>
      
      <div className="admin-content">
        <div className="admin-header">
          <h1>Gebruikersbeheer</h1>
          <button onClick={() => setShowForm(!showForm)} className="add-btn">
            + Nieuwe gebruiker
          </button>
        </div>
        
        {message && <div className="success-message">{message}</div>}
        
        {showForm && (
          <form onSubmit={handleAddUser} className="user-form">
            <h3>Nieuwe gebruiker toevoegen</h3>
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="Naam"
              value={newUser.name}
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              required
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
            >
              <option value="VERHUURDER">Verhuurder</option>
              <option value="KUISER">Kuiser</option>
              <option value="ADMIN">Admin</option>
            </select>
            <input
              type="password"
              placeholder="Wachtwoord"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              required
            />
            <button type="submit">Toevoegen</button>
          </form>
        )}
        
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>Naam</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Aangemaakt</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span></td>
                  <td>{new Date(u.createdAt).toLocaleDateString('nl-NL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Admin;