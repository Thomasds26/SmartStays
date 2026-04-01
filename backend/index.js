const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const ical = require('ical');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'smartstays-secret-key-2024';

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

const pool = new Pool({
  user: 'thomasdeschepper',
  host: 'localhost',
  database: 'smartstays',
  port: 5432,
});

// ============ MIDDLEWARE ============
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Geen toegang. Niet ingelogd.' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Ongeldige of verlopen token' });
  }
};

const checkActiveUser = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT "isActive", role FROM "User" WHERE id = $1',
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Gebruiker niet gevonden' });
    }
    
    if (!result.rows[0].isActive) {
      return res.status(403).json({ error: 'Account is niet geactiveerd. Check je email.' });
    }
    
    req.userRole = result.rows[0].role;
    next();
  } catch (error) {
    console.error('Error checking active user:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const checkAdmin = (req, res, next) => {
  if (req.userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Geen toegang. Alleen voor admins.' });
  }
  next();
};

const checkOwnerOrAdmin = (req, res, next) => {
  if (req.userRole !== 'ADMIN' && req.userRole !== 'VERHUURDER') {
    return res.status(403).json({ error: 'Geen toegang. Alleen voor verhuurders en admins.' });
  }
  next();
};

// ============ PUBLIC ENDPOINTS ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SmartStays API werkt' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email en wachtwoord zijn verplicht' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, name, role, password, "isActive", "personalCode" FROM "User" WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Ongeldige email of wachtwoord' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account nog niet geactiveerd. Check je email.' });
    }

    if (user.role !== 'ADMIN' && user.role !== 'VERHUURDER' && user.role !== 'SCHOONMAKER') {
      return res.status(403).json({ error: 'Geen toegang.' });
    }

    if (password !== user.password) {
      return res.status(401).json({ error: 'Ongeldige email of wachtwoord' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

app.post('/api/check-activation', async (req, res) => {
  const { token } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT role FROM "User" WHERE "activationToken" = $1 AND "isActive" = false',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Ongeldige activatie link' });
    }
    
    res.json({ role: result.rows[0].role });
  } catch (error) {
    console.error('Error checking activation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/activate', async (req, res) => {
  const { token, name, password, personalCode } = req.body;

  if (!token || !name || !password) {
    return res.status(400).json({ error: 'Alle velden zijn verplicht' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, role FROM "User" WHERE "activationToken" = $1 AND "isActive" = false',
      [token]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Ongeldige of verlopen activatie link' });
    }
    
    if (user.role === 'SCHOONMAKER') {
      if (!personalCode || personalCode.length !== 6 || !/^\d{6}$/.test(personalCode)) {
        return res.status(400).json({ error: 'Persoonlijke code moet exact 6 cijfers zijn' });
      }
      
      await pool.query(
        'UPDATE "User" SET name = $1, password = $2, "personalCode" = $3, "isActive" = true, "activationToken" = NULL WHERE id = $4',
        [name, password, personalCode, user.id]
      );
    } else {
      await pool.query(
        'UPDATE "User" SET name = $1, password = $2, "isActive" = true, "activationToken" = NULL WHERE id = $3',
        [name, password, user.id]
      );
    }

    res.json({ success: true, message: 'Account succesvol geactiveerd! Je kunt nu inloggen.' });
  } catch (error) {
    console.error('Activate error:', error);
    res.status(500).json({ error: 'Activatie mislukt' });
  }
});

// ============ ADMIN ENDPOINTS ============
app.get('/api/users', verifyToken, checkActiveUser, checkAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, "isActive", "createdAt" FROM "User" ORDER BY "createdAt" DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Fout bij ophalen gebruikers:', error);
    res.status(500).json({ error: 'Kon gebruikers niet ophalen' });
  }
});

app.post('/api/users', verifyToken, checkActiveUser, checkAdmin, async (req, res) => {
  const { email, role } = req.body;
  
  if (!email || !role) {
    return res.status(400).json({ error: 'Email en rol zijn verplicht' });
  }
  
  try {
    const existingUser = await pool.query(
      'SELECT id FROM "User" WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Dit emailadres is al in gebruik' });
    }
    
    const activationToken = crypto.randomBytes(32).toString('hex');
    
    const result = await pool.query(
      'INSERT INTO "User" (id, email, role, "activationToken", "isActive", "createdAt") VALUES (gen_random_uuid()::text, $1, $2, $3, false, NOW()) RETURNING id, email, role, "isActive"',
      [email, role, activationToken]
    );
    
    console.log(`\n========== ACTIVATIE LINK ==========`);
    console.log(`Email: ${email}`);
    console.log(`Rol: ${role}`);
    console.log(`Link: http://localhost:3001/activate/${activationToken}`);
    console.log(`=====================================\n`);
    
    res.json({ 
      success: true, 
      user: result.rows[0],
      message: `Gebruiker toegevoegd. Activatie link: /activate/${activationToken.substring(0, 8)}...`
    });
  } catch (error) {
    console.error('Fout bij toevoegen gebruiker:', error);
    res.status(500).json({ error: 'Gebruiker kon niet worden toegevoegd' });
  }
});

