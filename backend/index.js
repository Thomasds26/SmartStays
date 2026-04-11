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
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
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
    const userExists = await pool.query(
      'SELECT id FROM "User" WHERE id = $1',
      [userId]
    );
    
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }
    
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
    await pool.query('DELETE FROM "CleaningSchedule" WHERE "cleanerId" = $1', [userIdToDelete]);
    await pool.query('DELETE FROM "CleaningScheduleHistory" WHERE "changedBy" = $1', [userIdToDelete]);
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
  const { name, address, ownerId, airbnbIcalUrl, bookingIcalUrl } = req.body;
  
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
      `INSERT INTO "Property" (id, name, address, "ownerId", "airbnbIcalUrl", "bookingIcalUrl", "createdAt") 
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW()) 
       RETURNING id, name, address, "ownerId", "airbnbIcalUrl", "bookingIcalUrl"`,
      [name, address || null, ownerId, airbnbIcalUrl || null, bookingIcalUrl || null]
    );
    
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
  const { name, address, ownerId, airbnbIcalUrl, bookingIcalUrl } = req.body;
  
  try {
    const propertyExists = await pool.query(
      'SELECT id FROM "Property" WHERE id = $1',
      [propertyId]
    );
    
    if (propertyExists.rows.length === 0) {
      return res.status(404).json({ error: 'Property niet gevonden' });
    }
    
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
    await pool.query('DELETE FROM "CleaningSchedule" WHERE "propertyId" = $1', [propertyId]);
    await pool.query('DELETE FROM "CalendarEvent" WHERE "propertyId" = $1', [propertyId]);
    await pool.query('DELETE FROM "Property" WHERE id = $1', [propertyId]);
    res.json({ success: true, message: 'Property verwijderd' });
  } catch (error) {
    console.error('Fout bij verwijderen property:', error);
    res.status(500).json({ error: 'Kon property niet verwijderen' });
  }
});

// ============ VERHUURDER ENDPOINTS ============
app.get('/api/properties', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, address, "createdAt", "airbnbIcalUrl", "bookingIcalUrl" FROM "Property" WHERE "ownerId" = $1 ORDER BY "createdAt" DESC',
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
  const { name, address, airbnbIcalUrl, bookingIcalUrl } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Naam is verplicht' });
  }
  
  try {
    const propertyCheck = await pool.query(
      'SELECT id, "airbnbIcalUrl", "bookingIcalUrl" FROM "Property" WHERE id = $1 AND "ownerId" = $2',
      [propertyId, req.userId]
    );
    
    if (propertyCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Geen toegang tot deze property' });
    }
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
    
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(address);
    }
    
    if (airbnbIcalUrl !== undefined) {
      updates.push(`"airbnbIcalUrl" = $${paramIndex++}`);
      values.push(airbnbIcalUrl || null);
    }
    
    if (bookingIcalUrl !== undefined) {
      updates.push(`"bookingIcalUrl" = $${paramIndex++}`);
      values.push(bookingIcalUrl || null);
    }
    
    values.push(propertyId);
    
    const result = await pool.query(
      `UPDATE "Property" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, address, "airbnbIcalUrl", "bookingIcalUrl"`,
      values
    );
    
    // Verwijder en synchroniseer Airbnb
    if (airbnbIcalUrl && airbnbIcalUrl.trim() !== '') {
      await syncCalendarEvents(propertyId, 'AIRBNB', airbnbIcalUrl);
    } else {
      // Verwijder alle Airbnb boekingen
      const deleteResult = await pool.query(
        'DELETE FROM "CalendarEvent" WHERE "propertyId" = $1 AND platform = $2',
        [propertyId, 'AIRBNB']
      );
      console.log(`🗑️ ${deleteResult.rowCount} Airbnb boekingen verwijderd (URL verwijderd)`);
    }
    
    // Verwijder en synchroniseer Booking.com
    if (bookingIcalUrl && bookingIcalUrl.trim() !== '') {
      await syncCalendarEvents(propertyId, 'BOOKING', bookingIcalUrl);
    } else {
      // Verwijder alle Booking.com boekingen
      const deleteResult = await pool.query(
        'DELETE FROM "CalendarEvent" WHERE "propertyId" = $1 AND platform = $2',
        [propertyId, 'BOOKING']
      );
      console.log(`🗑️ ${deleteResult.rowCount} Booking.com boekingen verwijderd (URL verwijderd)`);
    }
    
    res.json({ success: true, property: result.rows[0] });
  } catch (error) {
    console.error('Fout bij updaten property:', error);
    res.status(500).json({ error: 'Property kon niet worden bijgewerkt' });
  }
});

