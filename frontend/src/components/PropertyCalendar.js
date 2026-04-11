// components/PropertyCalendar.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-datepicker/dist/react-datepicker.css';
import API_URL from '../config';
import './PropertyCalendar.css';

moment.locale('nl', {
  week: {
    dow: 0,  // Zondag als eerste dag van de week
  },
  months: 'januari_februari_maart_april_mei_juni_juli_augustus_september_oktober_november_december'.split('_'),
  monthsShort: 'jan_feb_maa_apr_mei_jun_jul_aug_sep_okt_nov_dec'.split('_'),
  weekdays: 'zondag_maandag_dinsdag_woensdag_donderdag_vrijdag_zaterdag'.split('_'),
  weekdaysShort: 'zo_ma_di_wo_do_vr_za'.split('_'),
  weekdaysMin: 'zo_ma_di_wo_do_vr_za'.split('_')
});

moment.updateLocale('nl', {
  longDateFormat: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'DD/MM/YYYY',
    LL: 'D MMMM YYYY',
    LLL: 'D MMMM YYYY HH:mm',
    LLLL: 'dddd D MMMM YYYY HH:mm'
  }
});

const localizer = momentLocalizer(moment);

const messages = {
  today: 'Vandaag',
  previous: 'Vorige',
  next: 'Volgende',
  month: 'Maand',
  week: 'Week',
  day: 'Dag',
  agenda: 'Agenda',
  date: 'Datum',
  time: 'Tijd',
  event: 'Afspraak',
  noEventsInRange: 'Geen afspraken in deze periode',
  showMore: total => `+${total} meer`
};

function PropertyCalendar({ propertyId, propertyName, userRole }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCleaningModal, setShowCleaningModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [cleanerList, setCleanerList] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(new Date().setHours(new Date().getHours() + 2)),
    cleanerId: ''
  });