app.put('/api/users/:id', verifyToken, checkActiveUser, checkAdmin, async (req, res) => {
  const userId = req.params.id;
  const { name, email, role } = req.body;
  
  if (!name && !email && !role) {
    return res.status(400).json({ error: 'Minstens één veld om te updaten' });
  }
  
  try {
    // Check of gebruiker bestaat
    const userExists = await pool.query(
      'SELECT id FROM "User" WHERE id = $1',
      [userId]
    );
    
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }
    
    // Bouw de update query dynamisch
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (role) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    
    values.push(userId);
    
    const result = await pool.query(
      `UPDATE "User" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, name, role, "isActive", "createdAt"`,
      values
    );
    
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Fout bij updaten gebruiker:', error);
    res.status(500).json({ error: 'Kon gebruiker niet updaten' });
  }
});

app.delete('/api/users/:id', verifyToken, checkActiveUser, checkAdmin, async (req, res) => {
  const userIdToDelete = req.params.id;
  
  try {
    const userExists = await pool.query(
      'SELECT id FROM "User" WHERE id = $1',
      [userIdToDelete]
    );
    
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }
    
    if (req.userId === userIdToDelete) {
      return res.status(400).json({ error: 'Je kunt jezelf niet verwijderen' });
    }
    
    await pool.query('DELETE FROM "Property" WHERE "ownerId" = $1', [userIdToDelete]);
    await pool.query('DELETE FROM "PersonalCode" WHERE "userId" = $1', [userIdToDelete]);
    await pool.query('DELETE FROM "CleaningTask" WHERE "cleanerId" = $1', [userIdToDelete]);
    await pool.query('DELETE FROM "CleaningReserve" WHERE "cleanerId" = $1', [userIdToDelete]);
    await pool.query('DELETE FROM "User" WHERE id = $1', [userIdToDelete]);
    
    res.json({ success: true, message: 'Gebruiker en bijbehorende gegevens verwijderd' });
  } catch (error) {
    console.error('Fout bij verwijderen:', error);
    res.status(500).json({ error: 'Kon gebruiker niet verwijderen: ' + error.message });
  }
});

app.get('/api/admin/properties', verifyToken, checkActiveUser, checkAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name, p.address, p."ownerId", 
             p."cleaningDuration",
             p."airbnbIcalUrl",
             p."bookingIcalUrl",
             u.email as owner_email, u.name as owner_name,
             p."createdAt"
      FROM "Property" p
      LEFT JOIN "User" u ON p."ownerId" = u.id
      ORDER BY p."createdAt" DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Fout bij ophalen properties:', error);
    res.status(500).json({ error: 'Kon properties niet ophalen' });
  }
});

