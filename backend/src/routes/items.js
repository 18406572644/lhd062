const express = require('express');
const { getDb } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, keyword, category, box_id, status, expire_soon, low_stock } = req.query;
  const db = getDb();
  const userId = req.user.id;

  let whereClause = 'WHERE i.user_id = ?';
  let params = [userId];

  if (keyword) {
    whereClause += ' AND (i.name LIKE ? OR i.description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (category) {
    whereClause += ' AND i.category = ?';
    params.push(category);
  }

  if (box_id) {
    whereClause += ' AND i.box_id = ?';
    params.push(box_id);
  }

  if (status) {
    whereClause += ' AND i.status = ?';
    params.push(status);
  }

  if (expire_soon === 'true') {
    whereClause += ' AND i.expire_date IS NOT NULL AND i.expire_date <= date("now", "+30 days") AND i.expire_date >= date("now")';
  }

  if (low_stock === 'true') {
    whereClause += ' AND i.quantity <= 2';
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM items i ${whereClause}`).get(...params).count;

  const offset = (page - 1) * pageSize;
  const items = db.prepare(`
    SELECT i.*, b.name as box_name, b.location as box_location
    FROM items i
    LEFT JOIN boxes b ON i.box_id = b.id
    ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  res.json({
    list: items,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

router.get('/search', authMiddleware, (req, res) => {
  const { keyword } = req.query;
  const db = getDb();
  const userId = req.user.id;

  if (!keyword) {
    return res.json({ list: [] });
  }

  const items = db.prepare(`
    SELECT i.*, b.name as box_name, b.location as box_location
    FROM items i
    LEFT JOIN boxes b ON i.box_id = b.id
    WHERE i.user_id = ? AND (i.name LIKE ? OR i.description LIKE ? OR i.category LIKE ?)
    ORDER BY i.name ASC
    LIMIT 20
  `).all(userId, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);

  res.json({ list: items });
});

router.get('/categories', authMiddleware, (req, res) => {
  const db = getDb();
  const categories = db.prepare(`
    SELECT DISTINCT category 
    FROM items 
    WHERE user_id = ? AND category IS NOT NULL AND category != ''
    ORDER BY category ASC
  `).all(req.user.id).map(row => row.category);

  res.json({ categories });
});

router.get('/expiring', authMiddleware, (req, res) => {
  const { days = 30 } = req.query;
  const db = getDb();
  const userId = req.user.id;

  const items = db.prepare(`
    SELECT i.*, b.name as box_name, b.location as box_location,
      CAST(julianday(i.expire_date) - julianday(date('now')) AS INTEGER) as days_left
    FROM items i
    LEFT JOIN boxes b ON i.box_id = b.id
    WHERE i.user_id = ? 
      AND i.expire_date IS NOT NULL 
      AND i.expire_date != ''
      AND i.status = 'stored'
    ORDER BY i.expire_date ASC
  `).all(userId);

  const filtered = items.filter(item => {
    const daysLeft = item.days_left;
    return daysLeft <= parseInt(days) && daysLeft >= -365;
  });

  res.json({ list: filtered });
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const item = db.prepare(`
    SELECT i.*, b.name as box_name, b.location as box_location
    FROM items i
    LEFT JOIN boxes b ON i.box_id = b.id
    WHERE i.id = ? AND i.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!item) {
    return res.status(404).json({ message: '物品不存在' });
  }

  res.json(item);
});

router.post('/', authMiddleware, (req, res) => {
  const { name, box_id, category, quantity, unit, expire_date, description } = req.body;
  const db = getDb();

  if (!name) {
    return res.status(400).json({ message: '物品名称不能为空' });
  }

  const result = db.prepare(`
    INSERT INTO items (user_id, box_id, name, category, quantity, unit, expire_date, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    box_id || null,
    name,
    category || '',
    quantity || 1,
    unit || '个',
    expire_date || null,
    description || ''
  );

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  res.json({ message: '添加成功', item });
});

router.put('/:id', authMiddleware, (req, res) => {
  const { name, box_id, category, quantity, unit, expire_date, description, status } = req.body;
  const db = getDb();
  const itemId = req.params.id;

  const existingItem = db.prepare('SELECT id FROM items WHERE id = ? AND user_id = ?').get(itemId, req.user.id);
  if (!existingItem) {
    return res.status(404).json({ message: '物品不存在' });
  }

  db.prepare(`
    UPDATE items 
    SET name = ?, box_id = ?, category = ?, quantity = ?, unit = ?, expire_date = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(
    name,
    box_id || null,
    category || '',
    quantity || 1,
    unit || '个',
    expire_date || null,
    description || '',
    status || 'stored',
    itemId,
    req.user.id
  );

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  res.json({ message: '更新成功', item });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const itemId = req.params.id;

  const existingItem = db.prepare('SELECT id FROM items WHERE id = ? AND user_id = ?').get(itemId, req.user.id);
  if (!existingItem) {
    return res.status(404).json({ message: '物品不存在' });
  }

  db.prepare('DELETE FROM items WHERE id = ? AND user_id = ?').run(itemId, req.user.id);
  res.json({ message: '删除成功' });
});

module.exports = router;
