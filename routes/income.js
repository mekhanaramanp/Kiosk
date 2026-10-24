// routes/income.js — Admin income & analytics dashboard
const router    = require('express').Router();
const db        = require('../config/db');
const { adminOnly } = require('../middleware/auth');

// ── GET /api/income — per-outlet revenue summary ─────────────────
router.get('/', adminOnly, async (req, res, next) => {
  try {
    // Revenue per outlet (item prices only, excluding delivery/cod)
    const [byOutlet] = await db.query(`
      SELECT oi.outlet_name AS outlet,
             SUM(oi.item_price * oi.qty)  AS revenue,
             COUNT(DISTINCT oi.order_id)  AS orders,
             SUM(oi.qty)                  AS items_sold
      FROM   order_items oi
      JOIN   orders o ON oi.order_id = o.id
      WHERE  o.status != 'cancelled'
      GROUP BY oi.outlet_name
      ORDER BY revenue DESC
    `);

    // Grand total
    const [[totals]] = await db.query(`
      SELECT SUM(o.total)        AS grand_total,
             SUM(o.subtotal)     AS items_total,
             SUM(o.delivery_fee) AS delivery_total,
             SUM(o.cod_fee)      AS cod_total,
             COUNT(*)            AS order_count
      FROM   orders o
      WHERE  o.status != 'cancelled'
    `);

    // Per-order breakdown by outlet (for the detailed income list in frontend)
    const [orderRows] = await db.query(`
      SELECT oi.outlet_name, o.id AS order_id,
             SUM(oi.item_price * oi.qty) AS amount,
             o.placed_at, o.student_name
      FROM   order_items oi
      JOIN   orders o ON oi.order_id = o.id
      WHERE  o.status != 'cancelled'
      GROUP BY oi.outlet_name, o.id
      ORDER BY o.placed_at DESC
    `);

    // Group order rows by outlet
    const ordersByOutlet = {};
    orderRows.forEach(r => {
      if (!ordersByOutlet[r.outlet_name]) ordersByOutlet[r.outlet_name] = [];
      ordersByOutlet[r.outlet_name].push({ order_id: r.order_id, amount: r.amount, placed_at: r.placed_at, student_name: r.student_name });
    });

    res.json({
      success: true,
      data: {
        by_outlet: byOutlet.map(o => ({ ...o, orders_list: ordersByOutlet[o.outlet] || [] })),
        totals,
      },
    });
  } catch (e) { next(e); }
});

// ── GET /api/income/daily — day-by-day revenue ───────────────────
router.get('/daily', adminOnly, async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT DATE(placed_at) AS date,
             SUM(total)      AS total,
             COUNT(*)        AS orders
      FROM   orders WHERE status != 'cancelled'
      GROUP BY DATE(placed_at)
      ORDER BY date DESC LIMIT 30
    `);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// ── GET /api/income/top-items — best selling items ───────────────
router.get('/top-items', adminOnly, async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT oi.item_name, oi.outlet_name,
             SUM(oi.qty)                 AS units_sold,
             SUM(oi.item_price * oi.qty) AS revenue
      FROM   order_items oi
      JOIN   orders o ON oi.order_id = o.id
      WHERE  o.status != 'cancelled'
      GROUP BY oi.item_name, oi.outlet_name
      ORDER BY units_sold DESC LIMIT 20
    `);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// ── GET /api/income/payment-split — upi vs cod ───────────────────
router.get('/payment-split', adminOnly, async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT payment_method,
             COUNT(*)   AS orders,
             SUM(total) AS revenue
      FROM   orders WHERE status != 'cancelled'
      GROUP BY payment_method
    `);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

module.exports = router;
