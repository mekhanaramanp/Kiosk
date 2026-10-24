// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);
  if (err.code === 'ER_DUP_ENTRY')
    return res.status(409).json({ success: false, error: 'Duplicate entry already exists.' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2')
    return res.status(409).json({ success: false, error: 'Foreign key constraint violated.' });
  if (err.code === 'ER_SIGNAL_EXCEPTION')
    return res.status(409).json({ success: false, error: err.sqlMessage });
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal server error' });
}
module.exports = errorHandler;
