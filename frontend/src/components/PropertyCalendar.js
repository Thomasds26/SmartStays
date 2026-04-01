import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import API_URL from '../config';
import './PropertyCalendar.css';

// Zet week op maandag als eerste dag en Nederlands, 24-uurs notatie
moment.locale('nl', {
  week: {
    dow: 1,
  },
  months: 'januari_februari_maart_april_mei_juni_juli_augustus_september_oktober_november_december'.split('_'),
  monthsShort: 'jan_feb_maa_apr_mei_jun_jul_aug_sep_okt_nov_dec'.split('_'),
  weekdays: 'zondag_maandag_dinsdag_woensdag_donderdag_vrijdag_zaterdag'.split('_'),
  weekdaysShort: 'zo_ma_di_wo_do_vr_za'.split('_'),
  weekdaysMin: 'zo_ma_di_wo_do_vr_za'.split('_')
});

// 24-uurs notatie
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

// Nederlandse vertaling voor kalender
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

function PropertyCalendar({ propertyId, propertyName }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchCalendarData = useCallback(async () => {
    if (!propertyId) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const [calendarRes, cleaningRes] = await Promise.all([
        axios.get(`${API_URL}/api/calendar/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/cleaning-tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      const bookingEvents = calendarRes.data.map(booking => ({
        id: booking.id,
        title: `${booking.guestName || 'Gast'} - ${booking.platform}`,
        start: new Date(booking.checkIn),
        end: new Date(booking.checkOut),
        type: 'booking',
        backgroundColor: '#1e88e5'
      }));
      
      const cleaningEvents = cleaningRes.data
        .filter(task => task.propertyId === propertyId)
        .map(task => ({
          id: `clean-${task.id}`,
          title: `Schoonmaak - ${task.duration} min`,
          start: new Date(task.scheduledAt),
          end: new Date(new Date(task.scheduledAt).getTime() + task.duration * 60000),
          type: 'cleaning',
          backgroundColor: '#4caf50'
        }));
      
      setEvents([...bookingEvents, ...cleaningEvents]);
      setLoading(false);
    } catch (error) {
      console.error('Fout bij ophalen kalender:', error);
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

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

  const handleSelectEvent = (event) => {
    if (event.type === 'booking') {
      alert(`Boeking: ${event.title}\nVan: ${moment(event.start).format('DD-MM-YYYY HH:mm')}\nTot: ${moment(event.end).format('DD-MM-YYYY HH:mm')}`);
    } else {
      alert(`Schoonmaak taak: ${event.title}\nDatum: ${moment(event.start).format('DD-MM-YYYY HH:mm')}`);
    }
  };

  const handleNavigate = (date) => {
    setCurrentDate(date);
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  // Formatteer de datum voor weergave (bijv. "april 2026")
  const formatMonthYear = (date) => {
    return moment(date).format('MMMM YYYY');
  };

  // Custom toolbar met maand/jaar label
  const CustomToolbar = (toolbar) => {
    const goToBack = () => toolbar.onNavigate('PREV');
    const goToNext = () => toolbar.onNavigate('NEXT');
    const goToToday = () => toolbar.onNavigate('TODAY');

    return (
      <div className="rbc-toolbar">
        <div className="rbc-btn-group">
          <button onClick={goToBack} className="rbc-button">Vorige</button>
          <button onClick={goToToday} className="rbc-button">Vandaag</button>
          <button onClick={goToNext} className="rbc-button">Volgende</button>
        </div>
        <div className="rbc-toolbar-label">
          {formatMonthYear(toolbar.date)}
        </div>
        <div className="rbc-btn-group">
          <button onClick={() => toolbar.onView('day')} className={toolbar.view === 'day' ? 'rbc-active' : ''}>
            Dag
          </button>
          <button onClick={() => toolbar.onView('week')} className={toolbar.view === 'week' ? 'rbc-active' : ''}>
            Week
          </button>
          <button onClick={() => toolbar.onView('month')} className={toolbar.view === 'month' ? 'rbc-active' : ''}>
            Maand
          </button>
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
        views={['day', 'week', 'month']}
        defaultView="month"
        view={currentView}
        date={currentDate}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        components={{
          toolbar: CustomToolbar
        }}
        popup
        tooltipAccessor={(event) => event.title}
      />
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color booking-color"></span>
          <span>Boeking</span>
        </div>
        <div className="legend-item">
          <span className="legend-color cleaning-color"></span>
          <span>Schoonmaak taak</span>
        </div>
      </div>
    </div>
  );
}

export default PropertyCalendar;