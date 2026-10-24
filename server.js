// server.js — KIOSK Saintgits Campus Food — API Server
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const errorHandler = require('./middleware/errorHandler');

const authRouter   = require('./routes/auth');
const menuRouter   = require('./routes/menu');
const ordersRouter = require('./routes/orders');
const incomeRouter = require('./routes/income');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}]  ${req.method} ${req.path}`);
    next();
  });
}

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth',   authRouter);
app.use('/api/menu',   menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/income', incomeRouter);

// ── Health check ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'KIOSK API – Saintgits', timestamp: new Date() });
});

// 404
app.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

// Error handler
app.use(errorHandler);

// ── Start ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🍕  KIOSK – Saintgits Campus Food API`);
  console.log(`🚀  Listening on http://localhost:${PORT}`);
  console.log(`📖  Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
