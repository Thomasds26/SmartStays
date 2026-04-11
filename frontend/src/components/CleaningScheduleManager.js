// components/CleaningScheduleManager.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import API_URL from '../config';

function CleaningScheduleManager({ propertyId, propertyName, userRole }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [cleaners, setCleaners] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(new Date().setHours(new Date().getHours() + 2)),
    cleanerId: ''
  });
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    fetchSchedules();
    fetchCleaners();
  }, [propertyId]);

  const showToastMessage = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/cleaning-schedules`, {
        params: { propertyId },
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedules(response.data);
    } catch (error) {
      console.error('Fout bij laden planningen:', error);
      showToastMessage('Kon planningen niet laden', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCleaners = async () => {
    try {
      const token = localStorage.getItem('token');
      // Alleen admins kunnen alle schoonmakers zien
      if (userRole === 'ADMIN') {
        const response = await axios.get(`${API_URL}/api/users`, {
          params: { role: 'SCHOONMAKER' },
          headers: { Authorization: `Bearer ${token}` }
        });
        setCleaners(response.data.filter(u => u.role === 'SCHOONMAKER'));
      }
    } catch (error) {
      console.error('Fout bij laden schoonmakers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.startDate || !formData.endDate) {
      showToastMessage('Vul alle verplichte velden in', 'error');
      return;
    }
    
    if (formData.startDate >= formData.endDate) {
      showToastMessage('Einddatum moet na startdatum zijn', 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      if (editingSchedule) {
        await axios.put(`${API_URL}/api/cleaning-schedules/${editingSchedule.id}`, {
          title: formData.title,
          description: formData.description,
          startDate: formData.startDate.toISOString(),
          endDate: formData.endDate.toISOString(),
          cleanerId: formData.cleanerId || null
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToastMessage('Planning bijgewerkt!', 'success');
      } else {
        await axios.post(`${API_URL}/api/cleaning-schedules`, {
          propertyId,
          title: formData.title,
          description: formData.description,
          startDate: formData.startDate.toISOString(),
          endDate: formData.endDate.toISOString(),
          cleanerId: formData.cleanerId || null
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToastMessage('Planning toegevoegd!', 'success');
      }
      
      resetForm();
      fetchSchedules();
    } catch (error) {
      console.error('Fout bij opslaan:', error);
      showToastMessage(error.response?.data?.error || 'Fout bij opslaan', 'error');
    }
  };

  const handleDelete = async (schedule) => {
    if (window.confirm(`Weet je zeker dat je "${schedule.title}" wilt verwijderen?`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/api/cleaning-schedules/${schedule.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToastMessage('Planning verwijderd!', 'success');
        fetchSchedules();
      } catch (error) {
        console.error('Fout bij verwijderen:', error);
        showToastMessage('Kon niet verwijderen', 'error');
      }
    }
  };

  const handleAssign = async (scheduleId, cleanerId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/cleaning-schedules/${scheduleId}/assign`, {
        cleanerId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToastMessage('Schoonmaker toegewezen!', 'success');
      fetchSchedules();
    } catch (error) {
      console.error('Fout bij toewijzen:', error);
      showToastMessage('Kon niet toewijzen', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startDate: new Date(),
      endDate: new Date(new Date().setHours(new Date().getHours() + 2)),
      cleanerId: ''
    });
    setEditingSchedule(null);
    setShowForm(false);
  };

  const editSchedule = (schedule) => {
    setFormData({
      title: schedule.title,
      description: schedule.description || '',
      startDate: new Date(schedule.startDate),
      endDate: new Date(schedule.endDate),
      cleanerId: schedule.cleanerId || ''
    });
    setEditingSchedule(schedule);
    setShowForm(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING': { class: 'status-pending', text: 'In afwachting' },
      'ASSIGNED': { class: 'status-assigned', text: 'Toegewezen' },
      'IN_PROGRESS': { class: 'status-progress', text: 'Bezig' },
      'COMPLETED': { class: 'status-completed', text: 'Voltooid' },
      'CANCELLED': { class: 'status-cancelled', text: 'Geannuleerd' }
    };
    const badge = badges[status] || badges['PENDING'];
    return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
  };

  return (
    <div className="cleaning-schedule-manager">
      {toast.show && (
        <div className={`toast-message ${toast.type}`}>
          {toast.message}
        </div>
      )}
      
      <div className="schedule-header">
        <h3>Schoonmaak Planning - {propertyName}</h3>
        <button onClick={() => setShowForm(!showForm)} className="add-schedule-btn">
          {showForm ? 'Annuleren' : '+ Nieuwe Planning'}
        </button>
      </div>
      
      {showForm && (
        <div className="schedule-form">
          <h4>{editingSchedule ? 'Planning Bewerken' : 'Nieuwe Schoonmaak Planning'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Titel *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Bijv. Eindschoonmaak, Tussentijdse schoonmaak"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Beschrijving</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Extra details over de schoonmaak..."
                rows="3"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Start Datum & Tijd *</label>
                <DatePicker
                  selected={formData.startDate}
                  onChange={(date) => setFormData({...formData, startDate: date})}
                  showTimeSelect
                  dateFormat="dd/MM/yyyy HH:mm"
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  className="datetime-picker"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Eind Datum & Tijd *</label>
                <DatePicker
                  selected={formData.endDate}
                  onChange={(date) => setFormData({...formData, endDate: date})}
                  showTimeSelect
                  dateFormat="dd/MM/yyyy HH:mm"
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  className="datetime-picker"
                  required
                />
              </div>
            </div>
            
            {userRole === 'ADMIN' && cleaners.length > 0 && (
              <div className="form-group">
                <label>Toewijzen aan schoonmaker (optioneel)</label>
                <select
                  value={formData.cleanerId}
                  onChange={(e) => setFormData({...formData, cleanerId: e.target.value})}
                >
                  <option value="">- Niet toewijzen -</option>
                  {cleaners.map(cleaner => (
                    <option key={cleaner.id} value={cleaner.id}>
                      {cleaner.name} ({cleaner.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="form-buttons">
              <button type="submit" className="submit-btn">
                {editingSchedule ? 'Bijwerken' : 'Toevoegen'}
              </button>
              <button type="button" onClick={resetForm} className="cancel-btn">
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="schedules-list">
        {loading ? (
          <div className="loading">Laden...</div>
        ) : schedules.length === 0 ? (
          <div className="empty-state">
            <p>Geen schoonmaak planningen gevonden</p>
            <p className="hint">Klik op "+ Nieuwe Planning" om er een toe te voegen</p>
          </div>
        ) : (
          <div className="schedule-items">
            {schedules.map(schedule => (
              <div key={schedule.id} className="schedule-item">
                <div className="schedule-item-header">
                  <div className="schedule-title">
                    <h4>{schedule.title}</h4>
                    {getStatusBadge(schedule.status)}
                  </div>
                  <div className="schedule-actions">
                    <button onClick={() => editSchedule(schedule)} className="icon-btn edit">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M17 3L21 7L7 21H3V17L17 3Z" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(schedule)} className="icon-btn delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 7H20M10 11V16M14 11V16M5 7L6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19L19 7" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </button>
                  </div>
                </div>
                
                {schedule.description && (
                  <p className="schedule-description">{schedule.description}</p>
                )}
                
                <div className="schedule-datetime">
                  <div className="datetime-item">
                    <strong>Start:</strong> {new Date(schedule.startDate).toLocaleString('nl-NL')}
                  </div>
                  <div className="datetime-item">
                    <strong>Eind:</strong> {new Date(schedule.endDate).toLocaleString('nl-NL')}
                  </div>
                </div>
                
                <div className="schedule-assignment">
                  {schedule.cleanerId ? (
                    <div className="assigned-cleaner">
                      <strong>Toegewezen aan:</strong> {schedule.cleaner_name}
                    </div>
                  ) : (
                    <div className="assign-section">
                      <select 
                        onChange={(e) => handleAssign(schedule.id, e.target.value)}
                        defaultValue=""
                        className="assign-select"
                      >
                        <option value="">- Wijs toe aan schoonmaker -</option>
                        {cleaners.map(cleaner => (
                          <option key={cleaner.id} value={cleaner.id}>
                            {cleaner.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="schedule-meta">
                    <small>Gemaakt door: {schedule.created_by_name}</small>
                    <small>Gemaakt op: {new Date(schedule.createdAt).toLocaleDateString('nl-NL')}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CleaningScheduleManager;