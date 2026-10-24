// routes/orders.js - fixed to match actual DB columns
const router = require('express').Router();
const db     = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// POST /api/orders - place order
router.post('/', auth, async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { student_name, block, room, payment_method, items } = req.body;
    if (!student_name || !block || !room || !payment_method || !items || !items.length)
      return res.status(400).json({ success: false, error: 'Missing required fields' });

    const ids = items.map(i => i.menu_item_id);
    const [menuRows] = await conn.query(
      `SELECT id, name, price, emoji, status, stock, outlet FROM menu_items WHERE id IN (?)`,
      [ids]
    );
    const menuMap = Object.fromEntries(menuRows.map(r => [r.id, r]));

    for (const req_item of items) {
      const m = menuMap[req_item.menu_item_id];
      if (!m) throw Object.assign(new Error(`Item #${req_item.menu_item_id} not found`), { status: 404 });
      if (m.status === 'unavailable')
        throw Object.assign(new Error(`"${m.name}" is currently unavailable`), { status: 409 });
      if (m.stock > 0 && m.stock < req_item.qty)
        throw Object.assign(new Error(`Only ${m.stock} units of "${m.name}" available`), { status: 409 });
    }

    const orderId  = 'ORD' + Date.now().toString().slice(-7);
    const subtotal = items.reduce((sum, i) => sum + menuMap[i.menu_item_id].price * i.qty, 0);
    const codFee   = payment_method === 'cod' ? 5 : 0;
    const total    = subtotal + 5 + codFee;
    const etaMins  = 10 + Math.floor(Math.random() * 8);
    const eta      = `~${etaMins} min`;

    await conn.query(
      `INSERT INTO orders (id, user_email, student_name, block, room, subtotal, delivery_fee, cod_fee, total, payment_method, eta)
       VALUES (?,?,?,?,?,?,5,?,?,?,?)`,
      [orderId, req.user.email || req.user.name, student_name, block, room, subtotal, codFee, total, payment_method, eta]
    );

    for (const req_item of items) {
      const m = menuMap[req_item.menu_item_id];
      const lineTotal = m.price * req_item.qty;
      await conn.query(
        `INSERT INTO order_items (order_id, menu_item_id, item_name, outlet, emoji, unit_price, quantity, line_total)
         VALUES (?,?,?,?,?,?,?,?)`,
        [orderId, m.id, m.name, m.outlet, m.emoji, m.price, req_item.qty, lineTotal]
      );
      await conn.query(
        `UPDATE menu_items SET stock = GREATEST(stock - ?, 0) WHERE id = ?`,
        [req_item.qty, m.id]
      );
    }

    await conn.commit();
    res.status(201).json({
      success: true,
      message: 'Order placed!',
      data: { order_id: orderId, total, eta, payment_method },
    });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// GET /api/orders/my - user order history
router.get('/my', auth, async (req, res, next) => {
  try {
    const [orders] = await db.query(
      `SELECT id, student_name, block, room, subtotal, delivery_fee, cod_fee,
              total, payment_method, status, eta, placed_at
       FROM orders WHERE user_email = ? ORDER BY placed_at DESC`,
      [req.user.email || req.user.name]
    );
    for (const order of orders) {
      const [items] = await db.query(
        `SELECT * FROM order_items WHERE order_id = ?`, [order.id]
      );
      order.items = items;
      const groupMap = {};
      items.forEach(i => {
        if (!groupMap[i.outlet]) groupMap[i.outlet] = { outlet: i.outlet, items: [] };
        groupMap[i.outlet].items.push(i);
      });
      order.outletGroups = Object.values(groupMap);
    }
    res.json({ success: true, data: orders });
  } catch (e) { next(e); }
});

// GET /api/orders - admin all orders
router.get('/', adminOnly, async (req, res, next) => {
  try {
    const [orders] = await db.query(
      `SELECT id, user_email, student_name, block, room, total,
              payment_method, status, eta, placed_at
       FROM orders ORDER BY placed_at DESC`
    );
    res.json({ success: true, data: orders });
  } catch (e) { next(e); }
});

// PATCH /api/orders/:id/status - admin update status
router.patch('/:id/status', adminOnly, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['preparing','delivered'].includes(status))
      return res.status(400).json({ success: false, error: 'Invalid status' });
    const [result] = await db.query('UPDATE orders SET status=? WHERE id=?', [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, message: `Order marked ${status}` });
  } catch (e) { next(e); }
});

module.exports = router;
