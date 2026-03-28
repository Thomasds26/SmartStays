const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');

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
  res.json({ status: 'ok', message: 'SmartStays API werkt 🚀' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email en wachtwoord zijn verplicht' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, name, role, password, "isActive" FROM "User" WHERE email = $1',
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

// Check activation token voor rol
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
    
    console.log(`\n📧 ========== ACTIVATIE LINK ==========`);
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

// Admin: Haal alle properties op
app.get('/api/admin/properties', verifyToken, checkActiveUser, checkAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name, p.address, p."ownerId", u.email as owner_email, u.name as owner_name
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

// Admin: Voeg property toe
app.post('/api/admin/properties', verifyToken, checkActiveUser, checkAdmin, async (req, res) => {
  const { name, address, ownerId } = req.body;
  
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
      'INSERT INTO "Property" (id, name, address, "ownerId", "createdAt") VALUES (gen_random_uuid()::text, $1, $2, $3, NOW()) RETURNING id, name, address, "ownerId"',
      [name, address || null, ownerId]
    );
    
    res.json({ success: true, property: result.rows[0] });
  } catch (error) {
    console.error('Fout bij toevoegen property:', error);
    res.status(500).json({ error: 'Property kon niet worden toegevoegd' });
  }
});

// Admin: Verwijder property
app.delete('/api/admin/properties/:id', verifyToken, checkActiveUser, checkAdmin, async (req, res) => {
  const propertyId = req.params.id;
  
  try {
    await pool.query('DELETE FROM "Booking" WHERE "propertyId" = $1', [propertyId]);
    await pool.query('DELETE FROM "CleaningTask" WHERE "propertyId" = $1', [propertyId]);
    await pool.query('DELETE FROM "Property" WHERE id = $1', [propertyId]);
    res.json({ success: true, message: 'Property verwijderd' });
  } catch (error) {
    console.error('Fout bij verwijderen property:', error);
    res.status(500).json({ error: 'Kon property niet verwijderen' });
  }
});

// Admin: Voeg schoonmaak taak toe
app.post('/api/admin/cleaning-tasks', verifyToken, checkActiveUser, checkAdmin, async (req, res) => {
  const { propertyId, scheduledAt, duration, notes } = req.body;
  
  if (!propertyId || !scheduledAt) {
    return res.status(400).json({ error: 'Property en datum zijn verplicht' });
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO "CleaningTask" (id, "propertyId", "scheduledAt", duration, notes, status, "createdAt") VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW()) RETURNING *',
      [propertyId, scheduledAt, duration || 60, notes || null, 'OPEN']
    );
    
    res.json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error('Fout bij toevoegen taak:', error);
    res.status(500).json({ error: 'Taak kon niet worden toegevoegd' });
  }
});

// Admin: Verwijder schoonmaak taak
app.delete('/api/admin/cleaning-tasks/:id', verifyToken, checkActiveUser, checkAdmin, async (req, res) => {
  const taskId = req.params.id;
  
  try {
    await pool.query('DELETE FROM "CleaningReserve" WHERE "taskId" = $1', [taskId]);
    await pool.query('DELETE FROM "CleaningTask" WHERE id = $1', [taskId]);
    res.json({ success: true, message: 'Taak verwijderd' });
  } catch (error) {
    console.error('Fout bij verwijderen taak:', error);
    res.status(500).json({ error: 'Kon taak niet verwijderen' });
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

// Haal alle open schoonmaak taken op
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

// Schoonmaker meldt zich aan voor taak
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

// Schoonmaker zet zich als reserve voor taak
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

// Schoonmaker haalt zijn eigen taken op
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

// Schoonmaker haalt zijn reserves op
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

// Schoonmaker annuleert zijn reserve
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server draait op http://0.0.0.0:${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/api/health`);
});