app.post('/api/admin/properties', verifyToken, checkActiveUser, checkAdmin, async (req, res) => {
  const { name, address, ownerId, cleaningDuration, airbnbIcalUrl, bookingIcalUrl } = req.body;
  
  if (!name || !ownerId) {
    return res.status(400).json({ error: 'Naam en verhuurder zijn verplicht' });
  }
  
  try {
    const ownerCheck = await pool.query(
      'SELECT id FROM "User" WHERE id = $1 AND role = $2',
      [ownerId, 'VERHUURDER']
    );
    
    if (ownerCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Verhuurder niet gevonden' });
    }
    
    const result = await pool.query(
      `INSERT INTO "Property" (id, name, address, "ownerId", "cleaningDuration", "airbnbIcalUrl", "bookingIcalUrl", "createdAt") 
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING id, name, address, "ownerId", "cleaningDuration", "airbnbIcalUrl", "bookingIcalUrl"`,
      [name, address || null, ownerId, cleaningDuration || 90, airbnbIcalUrl || null, bookingIcalUrl || null]
    );
    
    // Start synchronisatie als er iCal URLs zijn
    if (airbnbIcalUrl) {
      await syncCalendarEvents(result.rows[0].id, 'AIRBNB', airbnbIcalUrl);
    }
    if (bookingIcalUrl) {
      await syncCalendarEvents(result.rows[0].id, 'BOOKING', bookingIcalUrl);
    }
    
    res.json({ success: true, property: result.rows[0] });
  } catch (error) {
    console.error('Fout bij toevoegen property:', error);
    res.status(500).json({ error: 'Property kon niet worden toegevoegd' });
  }
});

app.put('/api/admin/properties/:id', verifyToken, checkActiveUser, checkAdmin, async (req, res) => {
  const propertyId = req.params.id;
  const { name, address, ownerId, cleaningDuration, airbnbIcalUrl, bookingIcalUrl } = req.body;
  
  try {
    // Check of property bestaat
    const propertyExists = await pool.query(
      'SELECT id FROM "Property" WHERE id = $1',
      [propertyId]
    );
    
    if (propertyExists.rows.length === 0) {
      return res.status(404).json({ error: 'Property niet gevonden' });
    }
    
    // Bouw de update query dynamisch
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(address);
    }
    if (ownerId !== undefined) {
      updates.push(`"ownerId" = $${paramIndex++}`);
      values.push(ownerId);
    }
    if (cleaningDuration !== undefined) {
      updates.push(`"cleaningDuration" = $${paramIndex++}`);
      values.push(cleaningDuration);
    }
    if (airbnbIcalUrl !== undefined) {
      updates.push(`"airbnbIcalUrl" = $${paramIndex++}`);
      values.push(airbnbIcalUrl || null);
    }
    if (bookingIcalUrl !== undefined) {
      updates.push(`"bookingIcalUrl" = $${paramIndex++}`);
      values.push(bookingIcalUrl || null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Geen velden om te updaten' });
    }
    
    values.push(propertyId);
    
    const result = await pool.query(
      `UPDATE "Property" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    // Start synchronisatie als iCal URLs gewijzigd zijn
    if (airbnbIcalUrl !== undefined && airbnbIcalUrl) {
      await syncCalendarEvents(propertyId, 'AIRBNB', airbnbIcalUrl);
    }
    if (bookingIcalUrl !== undefined && bookingIcalUrl) {
      await syncCalendarEvents(propertyId, 'BOOKING', bookingIcalUrl);
    }
    
    res.json({ success: true, property: result.rows[0] });
  } catch (error) {
    console.error('Fout bij updaten property:', error);
    res.status(500).json({ error: 'Property kon niet worden bijgewerkt' });
  }
});

app.delete('/api/admin/properties/:id', verifyToken, checkActiveUser, checkAdmin, async (req, res) => {
  const propertyId = req.params.id;
  
  try {
    await pool.query('DELETE FROM "Booking" WHERE "propertyId" = $1', [propertyId]);
    await pool.query('DELETE FROM "CleaningTask" WHERE "propertyId" = $1', [propertyId]);
    await pool.query('DELETE FROM "Integration" WHERE "propertyId" = $1', [propertyId]);
    await pool.query('DELETE FROM "CalendarEvent" WHERE "propertyId" = $1', [propertyId]);
    await pool.query('DELETE FROM "Property" WHERE id = $1', [propertyId]);
    res.json({ success: true, message: 'Property verwijderd' });
  } catch (error) {
    console.error('Fout bij verwijderen property:', error);
    res.status(500).json({ error: 'Kon property niet verwijderen' });
  }
});

// ============ KALENDER INTEGRATIE ============

// Genereer schoonmaak taken
const generateCleaningTasksForProperty = async (propertyId) => {
  try {
    const bookings = await pool.query(
      `SELECT ce.* FROM "CalendarEvent" ce 
       WHERE ce."propertyId" = $1 
       AND ce.status = 'ACTIVE' 
       AND ce."checkOut" >= CURRENT_DATE
       ORDER BY ce."checkIn" ASC`,
      [propertyId]
    );
    
    if (bookings.rows.length === 0) return;
    
    const property = await pool.query(
      'SELECT "cleaningDuration" FROM "Property" WHERE id = $1',
      [propertyId]
    );
    const cleaningDuration = property.rows[0]?.cleaningDuration || 90;
    
    await pool.query(
      'DELETE FROM "CleaningTask" WHERE "propertyId" = $1 AND "scheduledAt" >= CURRENT_DATE',
      [propertyId]
    );
    
    for (let i = 0; i < bookings.rows.length; i++) {
      const currentBooking = bookings.rows[i];
      const checkOut = new Date(currentBooking.checkOut);
      
      let cleaningStart = new Date(checkOut);
      cleaningStart.setHours(12, 0, 0, 0);
      
      await pool.query(
        `INSERT INTO "CleaningTask" (id, "propertyId", "scheduledAt", duration, status, "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW())`,
        [propertyId, cleaningStart, cleaningDuration, 'OPEN']
      );
    }
    
    console.log(`Schoonmaak taken gegenereerd voor property ${propertyId}`);
  } catch (error) {
    console.error('Fout bij genereren schoonmaak taken:', error);
  }
};

// WebSocket voor real-time updates
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3002 });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected, total clients:', clients.size);
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected, total clients:', clients.size);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

