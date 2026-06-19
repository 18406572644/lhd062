const express = require('express');
const { getDb } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 20, type, item_id, start_date, end_date } = req.query;
  const db = getDb();
  const userId = req.user.id;

  let whereClause = 'WHERE r.user_id = ?';
  let params = [userId];

  if (type) {
    whereClause += ' AND r.type = ?';
    params.push(type);
  }

  if (item_id) {
    whereClause += ' AND r.item_id = ?';
    params.push(item_id);
  }

  if (start_date) {
    whereClause += ' AND date(r.created_at) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    whereClause += ' AND date(r.created_at) <= ?';
    params.push(end_date);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM records r ${whereClause}`).get(...params).count;

  const offset = (page - 1) * pageSize;
  const records = db.prepare(`
    SELECT r.*, i.name as item_name, i.unit as item_unit
    FROM records r
    LEFT JOIN items i ON r.item_id = i.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  res.json({
    list: records,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

router.post('/borrow', authMiddleware, (req, res) => {
  const { item_id, quantity, remark } = req.body;
  const db = getDb();
  const userId = req.user.id;

  if (!item_id) {
    return res.status(400).json({ message: '请选择物品' });
  }

  const item = db.prepare('SELECT * FROM items WHERE id = ? AND user_id = ?').get(item_id, userId);
  if (!item) {
    return res.status(404).json({ message: '物品不存在' });
  }

  const borrowQty = quantity || 1;

  const result = db.prepare(`
    INSERT INTO records (user_id, item_id, type, quantity, remark)
    VALUES (?, ?, 'borrow', ?, ?)
  `).run(userId, item_id, borrowQty, remark || '');

  const newQty = Math.max(0, item.quantity - borrowQty);
  const newStatus = newQty <= 0 ? 'borrowed' : item.status;
  const minStock = item.min_stock || 0;
  const needRestock = newQty <= minStock && minStock > 0 ? 1 : 0;
  
  db.prepare(`
    UPDATE items 
    SET quantity = ?, status = ?, need_restock = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newQty, newStatus, needRestock, item_id);

  const record = db.prepare(`
    SELECT r.*, i.name as item_name
    FROM records r
    LEFT JOIN items i ON r.item_id = i.id
    WHERE r.id = ?
  `).get(result.lastInsertRowid);

  res.json({ message: '取用记录已保存', record });
});

router.post('/return', authMiddleware, (req, res) => {
  const { item_id, quantity, remark } = req.body;
  const db = getDb();
  const userId = req.user.id;

  if (!item_id) {
    return res.status(400).json({ message: '请选择物品' });
  }

  const item = db.prepare('SELECT * FROM items WHERE id = ? AND user_id = ?').get(item_id, userId);
  if (!item) {
    return res.status(404).json({ message: '物品不存在' });
  }

  const returnQty = quantity || 1;

  const result = db.prepare(`
    INSERT INTO records (user_id, item_id, type, quantity, remark)
    VALUES (?, ?, 'return', ?, ?)
  `).run(userId, item_id, returnQty, remark || '');

  const newQty = item.quantity + returnQty;
  const minStock = item.min_stock || 0;
  const needRestock = newQty <= minStock && minStock > 0 ? 1 : 0;
  
  db.prepare(`
    UPDATE items 
    SET quantity = ?, status = 'stored', need_restock = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newQty, needRestock, item_id);

  const record = db.prepare(`
    SELECT r.*, i.name as item_name
    FROM records r
    LEFT JOIN items i ON r.item_id = i.id
    WHERE r.id = ?
  `).get(result.lastInsertRowid);

  res.json({ message: '归还记录已保存', record });
});

router.get('/stats', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const borrowCount = db.prepare(`
    SELECT COUNT(*) as count FROM records 
    WHERE user_id = ? AND type = 'borrow' AND date(created_at) = date('now')
  `).get(userId).count;

  const returnCount = db.prepare(`
    SELECT COUNT(*) as count FROM records 
    WHERE user_id = ? AND type = 'return' AND date(created_at) = date('now')
  `).get(userId).count;

  const recentRecords = db.prepare(`
    SELECT r.*, i.name as item_name
    FROM records r
    LEFT JOIN items i ON r.item_id = i.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
    LIMIT 10
  `).all(userId);

  res.json({
    today_borrow: borrowCount,
    today_return: returnCount,
    recent: recentRecords
  });
});

module.exports = router;
