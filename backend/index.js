const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'smartstays-secret-key-2024';

app.use(cors());
app.use(express.json());

// PostgreSQL verbinding
const pool = new Pool({
  user: 'thomasdeschepper',
  host: 'localhost',
  database: 'smartstays',
  port: 5432,
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SmartStays API werkt 🚀' });
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email en wachtwoord zijn verplicht' });
  }

  try {
    // Query database
    const result = await pool.query(
      'SELECT id, email, name, role, password FROM "User" WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Ongeldige email of wachtwoord' });
    }

    // Check rol
    if (user.role !== 'ADMIN' && user.role !== 'VERHUURDER') {
      return res.status(403).json({ error: 'Geen toegang. Alleen verhuurders en admins kunnen inloggen.' });
    }

    // Check wachtwoord (tijdelijk zonder hashing)
    if (password !== user.password) {
      return res.status(401).json({ error: 'Ongeldige email of wachtwoord' });
    }

    // Genereer JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Stuur response zonder wachtwoord
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

// Beveiligde endpoint - haal eigen gegevens op
app.get('/api/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Geen token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const result = await pool.query(
      'SELECT id, email, name, role, "createdAt" FROM "User" WHERE id = $1',
      [decoded.id]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }

    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Ongeldige token' });
  }
});

// NIEUW: Haal alle gebruikers op (alleen voor admin)
app.get('/api/users', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Geen token' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check of gebruiker admin is
    const userCheck = await pool.query(
      'SELECT role FROM "User" WHERE id = $1',
      [decoded.id]
    );
    
    if (userCheck.rows[0]?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Geen toegang. Alleen admins kunnen gebruikers bekijken.' });
    }
    
    const result = await pool.query(
      'SELECT id, email, name, role, "createdAt" FROM "User" ORDER BY "createdAt" DESC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Fout bij ophalen gebruikers:', error);
    res.status(500).json({ error: 'Kon gebruikers niet ophalen' });
  }
});

// NIEUW: Nieuwe gebruiker toevoegen (alleen voor admin)
app.post('/api/users', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { email, name, role, password } = req.body;
  
  if (!token) {
    return res.status(401).json({ error: 'Geen token' });
  }
  
  if (!email || !name || !role || !password) {
    return res.status(400).json({ error: 'Alle velden zijn verplicht' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check of gebruiker admin is
    const userCheck = await pool.query(
      'SELECT role FROM "User" WHERE id = $1',
      [decoded.id]
    );
    
    if (userCheck.rows[0]?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Geen toegang. Alleen admins kunnen gebruikers toevoegen.' });
    }
    
    // Check of email al bestaat
    const existingUser = await pool.query(
      'SELECT id FROM "User" WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Dit emailadres is al in gebruik' });
    }
    
    // Voeg nieuwe gebruiker toe
    const result = await pool.query(
      'INSERT INTO "User" (id, email, name, role, password, "createdAt") VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW()) RETURNING id, email, name, role, "createdAt"',
      [email, name, role, password]
    );
    
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Fout bij toevoegen gebruiker:', error);
    res.status(500).json({ error: 'Gebruiker kon niet worden toegevoegd' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server draait op http://localhost:${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/api/health`);
  console.log(`👥 Users: http://localhost:${PORT}/api/users (alleen admin)`);
});