const broadcastUpdate = (type, data) => {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Synchroniseer kalender events
const syncCalendarEvents = async (propertyId, platform, icalUrl) => {
  if (!icalUrl) return { success: false, error: 'Geen iCal URL' };
  
  try {
    const response = await fetch(icalUrl);
    const icalData = await response.text();
    const events = ical.parseICS(icalData);
    
    let newCount = 0;
    let updatedCount = 0;
    
    for (const eventId in events) {
      const event = events[eventId];
      if (event.type !== 'VEVENT') continue;
      
      const externalId = event.uid || eventId;
      const checkIn = new Date(event.start);
      const checkOut = new Date(event.end);
      const guestName = event.summary || 'Gast';
      
      const existing = await pool.query(
        'SELECT id FROM "CalendarEvent" WHERE "externalId" = $1 AND platform = $2',
        [externalId, platform]
      );
      
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO "CalendarEvent" (id, "externalId", "propertyId", platform, "guestName", "checkIn", "checkOut", status, "createdAt", "updatedAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [externalId, propertyId, platform, guestName, checkIn, checkOut, 'ACTIVE']
        );
        newCount++;
      } else {
        await pool.query(
          `UPDATE "CalendarEvent" SET "guestName" = $1, "checkIn" = $2, "checkOut" = $3, "updatedAt" = NOW()
           WHERE "externalId" = $4 AND platform = $5`,
          [guestName, checkIn, checkOut, externalId, platform]
        );
        updatedCount++;
      }
    }
    
    await generateCleaningTasksForProperty(propertyId);
    
    broadcastUpdate('CALENDAR_SYNC', { propertyId, platform, newCount, updatedCount });
    
    console.log(`Sync voltooid voor ${platform}: ${newCount} nieuw, ${updatedCount} geüpdatet`);
    return { success: true, newCount, updatedCount };
  } catch (error) {
    console.error(`Fout bij synchronisatie van ${platform}:`, error);
    return { success: false, error: error.message };
  }
};