// Endpoint om alle boekingen van een property te wissen
app.delete('/api/calendar/:propertyId/clear', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  const { propertyId } = req.params;
  const { platform } = req.query; // Optioneel: specifiek platform
  
  try {
    let query = 'DELETE FROM "CalendarEvent" WHERE "propertyId" = $1';
    const params = [propertyId];
    
    if (platform) {
      query += ' AND platform = $2';
      params.push(platform);
    }
    
    const result = await pool.query(query, params);
    
    res.json({ 
      success: true, 
      message: `${result.rowCount} boekingen verwijderd`,
      deletedCount: result.rowCount 
    });
  } catch (error) {
    console.error('Fout bij wissen boekingen:', error);
    res.status(500).json({ error: 'Kon boekingen niet wissen' });
  }
});

// Endpoint om schoonmaak te genereren voor alle bestaande boekingen
app.post('/api/generate-cleaning-for-existing-bookings/:propertyId', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  const propertyId = req.params.id;
  
  try {
    // Haal alle actieve boekingen op
    const bookings = await pool.query(
      `SELECT * FROM "CalendarEvent" 
       WHERE "propertyId" = $1 AND status = 'ACTIVE'`,
      [propertyId]
    );
    
    const CLEANING_DELAY_HOURS = 1;
    const CLEANING_DURATION_HOURS = 5;
    
    let generatedCount = 0;
    
    for (const booking of bookings.rows) {
      const result = await generateAutoCleaning(
        propertyId, 
        booking.checkOut, 
        CLEANING_DELAY_HOURS, 
        CLEANING_DURATION_HOURS
      );
      if (result) generatedCount++;
    }
    
    res.json({ 
      success: true, 
      message: `${generatedCount} van de ${bookings.rows.length} schoonmaak taken gegenereerd`,
      totalBookings: bookings.rows.length,
      generated: generatedCount
    });
  } catch (error) {
    console.error('Fout bij genereren schoonmaak:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint om auto-cleaning instellingen te updaten
app.put('/api/properties/:id/cleaning-settings', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  const propertyId = req.params.id;
  const { autoCleaning, cleaningHours, cleaningDelayHours } = req.body;
  
  try {
    const propertyCheck = await pool.query(
      'SELECT id FROM "Property" WHERE id = $1 AND "ownerId" = $2',
      [propertyId, req.userId]
    );
    
    if (propertyCheck.rows.length === 0 && req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Geen toegang tot deze property' });
    }
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (autoCleaning !== undefined) {
      updates.push(`"autoCleaning" = $${paramIndex++}`);
      values.push(autoCleaning);
    }
    if (cleaningHours !== undefined) {
      updates.push(`"cleaningHours" = $${paramIndex++}`);
      values.push(cleaningHours);
    }
    if (cleaningDelayHours !== undefined) {
      updates.push(`"cleaningDelayHours" = $${paramIndex++}`);
      values.push(cleaningDelayHours);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Geen instellingen om te updaten' });
    }
    
    values.push(propertyId);
    
    const result = await pool.query(
      `UPDATE "Property" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, "autoCleaning", "cleaningHours", "cleaningDelayHours"`,
      values
    );
    
    res.json({ success: true, settings: result.rows[0] });
  } catch (error) {
    console.error('Fout bij updaten cleaning settings:', error);
    res.status(500).json({ error: 'Instellingen konden niet worden bijgewerkt' });
  }
});

// Endpoint om auto-cleaning instellingen op te halen
app.get('/api/properties/:id/cleaning-settings', verifyToken, checkActiveUser, async (req, res) => {
  const propertyId = req.params.id;
  
  try {
    const result = await pool.query(
      'SELECT "autoCleaning", "cleaningHours", "cleaningDelayHours" FROM "Property" WHERE id = $1',
      [propertyId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property niet gevonden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fout bij ophalen cleaning settings:', error);
    res.status(500).json({ error: 'Kon instellingen niet ophalen' });
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

// ============ SCHOONMAAK PLANNING ENDPOINTS ============

// Haal alle schoonmaak planningen op
app.get('/api/cleaning-schedules', verifyToken, checkActiveUser, async (req, res) => {
  try {
    const { propertyId, startDate, endDate, status } = req.query;
    
    let query = `
      SELECT cs.*, 
             p.name as property_name,
             u.name as cleaner_name,
             u.email as cleaner_email,
             creator.name as created_by_name
      FROM "CleaningSchedule" cs
      LEFT JOIN "Property" p ON cs."propertyId" = p.id
      LEFT JOIN "User" u ON cs."cleanerId" = u.id
      LEFT JOIN "User" creator ON cs."createdBy" = creator.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (req.userRole === 'VERHUURDER') {
      query += ` AND p."ownerId" = $${paramIndex++}`;
      params.push(req.userId);
    }
    
    if (propertyId) {
      query += ` AND cs."propertyId" = $${paramIndex++}`;
      params.push(propertyId);
    }
    
    if (startDate) {
      query += ` AND cs."startDate" >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND cs."endDate" <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    if (status) {
      query += ` AND cs.status = $${paramIndex++}`;
      params.push(status);
    }
    
    query += ` ORDER BY cs."startDate" ASC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Fout bij ophalen schoonmaak planningen:', error);
    res.status(500).json({ error: 'Kon planningen niet ophalen' });
  }
});

// Nieuwe schoonmaak planning toevoegen
app.post('/api/cleaning-schedules', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  const { propertyId, title, description, startDate, endDate, cleanerId } = req.body;
  
  if (!propertyId || !title || !startDate || !endDate) {
    return res.status(400).json({ error: 'Property, titel, start en eind datum zijn verplicht' });
  }
  
  try {
    if (req.userRole === 'VERHUURDER') {
      const propertyCheck = await pool.query(
        'SELECT id FROM "Property" WHERE id = $1 AND "ownerId" = $2',
        [propertyId, req.userId]
      );
      
      if (propertyCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Geen toegang tot deze property' });
      }
    }
    
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (startDateTime >= endDateTime) {
      return res.status(400).json({ error: 'Einddatum moet na startdatum zijn' });
    }
    
    const result = await pool.query(
      `INSERT INTO "CleaningSchedule" (id, "propertyId", title, description, "startDate", "endDate", "cleanerId", "createdBy", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [propertyId, title, description || null, startDateTime, endDateTime, cleanerId || null, req.userId, 'PENDING']
    );
    
    await pool.query(
      `INSERT INTO "CleaningScheduleHistory" (id, "cleaningScheduleId", action, "changedBy", "oldValue", "newValue", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())`,
      [result.rows[0].id, 'CREATED', req.userId, null, JSON.stringify(result.rows[0])]
    );
    
    broadcastUpdate('CLEANING_SCHEDULE_CREATED', result.rows[0]);
    
    res.json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Fout bij toevoegen schoonmaak planning:', error);
    res.status(500).json({ error: 'Planning kon niet worden toegevoegd' });
  }
});

// Schoonmaak planning bijwerken
app.put('/api/cleaning-schedules/:id', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  const scheduleId = req.params.id;
  const { title, description, startDate, endDate, cleanerId, status } = req.body;
  
  try {
    const existingSchedule = await pool.query(
      `SELECT cs.*, p."ownerId" 
       FROM "CleaningSchedule" cs
       JOIN "Property" p ON cs."propertyId" = p.id
       WHERE cs.id = $1`,
      [scheduleId]
    );
    
    if (existingSchedule.rows.length === 0) {
      return res.status(404).json({ error: 'Planning niet gevonden' });
    }
    
    if (req.userRole === 'VERHUURDER' && existingSchedule.rows[0].ownerId !== req.userId) {
      return res.status(403).json({ error: 'Geen toegang tot deze planning' });
    }
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    const oldValues = existingSchedule.rows[0];
    const newValues = { ...oldValues };
    
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
      newValues.title = title;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
      newValues.description = description;
    }
    if (startDate !== undefined) {
      updates.push(`"startDate" = $${paramIndex++}`);
      const startDateTime = new Date(startDate);
      values.push(startDateTime);
      newValues.startDate = startDateTime;
    }
    if (endDate !== undefined) {
      updates.push(`"endDate" = $${paramIndex++}`);
      const endDateTime = new Date(endDate);
      values.push(endDateTime);
      newValues.endDate = endDateTime;
    }
    if (cleanerId !== undefined) {
      updates.push(`"cleanerId" = $${paramIndex++}`);
      values.push(cleanerId || null);
      newValues.cleanerId = cleanerId;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      newValues.status = status;
    }
    
    updates.push(`"updatedAt" = NOW()`);
    values.push(scheduleId);
    
    const result = await pool.query(
      `UPDATE "CleaningSchedule" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    await pool.query(
      `INSERT INTO "CleaningScheduleHistory" (id, "cleaningScheduleId", action, "changedBy", "oldValue", "newValue", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())`,
      [scheduleId, 'UPDATED', req.userId, JSON.stringify(oldValues), JSON.stringify(newValues)]
    );
    
    broadcastUpdate('CLEANING_SCHEDULE_UPDATED', result.rows[0]);
    
    res.json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Fout bij updaten planning:', error);
    res.status(500).json({ error: 'Planning kon niet worden bijgewerkt' });
  }
});

// Schoonmaak planning verwijderen
app.delete('/api/cleaning-schedules/:id', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  const scheduleId = req.params.id;
  
  try {
    const scheduleCheck = await pool.query(
      `SELECT cs.*, p."ownerId" 
       FROM "CleaningSchedule" cs
       JOIN "Property" p ON cs."propertyId" = p.id
       WHERE cs.id = $1`,
      [scheduleId]
    );
    
    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Planning niet gevonden' });
    }
    
    if (req.userRole === 'VERHUURDER' && scheduleCheck.rows[0].ownerId !== req.userId) {
      return res.status(403).json({ error: 'Geen toegang tot deze planning' });
    }
    
    await pool.query('DELETE FROM "CleaningScheduleHistory" WHERE "cleaningScheduleId" = $1', [scheduleId]);
    await pool.query('DELETE FROM "CleaningSchedule" WHERE id = $1', [scheduleId]);
    
    broadcastUpdate('CLEANING_SCHEDULE_DELETED', { id: scheduleId });
    
    res.json({ success: true, message: 'Planning verwijderd' });
  } catch (error) {
    console.error('Fout bij verwijderen planning:', error);
    res.status(500).json({ error: 'Planning kon niet worden verwijderd' });
  }
});

// Schoonmaak planning toewijzen aan schoonmaker
app.post('/api/cleaning-schedules/:id/assign', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  const scheduleId = req.params.id;
  const { cleanerId } = req.body;
  
  if (!cleanerId) {
    return res.status(400).json({ error: 'Schoonmaker is verplicht' });
  }
  
  try {
    const cleanerCheck = await pool.query(
      'SELECT id, name, email FROM "User" WHERE id = $1 AND role = $2 AND "isActive" = true',
      [cleanerId, 'SCHOONMAKER']
    );
    
    if (cleanerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Schoonmaker niet gevonden' });
    }
    
    const result = await pool.query(
      `UPDATE "CleaningSchedule" 
       SET "cleanerId" = $1, status = $2, "updatedAt" = NOW()
       WHERE id = $3
       RETURNING *`,
      [cleanerId, 'ASSIGNED', scheduleId]
    );
    
    broadcastUpdate('CLEANING_SCHEDULE_ASSIGNED', result.rows[0]);
    
    res.json({ success: true, schedule: result.rows[0], cleaner: cleanerCheck.rows[0] });
  } catch (error) {
    console.error('Fout bij toewijzen:', error);
    res.status(500).json({ error: 'Kon niet toewijzen' });
  }
});

// Schoonmaak planning status updaten (voor schoonmakers)
app.put('/api/cleaning-schedules/:id/status', verifyToken, checkActiveUser, async (req, res) => {
  const scheduleId = req.params.id;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is verplicht' });
  }
  
  try {
    const scheduleCheck = await pool.query(
      'SELECT * FROM "CleaningSchedule" WHERE id = $1',
      [scheduleId]
    );
    
    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Planning niet gevonden' });
    }
    
    // Schoonmaker kan alleen zijn eigen taken updaten
    if (req.userRole === 'SCHOONMAKER' && scheduleCheck.rows[0].cleanerId !== req.userId) {
      return res.status(403).json({ error: 'Je bent niet toegewezen aan deze taak' });
    }
    
    const oldValues = scheduleCheck.rows[0];
    const newValues = { ...oldValues, status };
    
    const result = await pool.query(
      `UPDATE "CleaningSchedule" 
       SET status = $1, "updatedAt" = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, scheduleId]
    );
    
    await pool.query(
      `INSERT INTO "CleaningScheduleHistory" (id, "cleaningScheduleId", action, "changedBy", "oldValue", "newValue", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())`,
      [scheduleId, 'STATUS_UPDATED', req.userId, JSON.stringify(oldValues), JSON.stringify(newValues)]
    );
    
    broadcastUpdate('CLEANING_SCHEDULE_STATUS_UPDATED', result.rows[0]);
    
    res.json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Fout bij updaten status:', error);
    res.status(500).json({ error: 'Status kon niet worden bijgewerkt' });
  }
});

// ============ KALENDER INTEGRATIE ============

const syncCalendarEvents = async (propertyId, platform, icalUrl) => {
  if (!icalUrl || icalUrl.trim() === '') {
    const deleteResult = await pool.query(
      'DELETE FROM "CalendarEvent" WHERE "propertyId" = $1 AND platform = $2 RETURNING id',
      [propertyId, platform]
    );
    if (deleteResult.rowCount > 0) {
      console.log(`🗑️ ${deleteResult.rowCount} ${platform} boekingen verwijderd voor property ${propertyId} (geen URL)`);
    }
    return { success: true, deletedCount: deleteResult.rowCount };
  }
  
  try {
    console.log(`🌐 Fetching iCal from ${icalUrl}`);
    const response = await fetch(icalUrl);
    const icalData = await response.text();
    const events = ical.parseICS(icalData);
    
    let newCount = 0;
    let updatedCount = 0;
    
    // Hardcoded waarden voor automatische schoonmaak
    const CLEANING_DELAY_HOURS = 1;
    const CLEANING_DURATION_HOURS = 5;
    
    // Verzamel alle externe IDs uit de iCal
    const externalIdsFromICal = [];
    
    for (const eventId in events) {
      const event = events[eventId];
      if (event.type !== 'VEVENT') continue;
      
      const externalId = event.uid || eventId;
      externalIdsFromICal.push(externalId);
      
      const checkIn = new Date(event.start);
      const checkOut = new Date(event.end);
      const guestName = event.summary || 'Gast';
      let guestEmail = null;
      
      if (event.description) {
        const emailMatch = event.description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          guestEmail = emailMatch[0];
        }
      }
      
      const existing = await pool.query(
        `SELECT id FROM "CalendarEvent" 
         WHERE "externalId" = $1 AND platform = $2 AND "propertyId" = $3`,
        [externalId, platform, propertyId]
      );
      
      let bookingId;
      
      if (existing.rows.length === 0) {
        // Nieuwe boeking toevoegen
        const result = await pool.query(
          `INSERT INTO "CalendarEvent" (id, "externalId", "propertyId", platform, "guestName", "guestEmail", "checkIn", "checkOut", status, "createdAt", "updatedAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING id`,
          [externalId, propertyId, platform, guestName, guestEmail, checkIn, checkOut, 'ACTIVE']
        );
        bookingId = result.rows[0].id;
        newCount++;
        console.log(`✅ Nieuwe ${platform} boeking: ${guestName} - check-out: ${checkOut.toLocaleString()}`);
      } else {
        // Bestaande boeking updaten
        await pool.query(
          `UPDATE "CalendarEvent" 
           SET "guestName" = $1, "guestEmail" = $2, "checkIn" = $3, "checkOut" = $4, "updatedAt" = NOW()
           WHERE "externalId" = $5 AND platform = $6 AND "propertyId" = $7`,
          [guestName, guestEmail, checkIn, checkOut, externalId, platform, propertyId]
        );
        bookingId = existing.rows[0].id;
        updatedCount++;
        console.log(`🔄 Geüpdatete ${platform} boeking: ${guestName} - check-out: ${checkOut.toLocaleString()}`);
      }
      
      // ALTIJD schoonmaak genereren voor deze boeking (als die nog niet bestaat)
      await generateAutoCleaning(propertyId, checkOut, CLEANING_DELAY_HOURS, CLEANING_DURATION_HOURS);
    }
    
    // Verwijder boekingen die niet meer in de iCal voorkomen
    if (externalIdsFromICal.length > 0) {
      const deleteResult = await pool.query(
        `DELETE FROM "CalendarEvent" 
         WHERE "propertyId" = $1 
         AND platform = $2 
         AND "externalId" != ALL($3::text[])`,
        [propertyId, platform, externalIdsFromICal]
      );
      
      if (deleteResult.rowCount > 0) {
        console.log(`🗑️ ${deleteResult.rowCount} ${platform} boekingen verwijderd (niet meer in iCal)`);
      }
    }
    
    broadcastUpdate('CALENDAR_SYNC', { propertyId, platform, newCount, updatedCount });
    
    console.log(`📊 Sync voltooid voor ${platform}: ${newCount} nieuw, ${updatedCount} geüpdatet`);
    return { success: true, newCount, updatedCount };
  } catch (error) {
    console.error(`❌ Fout bij synchronisatie van ${platform}:`, error);
    return { success: false, error: error.message };
  }
};

const generateAutoCleaning = async (propertyId, checkOutDate, delayHours, cleaningHours) => {
  try {
    if (!checkOutDate) {
      console.error('❌ Geen check-out datum');
      return null;
    }
    
    const checkOut = new Date(checkOutDate);
    if (isNaN(checkOut.getTime())) {
      console.error('❌ Ongeldige check-out datum:', checkOutDate);
      return null;
    }
    
    const startDate = new Date(checkOut);
    startDate.setHours(startDate.getHours() + delayHours);
    
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + cleaningHours);
    
    // Check of er al een schoonmaak is voor deze periode
    const existingCleaning = await pool.query(
      `SELECT id FROM "CleaningSchedule" 
       WHERE "propertyId" = $1 
       AND "startDate" <= $2 AND "endDate" >= $3`,
      [propertyId, endDate, startDate]
    );
    
    if (existingCleaning.rows.length > 0) {
      return null;
    }
    
    const dateStr = startDate.toLocaleDateString('nl-NL');
    const title = `Schoonmaak - ${dateStr}`;
    
    const result = await pool.query(
      `INSERT INTO "CleaningSchedule" 
       (id, "propertyId", title, description, "startDate", "endDate", "createdBy", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [propertyId, title, `Automatisch gegenereerd (start ${delayHours} uur na check-out, duur ${cleaningHours} uur)`, startDate, endDate, 'system', 'PENDING']
    );
    
    console.log(`🧹 Automatische schoonmaak gegenereerd: ${startDate.toLocaleString()} - ${endDate.toLocaleString()}`);
    broadcastUpdate('CLEANING_SCHEDULE_CREATED', result.rows[0]);
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Fout in generateAutoCleaning:', error);
    return null;
  }
};

// Endpoint om schoonmaak te genereren voor alle bestaande boekingen
app.post('/api/generate-missing-cleaning/:propertyId', verifyToken, checkActiveUser, checkOwnerOrAdmin, async (req, res) => {
  const { propertyId } = req.params;
  
  try {
    const CLEANING_DELAY_HOURS = 1;
    const CLEANING_DURATION_HOURS = 5;
    
    // Haal alle actieve boekingen op
    const bookings = await pool.query(
      `SELECT * FROM "CalendarEvent" 
       WHERE "propertyId" = $1 AND status = 'ACTIVE'
       ORDER BY "checkOut" ASC`,
      [propertyId]
    );
    
    console.log(`📋 ${bookings.rows.length} boekingen gevonden voor property ${propertyId}`);
    
    let generatedCount = 0;
    let skippedCount = 0;
    
    for (const booking of bookings.rows) {
      console.log(`🔍 Verwerken boeking: ${booking.guestName} - check-out: ${new Date(booking.checkOut).toLocaleString()}`);
      
      const result = await generateAutoCleaning(
        propertyId, 
        booking.checkOut, 
        CLEANING_DELAY_HOURS, 
        CLEANING_DURATION_HOURS
      );
      
      if (result) {
        generatedCount++;
      } else {
        skippedCount++;
      }
    }
    
    res.json({ 
      success: true, 
      totalBookings: bookings.rows.length,
      generated: generatedCount,
      skipped: skippedCount,
      message: `${generatedCount} schoonmaak taken gegenereerd, ${skippedCount} overgeslagen (bestaand of verleden)`
    });
  } catch (error) {
    console.error('Fout bij genereren schoonmaak:', error);
    res.status(500).json({ error: error.message });
  }
});

const syncAllProperties = async () => {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Geplande synchronisatie gestart...`);
    
    const properties = await pool.query(
      'SELECT id, "airbnbIcalUrl", "bookingIcalUrl" FROM "Property"'
    );
    
    for (const property of properties.rows) {
      // Alleen synchroniseren als de URL bestaat en niet leeg is
      if (property.airbnbIcalUrl && property.airbnbIcalUrl.trim() !== '') {
        await syncCalendarEvents(property.id, 'AIRBNB', property.airbnbIcalUrl);
      } else {
        // Als er geen URL is, verwijder alle boekingen van dat platform
        await pool.query(
          'DELETE FROM "CalendarEvent" WHERE "propertyId" = $1 AND platform = $2',
          [property.id, 'AIRBNB']
        );
        console.log(`🗑️ Geen Airbnb URL, alle Airbnb boekingen verwijderd voor property ${property.id}`);
      }
      
      if (property.bookingIcalUrl && property.bookingIcalUrl.trim() !== '') {
        await syncCalendarEvents(property.id, 'BOOKING', property.bookingIcalUrl);
      } else {
        // Als er geen URL is, verwijder alle boekingen van dat platform
        await pool.query(
          'DELETE FROM "CalendarEvent" WHERE "propertyId" = $1 AND platform = $2',
          [property.id, 'BOOKING']
        );
        console.log(`🗑️ Geen Booking.com URL, alle Booking.com boekingen verwijderd voor property ${property.id}`);
      }
    }
    
    console.log(`[${new Date().toLocaleTimeString()}] Synchronisatie voltooid`);
  } catch (error) {
    console.error('Fout bij geplande synchronisatie:', error);
  }
};

// Kalender endpoint die zowel boekingen als schoonmaak planningen teruggeeft
app.get('/api/calendar/:propertyId', verifyToken, checkActiveUser, async (req, res) => {
  const { propertyId } = req.params;
  const { start, end } = req.query;
  
  try {
    // Haal boekingen op
    let bookingQuery = `
      SELECT ce.*, 'booking' as type
      FROM "CalendarEvent" ce
      WHERE ce."propertyId" = $1 AND ce.status = 'ACTIVE'
    `;
    const params = [propertyId];
    
    if (start) {
      bookingQuery += ` AND ce."checkOut" >= $${params.length + 1}`;
      params.push(start);
    }
    if (end) {
      bookingQuery += ` AND ce."checkIn" <= $${params.length + 1}`;
      params.push(end);
    }
    
    const bookings = await pool.query(bookingQuery, params);
    
    // Haal schoonmaak planningen op (alleen als tabel bestaat)
    let cleaningSchedules = { rows: [] };
    try {
      let cleaningQuery = `
        SELECT cs.*, 'cleaning' as type,
               u.name as cleaner_name,
               creator.name as created_by_name
        FROM "CleaningSchedule" cs
        LEFT JOIN "User" u ON cs."cleanerId" = u.id
        LEFT JOIN "User" creator ON cs."createdBy" = creator.id
        WHERE cs."propertyId" = $1
      `;
      
      const cleaningParams = [propertyId];
      let cleaningParamIndex = 2;
      
      if (start) {
        cleaningQuery += ` AND cs."endDate" >= $${cleaningParamIndex++}`;
        cleaningParams.push(start);
      }
      if (end) {
        cleaningQuery += ` AND cs."startDate" <= $${cleaningParamIndex++}`;
        cleaningParams.push(end);
      }
      
      cleaningSchedules = await pool.query(cleaningQuery, cleaningParams);
    } catch (err) {
      // Tabel bestaat nog niet, negeer
      console.log('CleaningSchedule tabel bestaat nog niet, alleen boekingen tonen');
    }
    
    // Combineer resultaten
    const combined = [...bookings.rows, ...cleaningSchedules.rows];
    
    res.json(combined);
  } catch (error) {
    console.error('Fout bij ophalen kalender:', error);
    res.status(500).json({ error: 'Kon kalender niet ophalen' });
  }
});

// ============ WEBSOCKET ============
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

// ============ START SERVER ============
setTimeout(() => {
  syncAllProperties();
  setInterval(syncAllProperties, 60 * 1000);
}, 5000);

app.post('/api/force-sync', async (req, res) => {
  try {
    await syncAllProperties();
    res.json({ success: true, message: 'Sync voltooid' });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server draait op http://0.0.0.0:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});