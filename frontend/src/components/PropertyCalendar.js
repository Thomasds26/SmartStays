import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import nlLocale from '@fullcalendar/core/locales/nl';
import './PropertyCalendar.css';

function PropertyCalendar({ propertyId, propertyName }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  // Fetch kalender data
  const fetchCalendarData = useCallback(async () => {
    if (!propertyId) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const [calendarRes, cleaningRes] = await Promise.all([
        axios.get(`http://localhost:3000/api/calendar/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:3000/api/cleaning-tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      const bookingEvents = calendarRes.data.map(booking => ({
        id: booking.id,
        title: `${booking.guestName || 'Gast'} - ${booking.platform}`,
        start: booking.checkIn,
        end: booking.checkOut,
        backgroundColor: '#1e88e5',
        borderColor: '#1e88e5',
        textColor: 'white',
        extendedProps: {
          type: 'booking',
          guestName: booking.guestName,
          platform: booking.platform
        }
      }));
      
      const cleaningEvents = cleaningRes.data
        .filter(task => task.propertyId === propertyId)
        .map(task => ({
          id: `clean-${task.id}`,
          title: `Schoonmaak - ${task.duration} min`,
          start: task.scheduledAt,
          end: new Date(new Date(task.scheduledAt).getTime() + task.duration * 60000),
          backgroundColor: '#4caf50',
          borderColor: '#4caf50',
          textColor: 'white',
          extendedProps: {
            type: 'cleaning',
            status: task.status,
            cleanerName: task.cleaner_name,
            duration: task.duration
          }
        }));
      
      setEvents([...bookingEvents, ...cleaningEvents]);
      setLoading(false);
    } catch (error) {
      console.error('Fout bij ophalen kalender:', error);
      setLoading(false);
    }
  }, [propertyId]);

  // WebSocket verbinding voor real-time updates
  useEffect(() => {
    if (!propertyId) return;
    
    const connectWebSocket = () => {
      wsRef.current = new WebSocket('ws://localhost:3002');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket verbonden');
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket bericht:', data);
        
        if (data.type === 'CALENDAR_SYNC' && data.data.propertyId === propertyId) {
          console.log('Real-time update ontvangen, kalender wordt ververst');
          fetchCalendarData();
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket verbinding verbroken, probeer opnieuw over 5 seconden');
        setTimeout(connectWebSocket, 5000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [propertyId, fetchCalendarData]);

  // Eerste lading
  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const handleEventClick = (info) => {
    const event = info.event;
    const props = event.extendedProps;
    
    if (props.type === 'booking') {
      alert(`Boeking: ${props.guestName}\nPlatform: ${props.platform}\nDatum: ${event.start.toLocaleDateString('nl-NL')} - ${event.end.toLocaleDateString('nl-NL')}`);
    } else if (props.type === 'cleaning') {
      alert(`Schoonmaak taak\nStatus: ${props.status === 'OPEN' ? 'Open' : 'Toegewezen'}\nDuur: ${props.duration} minuten\n${props.cleanerName ? `Schoonmaker: ${props.cleanerName}` : ''}`);
    }
  };

  if (loading) {
    return <div className="calendar-loading">Kalender laden...</div>;
  }

  return (
    <div className="property-calendar">
      <div className="calendar-header">
        <h3>Kalender - {propertyName}</h3>
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        locale={nlLocale}
        initialView="dayGridMonth"
        events={events}
        eventClick={handleEventClick}
        height="auto"
        weekends={true}
        nowIndicator={true}
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