// Synchroniseer alle properties
const syncAllProperties = async () => {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Geplande synchronisatie gestart...`);
    
    const properties = await pool.query(
      'SELECT id, "airbnbIcalUrl", "bookingIcalUrl" FROM "Property"'
    );
    
    for (const property of properties.rows) {
      if (property.airbnbIcalUrl) {
        await syncCalendarEvents(property.id, 'AIRBNB', property.airbnbIcalUrl);
      }
      if (property.bookingIcalUrl) {
        await syncCalendarEvents(property.id, 'BOOKING', property.bookingIcalUrl);
      }
    }
    
    console.log(`[${new Date().toLocaleTimeString()}] Synchronisatie voltooid`);
  } catch (error) {
    console.error('Fout bij geplande synchronisatie:', error);
  }
};

// Start automatische synchronisatie (elke minuut)
setTimeout(() => {
  syncAllProperties();
  setInterval(syncAllProperties, 60 * 1000);
}, 5000);

// Haal kalender events op
app.get('/api/calendar/:propertyId', verifyToken, checkActiveUser, async (req, res) => {
  const { propertyId } = req.params;
  const { start, end } = req.query;
  
  try {
    let query = `
      SELECT ce.*, p.name as property_name
      FROM "CalendarEvent" ce
      JOIN "Property" p ON ce."propertyId" = p.id
      WHERE ce."propertyId" = $1 AND ce.status = 'ACTIVE'
    `;
    const params = [propertyId];
    
    if (start) {
      query += ` AND ce."checkOut" >= $${params.length + 1}`;
      params.push(start);
    }
    if (end) {
      query += ` AND ce."checkIn" <= $${params.length + 1}`;
      params.push(end);
    }
    
    query += ` ORDER BY ce."checkIn" ASC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Fout bij ophalen kalender:', error);
    res.status(500).json({ error: 'Kon kalender niet ophalen' });
  }
});

// ============ VERHUURDER ENDPOINTS ============
app.get('/api/properties', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, address, "createdAt" FROM "Property" WHERE "ownerId" = $1 ORDER BY "createdAt" DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Fout bij ophalen properties:', error);
    res.status(500).json({ error: 'Kon properties niet ophalen' });
  }
});

app.put('/api/properties/:id', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  const propertyId = req.params.id;
  const { name, address } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Naam is verplicht' });
  }
  
  try {
    const propertyCheck = await pool.query(
      'SELECT id FROM "Property" WHERE id = $1 AND "ownerId" = $2',
      [propertyId, req.userId]
    );
    
    if (propertyCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Geen toegang tot deze property' });
    }
    
    const result = await pool.query(
      'UPDATE "Property" SET name = $1, address = $2 WHERE id = $3 RETURNING id, name, address',
      [name, address || null, propertyId]
    );
    
    res.json({ success: true, property: result.rows[0] });
  } catch (error) {
    console.error('Fout bij updaten property:', error);
    res.status(500).json({ error: 'Property kon niet worden bijgewerkt' });
  }
});

app.get('/api/me', verifyToken, checkActiveUser, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, "isActive", "createdAt" FROM "User" WHERE id = $1',
      [req.userId]
    );
    
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Fout bij ophalen gebruiker:', error);
    res.status(500).json({ error: 'Kon gebruiker niet ophalen' });
  }
});

// ============ PERSONAL CODES ENDPOINTS ============
app.get('/api/personal-codes', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, code, "createdAt" FROM "PersonalCode" WHERE "userId" = $1 ORDER BY "createdAt" ASC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Fout bij ophalen personal codes:', error);
    res.status(500).json({ error: 'Kon personal codes niet ophalen' });
  }
});

app.post('/api/personal-codes', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  const { name, code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Code is verplicht' });
  }
  
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Code moet exact 6 cijfers zijn' });
  }
  
  try {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM "PersonalCode" WHERE "userId" = $1',
      [req.userId]
    );
    
    const codeCount = parseInt(countResult.rows[0].count);
    if (codeCount >= 4) {
      return res.status(400).json({ error: 'Maximaal 4 codes toegestaan' });
    }
    
    const result = await pool.query(
      'INSERT INTO "PersonalCode" (id, name, code, "userId", "createdAt") VALUES (gen_random_uuid()::text, $1, $2, $3, NOW()) RETURNING id, name, code',
      [name || `Code ${codeCount + 1}`, code, req.userId]
    );
    
    res.json({ success: true, code: result.rows[0] });
  } catch (error) {
    console.error('Fout bij toevoegen personal code:', error);
    res.status(500).json({ error: 'Code kon niet worden toegevoegd' });
  }
});

