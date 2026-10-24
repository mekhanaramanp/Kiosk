// routes/auth.js — Register, Login, Me
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || 'saintgits.org';
const JWT_SECRET     = process.env.JWT_SECRET      || 'kiosk_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN  || '8h';

// ── POST /api/auth/register — student / faculty self-registration ──
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').optional().trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password, name } = req.body;
      const domain = email.split('@')[1];
      if (domain !== ALLOWED_DOMAIN) {
        return res.status(403).json({
          success: false,
          error: `Only @${ALLOWED_DOMAIN} email addresses are allowed.`,
        });
      }
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        'INSERT INTO users (email, password, role, name) VALUES (?,?,?,?)',
        [email, hash, 'user', name || email.split('@')[0]]
      );
      res.status(201).json({ success: true, message: 'Account created. You can now log in.' });
    } catch (e) { next(e); }
  }
);

// ── POST /api/auth/login ───────────────────────────────────────────
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const [[user]] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ success: false, error: 'Invalid credentials' });

      // Enforce domain restriction for non-admin users
      if (user.role !== 'admin' && !email.endsWith('@' + ALLOWED_DOMAIN)) {
        return res.status(403).json({ success: false, error: `Only @${ALLOWED_DOMAIN} users allowed.` });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      res.json({
        success: true,
        token,
        user: { id: user.id, email: user.email, role: user.role, name: user.name },
      });
    } catch (e) { next(e); }
  }
);

// ── GET /api/auth/me — current user ───────────────────────────────
router.get('/me', auth, async (req, res, next) => {
  try {
    const [[user]] = await db.query(
      'SELECT id, email, role, name, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (e) { next(e); }
});

module.exports = router;
