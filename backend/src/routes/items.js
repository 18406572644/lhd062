const express = require('express');
const multer = require('multer');
const path = require('path');
const { getDb } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'item-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片文件上传'));
    }
  }
});

router.get('/', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, keyword, category, box_id, status, expire_soon, low_stock, need_restock } = req.query;
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
    whereClause += ' AND i.quantity <= COALESCE(NULLIF(i.min_stock, 0), 2)';
  }

  if (need_restock === 'true') {
    whereClause += ' AND i.need_restock = 1';
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

router.post('/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请选择图片文件' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ message: '上传成功', imageUrl });
});

router.post('/', authMiddleware, (req, res) => {
  const { name, box_id, category, quantity, unit, expire_date, description, image, min_stock } = req.body;
  const db = getDb();

  if (!name) {
    return res.status(400).json({ message: '物品名称不能为空' });
  }

  const qty = quantity || 1;
  const minStock = min_stock || 0;
  const needRestock = qty <= minStock && minStock > 0 ? 1 : 0;

  const result = db.prepare(`
    INSERT INTO items (user_id, box_id, name, category, quantity, unit, expire_date, description, image, min_stock, need_restock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    box_id || null,
    name,
    category || '',
    qty,
    unit || '个',
    expire_date || null,
    description || '',
    image || null,
    minStock,
    needRestock
  );

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  res.json({ message: '添加成功', item });
});

router.put('/:id', authMiddleware, (req, res) => {
  const { name, box_id, category, quantity, unit, expire_date, description, status, image, min_stock } = req.body;
  const db = getDb();
  const itemId = req.params.id;

  const existingItem = db.prepare('SELECT id FROM items WHERE id = ? AND user_id = ?').get(itemId, req.user.id);
  if (!existingItem) {
    return res.status(404).json({ message: '物品不存在' });
  }

  const qty = quantity || 1;
  const minStock = min_stock || 0;
  const needRestock = qty <= minStock && minStock > 0 ? 1 : 0;

  db.prepare(`
    UPDATE items 
    SET name = ?, box_id = ?, category = ?, quantity = ?, unit = ?, expire_date = ?, description = ?, status = ?, image = ?, min_stock = ?, need_restock = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(
    name,
    box_id || null,
    category || '',
    qty,
    unit || '个',
    expire_date || null,
    description || '',
    status || 'stored',
    image || null,
    minStock,
    needRestock,
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