app.put('/api/personal-codes/:id', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  const codeId = req.params.id;
  const { name, code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Code is verplicht' });
  }
  
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Code moet exact 6 cijfers zijn' });
  }
  
  try {
    const codeCheck = await pool.query(
      'SELECT id FROM "PersonalCode" WHERE id = $1 AND "userId" = $2',
      [codeId, req.userId]
    );
    
    if (codeCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Geen toegang tot deze code' });
    }
    
    const result = await pool.query(
      'UPDATE "PersonalCode" SET name = $1, code = $2 WHERE id = $3 RETURNING id, name, code',
      [name || null, code, codeId]
    );
    
    res.json({ success: true, code: result.rows[0] });
  } catch (error) {
    console.error('Fout bij updaten personal code:', error);
    res.status(500).json({ error: 'Code kon niet worden bijgewerkt' });
  }
});

app.delete('/api/personal-codes/:id', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  const codeId = req.params.id;
  
  try {
    const codeCheck = await pool.query(
      'SELECT id FROM "PersonalCode" WHERE id = $1 AND "userId" = $2',
      [codeId, req.userId]
    );
    
    if (codeCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Geen toegang tot deze code' });
    }
    
    await pool.query('DELETE FROM "PersonalCode" WHERE id = $1', [codeId]);
    
    res.json({ success: true, message: 'Code verwijderd' });
  } catch (error) {
    console.error('Fout bij verwijderen personal code:', error);
    res.status(500).json({ error: 'Code kon niet worden verwijderd' });
  }
});

// ============ SCHOONMAKER ENDPOINTS ============
app.get('/api/cleaning-tasks', verifyToken, checkActiveUser, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT ct.*, 
             p.name as property_name, 
             p.address,
             u.name as cleaner_name,
             (SELECT COUNT(*) FROM "CleaningReserve" cr WHERE cr."taskId" = ct.id) as reserve_count
      FROM "CleaningTask" ct
      LEFT JOIN "Property" p ON ct."propertyId" = p.id
      LEFT JOIN "User" u ON ct."cleanerId" = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ` AND ct.status = $${params.length + 1}`;
      params.push(status);
    }
    
    query += ` ORDER BY ct."scheduledAt" ASC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Fout bij ophalen taken:', error);
    res.status(500).json({ error: 'Kon taken niet ophalen' });
  }
});

app.post('/api/cleaning-tasks/:id/assign', verifyToken, checkActiveUser, async (req, res) => {
  const taskId = req.params.id;
  const cleanerId = req.userId;
  
  try {
    const taskCheck = await pool.query(
      'SELECT status FROM "CleaningTask" WHERE id = $1',
      [taskId]
    );
    
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Taak niet gevonden' });
    }
    
    if (taskCheck.rows[0].status !== 'OPEN') {
      return res.status(400).json({ error: 'Deze taak is al toegewezen' });
    }
    
    const result = await pool.query(
      'UPDATE "CleaningTask" SET status = $1, "cleanerId" = $2 WHERE id = $3 RETURNING *',
      ['ASSIGNED', cleanerId, taskId]
    );
    
    res.json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error('Fout bij toewijzen taak:', error);
    res.status(500).json({ error: 'Kon taak niet toewijzen' });
  }
});

app.post('/api/cleaning-tasks/:id/reserve', verifyToken, checkActiveUser, async (req, res) => {
  const taskId = req.params.id;
  const cleanerId = req.userId;
  
  try {
    const reserveCount = await pool.query(
      'SELECT COUNT(*) FROM "CleaningReserve" WHERE "taskId" = $1',
      [taskId]
    );
    
    if (parseInt(reserveCount.rows[0].count) >= 3) {
      return res.status(400).json({ error: 'Maximaal 3 reserves toegestaan voor deze taak' });
    }
    
    const existingReserve = await pool.query(
      'SELECT id FROM "CleaningReserve" WHERE "taskId" = $1 AND "cleanerId" = $2',
      [taskId, cleanerId]
    );
    
    if (existingReserve.rows.length > 0) {
      return res.status(400).json({ error: 'Je staat al op de reservelijst voor deze taak' });
    }
    
    const result = await pool.query(
      'INSERT INTO "CleaningReserve" (id, "taskId", "cleanerId", status, "createdAt") VALUES (gen_random_uuid()::text, $1, $2, $3, NOW()) RETURNING *',
      [taskId, cleanerId, 'PENDING']
    );
    
    res.json({ success: true, reserve: result.rows[0] });
  } catch (error) {
    console.error('Fout bij reserveren:', error);
    res.status(500).json({ error: 'Kon niet reserveren' });
  }
});

app.get('/api/my-tasks', verifyToken, checkActiveUser, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ct.*, 
             p.name as property_name, 
             p.address,
             (SELECT COUNT(*) FROM "CleaningReserve" cr WHERE cr."taskId" = ct.id) as reserve_count
      FROM "CleaningTask" ct
      LEFT JOIN "Property" p ON ct."propertyId" = p.id
      WHERE ct."cleanerId" = $1
      ORDER BY ct."scheduledAt" ASC
    `, [req.userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Fout bij ophalen eigen taken:', error);
    res.status(500).json({ error: 'Kon taken niet ophalen' });
  }
});