const fetchCalendarData = useCallback(async () => {
  if (!propertyId) return;
  
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/api/calendar/${propertyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const formattedEvents = response.data.map(item => {
      if (item.type === 'booking') {
        // Originele check-out datum voor tekst
        const originalCheckOut = new Date(item.checkOut);
        
        // Einddatum voor visuele weergave (+1 dag)
        const visualEndDate = new Date(item.checkOut);
        visualEndDate.setDate(visualEndDate.getDate() + 1);
        
        return {
          id: item.id,
          title: `${item.guestName || 'Gast'} - ${item.platform}`,
          start: new Date(item.checkIn),
          end: visualEndDate,  // Voor de kalender visualisatie
          originalCheckOut: originalCheckOut,  // Originele datum voor tekst
          type: 'booking',
          backgroundColor: '#1e88e5',
          borderColor: '#1e88e5',
          textColor: 'white'
        };
      } else {
        return {
          id: item.id,
          title: item.title,
          description: item.description,
          start: new Date(item.startDate),
          end: new Date(item.endDate),
          type: 'cleaning',
          backgroundColor: '#4caf50',
          borderColor: '#4caf50',
          textColor: 'white',
          cleanerName: item.cleaner_name,
          status: item.status
        };
      }
    });
    
    setEvents(formattedEvents);
    setLoading(false);
  } catch (error) {
    console.error('Fout bij ophalen kalender:', error);
    setLoading(false);
  }
}, [propertyId]);

  const fetchCleaners = async () => {
    if (userRole !== 'ADMIN') return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const cleaners = response.data.filter(u => u.role === 'SCHOONMAKER');
      setCleanerList(cleaners);
    } catch (error) {
      console.error('Fout bij laden schoonmakers:', error);
    }
  };

  useEffect(() => {
    fetchCalendarData();
    fetchCleaners();
  }, [fetchCalendarData]);

  const handleSaveCleaning = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.startDate || !formData.endDate) {
      alert('Vul alle verplichte velden in');
      return;
    }
    
    if (formData.startDate >= formData.endDate) {
      alert('Einddatum moet na startdatum zijn');
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
        alert('Schoonmaak planning bijgewerkt!');
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
        alert('Schoonmaak planning toegevoegd!');
      }
      
      resetForm();
      fetchCalendarData();
    } catch (error) {
      console.error('Fout bij opslaan:', error);
      alert(error.response?.data?.error || 'Fout bij opslaan');
    }
  };

  const handleDeleteCleaning = async (scheduleId) => {
    if (!window.confirm('Weet je zeker dat je deze schoonmaak planning wilt verwijderen?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/cleaning-schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Schoonmaak planning verwijderd!');
      fetchCalendarData();
    } catch (error) {
      console.error('Fout bij verwijderen:', error);
      alert('Kon niet verwijderen');
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
    setShowCleaningModal(false);
  };

  const handleSelectSlot = ({ start, end }) => {
    setFormData({
      ...formData,
      title: 'Schoonmaak',
      startDate: start,
      endDate: end
    });
    setEditingSchedule(null);
    setShowCleaningModal(true);
  };

  const handleSelectEvent = (event) => {
    if (event.type === 'booking') {
      // Gebruik originalCheckOut als die bestaat, anders event.end
      const endDate = event.originalCheckOut || event.end;
      alert(`Boeking: ${event.title}\nVan: ${moment(event.start).format('DD-MM-YYYY HH:mm')}\nTot: ${moment(endDate).format('DD-MM-YYYY HH:mm')}`);
    } else {
      const startStr = moment(event.start).format('DD-MM-YYYY HH:mm');
      const endStr = moment(event.end).format('DD-MM-YYYY HH:mm');
      alert(`Schoonmaak taak: ${event.title}\nPeriode: ${startStr} - ${endStr}`);
    }
  };

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: event.backgroundColor,
        borderRadius: '4px',
        border: 'none',
        color: 'white',
        fontSize: '11px',
        padding: '2px 6px'
      }
    };
  };

  const CustomToolbar = (toolbar) => {
    const goToBack = () => toolbar.onNavigate('PREV');
    const goToNext = () => toolbar.onNavigate('NEXT');
    const goToToday = () => toolbar.onNavigate('TODAY');

    return (
      <div className="rbc-toolbar">
        <div className="rbc-btn-group">
          <button onClick={goToBack}>Vorige</button>
          <button onClick={goToToday}>Vandaag</button>
          <button onClick={goToNext}>Volgende</button>
        </div>
        <div className="rbc-toolbar-label">
          {moment(toolbar.date).format('MMMM YYYY')}
        </div>
        <div className="rbc-btn-group">
          <button onClick={() => toolbar.onView('day')} className={toolbar.view === 'day' ? 'rbc-active' : ''}>Dag</button>
          <button onClick={() => toolbar.onView('week')} className={toolbar.view === 'week' ? 'rbc-active' : ''}>Week</button>
          <button onClick={() => toolbar.onView('month')} className={toolbar.view === 'month' ? 'rbc-active' : ''}>Maand</button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="calendar-loading">Kalender laden...</div>;
  }

  return (
    <div className="property-calendar">
      <div className="calendar-header">
        <h3>Kalender - {propertyName}</h3>
        <button onClick={() => setShowCleaningModal(true)} className="add-cleaning-btn">
          + Schoonmaak toevoegen
        </button>
      </div>
      
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 550 }}
        messages={messages}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable={true}
        views={['day', 'week', 'month']}
        defaultView="month"
        view={currentView}
        date={currentDate}
        onNavigate={setCurrentDate}
        onView={setCurrentView}
        components={{ toolbar: CustomToolbar }}
        popup
        tooltipAccessor={(event) => {
          if (event.type === 'booking') {
            const endDate = event.originalCheckOut || event.end;
            return `${event.title}\n${moment(event.start).format('DD-MM-YYYY')} - ${moment(endDate).format('DD-MM-YYYY')}`;
          }
          return event.title;
        }}
      />
      
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color booking-color"></span>
          <span>Boeking</span>
        </div>
        <div className="legend-item">
          <span className="legend-color cleaning-color"></span>
          <span>Schoonmaak</span>
        </div>
      </div>

      {/* Modal voor schoonmaak toevoegen/bewerken */}
      {showCleaningModal && (
        <div className="modal-overlay" onClick={() => setShowCleaningModal(false)}>
          <div className="modal cleaning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSchedule ? 'Schoonmaak Bewerken' : 'Nieuwe Schoonmaak'}</h2>
              <button className="modal-close" onClick={() => setShowCleaningModal(false)}>✖</button>
            </div>
            <form onSubmit={handleSaveCleaning}>
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
                  placeholder="Extra details..."
                  rows="3"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Start *</label>
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
                  <label>Eind *</label>
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
              
              {userRole === 'ADMIN' && cleanerList.length > 0 && (
                <div className="form-group">
                  <label>Toewijzen aan schoonmaker (optioneel)</label>
                  <select
                    value={formData.cleanerId}
                    onChange={(e) => setFormData({...formData, cleanerId: e.target.value})}
                  >
                    <option value="">- Niet toewijzen -</option>
                    {cleanerList.map(cleaner => (
                      <option key={cleaner.id} value={cleaner.id}>
                        {cleaner.name} ({cleaner.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="modal-buttons">
                {editingSchedule && (
                  <button 
                    type="button" 
                    onClick={() => handleDeleteCleaning(editingSchedule.id)} 
                    className="delete-btn"
                  >
                    Verwijderen
                  </button>
                )}
                <button type="button" onClick={() => setShowCleaningModal(false)} className="cancel-btn">
                  Annuleren
                </button>
                <button type="submit" className="submit-btn">
                  {editingSchedule ? 'Bijwerken' : 'Toevoegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyCalendar;