// middleware/auth.js — JWT verification
const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers['authorization'];
  const token  = header && header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: 'No token provided' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'kiosk_secret');
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ success: false, error: 'Admin access required' });
    next();
  });
}

module.exports = { auth, adminOnly };