app.get('/api/my-reserves', verifyToken, checkActiveUser, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cr.*, 
             ct.id as task_id,
             ct."scheduledAt",
             ct.duration,
             ct.status as task_status,
             p.name as property_name,
             p.address,
             u.name as cleaner_name
      FROM "CleaningReserve" cr
      JOIN "CleaningTask" ct ON cr."taskId" = ct.id
      LEFT JOIN "Property" p ON ct."propertyId" = p.id
      LEFT JOIN "User" u ON ct."cleanerId" = u.id
      WHERE cr."cleanerId" = $1
      ORDER BY ct."scheduledAt" ASC
    `, [req.userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Fout bij ophalen reserves:', error);
    res.status(500).json({ error: 'Kon reserves niet ophalen' });
  }
});

app.delete('/api/my-reserves/:id', verifyToken, checkActiveUser, async (req, res) => {
  const reserveId = req.params.id;
  
  try {
    const reserveCheck = await pool.query(
      'SELECT id FROM "CleaningReserve" WHERE id = $1 AND "cleanerId" = $2',
      [reserveId, req.userId]
    );
    
    if (reserveCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Geen toegang tot deze reserve' });
    }
    
    await pool.query('DELETE FROM "CleaningReserve" WHERE id = $1', [reserveId]);
    
    res.json({ success: true, message: 'Reserve geannuleerd' });
  } catch (error) {
    console.error('Fout bij annuleren reserve:', error);
    res.status(500).json({ error: 'Kon reserve niet annuleren' });
  }
});

app.put('/api/cleaner/personal-code', verifyToken, checkActiveUser, async (req, res) => {
  const { personalCode } = req.body;
  const userId = req.userId;
  
  // Check of gebruiker een schoonmaker is
  if (req.userRole !== 'SCHOONMAKER') {
    return res.status(403).json({ error: 'Alleen schoonmakers kunnen hun code wijzigen' });
  }
  
  if (!personalCode || personalCode.length !== 6 || !/^\d{6}$/.test(personalCode)) {
    return res.status(400).json({ error: 'Code moet exact 6 cijfers zijn' });
  }
  
  try {
    await pool.query(
      'UPDATE "User" SET "personalCode" = $1 WHERE id = $2',
      [personalCode, userId]
    );
    
    // Haal de geüpdatete gebruiker op
    const result = await pool.query(
      'SELECT id, email, name, role, "isActive", "personalCode" FROM "User" WHERE id = $1',
      [userId]
    );
    
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Fout bij updaten personal code:', error);
    res.status(500).json({ error: 'Code kon niet worden bijgewerkt' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server draait op http://0.0.0.0:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});