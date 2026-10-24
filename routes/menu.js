// routes/menu.js - fixed to match actual DB columns
const router = require('express').Router();
const db     = require('../config/db');
const { adminOnly } = require('../middleware/auth');

// GET /api/menu
router.get('/', async (req, res, next) => {
  try {
    const { outlet, category, status, q } = req.query;
    let sql = `
      SELECT id, name, outlet, category, price, emoji,
             status, stock, description, eta
      FROM menu_items
    `;
    const where = []; const params = [];
    if (outlet)   { where.push('outlet = ?');   params.push(outlet); }
    if (category) { where.push('category = ?'); params.push(category); }
    if (status)   { where.push('status = ?');   params.push(status); }
    if (q) {
      where.push('(name LIKE ? OR description LIKE ? OR category LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY category, name';
    const [rows] = await db.query(sql, params);
    // map 'stock' to 'stock_count' so the frontend works
    const data = rows.map(r => ({ ...r, stock_count: r.stock }));
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// POST /api/menu - admin add item
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const { name, outlet_id, outlet, category, price, emoji, status, stock_count, description, eta } = req.body;
    const outletName = outlet || ['RB Kiosk','AK Kiosk','Canteen'][parseInt(outlet_id)-1] || 'RB Kiosk';
    const [result] = await db.query(
      `INSERT INTO menu_items (name, outlet, category, price, emoji, status, stock, description, eta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, outletName, category, price,
       emoji || '???', status || 'available',
       stock_count || 0, description || '', eta || null]
    );
    res.status(201).json({ success: true, message: 'Item added', id: result.insertId });
  } catch (e) { next(e); }
});

// PUT /api/menu/:id - admin update
router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const fields = { name:'name', outlet:'outlet', category:'category', price:'price',
                     emoji:'emoji', status:'status', stock_count:'stock', description:'description', eta:'eta' };
    const updates = []; const values = [];
    Object.entries(fields).forEach(([bodyKey, col]) => {
      if (req.body[bodyKey] !== undefined) { updates.push(`${col} = ?`); values.push(req.body[bodyKey]); }
    });
    if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
    values.push(req.params.id);
    await db.query(`UPDATE menu_items SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, message: 'Item updated' });
  } catch (e) { next(e); }
});

// DELETE /api/menu/:id
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true, message: 'Item deleted' });
  } catch (e) { next(e); }
});

// PATCH /api/menu/:id/status
router.patch('/:id/status', adminOnly, async (req, res, next) => {
  try {
    const { status, stock_count, eta } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status required' });
    await db.query(
      'UPDATE menu_items SET status=?, stock=IFNULL(?,stock), eta=IFNULL(?,eta) WHERE id=?',
      [status, stock_count ?? null, eta ?? null, req.params.id]
    );
    res.json({ success: true, message: 'Status updated' });
  } catch (e) { next(e); }
});

module.exports = router;
