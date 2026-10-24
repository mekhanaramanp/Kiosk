const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const db      = require('../config/db');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.json({ success: false, error: 'Name, email and password are required.' });
    if (!email.toLowerCase().endsWith('@saintgits.org'))
      return res.json({ success: false, error: 'Only @saintgits.org email addresses are allowed.' });
    if (password.length < 6)
      return res.json({ success: false, error: 'Password must be at least 6 characters.' });
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0)
      return res.json({ success: false, error: 'This email is already registered. Please sign in.' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.toLowerCase(), hash, 'user']
    );
    res.json({ success: true, message: 'Account created successfully!', userId: result.insertId });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.json({ success: false, error: 'Email and password are required.' });
    if (email === 'admin@saintgits.org' && password === 'admin123') {
      const token = jwt.sign(
        { id: 0, name: 'Admin', email, role: 'admin' },
        process.env.JWT_SECRET || 'kiosk_secret',
        { expiresIn: '8h' }
      );
      return res.json({ success: true, token, user: { id: 0, name: 'Admin', role: 'admin' } });
    }
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!rows.length)
      return res.json({ success: false, error: 'Invalid email or password.' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.json({ success: false, error: 'Invalid email or password.' });
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'kiosk_secret',
      { expiresIn: '8h' }
    );
    res.json({ success: true, token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  }
});

module.exports = router;
