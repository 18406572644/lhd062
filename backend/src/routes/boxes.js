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
    cb(null, 'box-' + uniqueSuffix + path.extname(file.originalname));
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
  const { page = 1, pageSize = 10, keyword, location } = req.query;
  const db = getDb();
  const userId = req.user.id;

  let whereClause = 'WHERE user_id = ?';
  let params = [userId];

  if (keyword) {
    whereClause += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (location) {
    whereClause += ' AND location LIKE ?';
    params.push(`%${location}%`);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM boxes ${whereClause}`).get(...params).count;

  const offset = (page - 1) * pageSize;
  const boxes = db.prepare(`
    SELECT b.*, 
      (SELECT COUNT(*) FROM items i WHERE i.box_id = b.id) as item_count
    FROM boxes b
    ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  res.json({
    list: boxes,
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

  const boxes = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM items i WHERE i.box_id = b.id) as item_count
    FROM boxes b
    WHERE b.user_id = ? AND (b.name LIKE ? OR b.description LIKE ? OR b.location LIKE ?)
    ORDER BY b.name ASC
    LIMIT 20
  `).all(userId, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);

  res.json({ list: boxes });
});

router.get('/all', authMiddleware, (req, res) => {
  const db = getDb();
  const boxes = db.prepare(`
    SELECT id, name, location, color
    FROM boxes 
    WHERE user_id = ?
    ORDER BY name ASC
  `).all(req.user.id);
  
  res.json({ list: boxes });
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const box = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM items i WHERE i.box_id = b.id) as item_count,
      (SELECT COUNT(*) FROM items i WHERE i.box_id = b.id AND i.status = 'stored') as stored_count
    FROM boxes b
    WHERE b.id = ? AND b.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!box) {
    return res.status(404).json({ message: '收纳盒不存在' });
  }

  const items = db.prepare(`
    SELECT * FROM items 
    WHERE box_id = ? AND user_id = ?
    ORDER BY created_at DESC
  `).all(req.params.id, req.user.id);

  res.json({ ...box, items });
});

router.post('/', authMiddleware, (req, res) => {
  const { name, location, width, height, depth, color, description, image } = req.body;
  const db = getDb();

  if (!name) {
    return res.status(400).json({ message: '收纳盒名称不能为空' });
  }

  const result = db.prepare(`
    INSERT INTO boxes (user_id, name, location, width, height, depth, color, description, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    name,
    location || '',
    width || 0,
    height || 0,
    depth || 0,
    color || '#F5F5DC',
    description || '',
    image || null
  );

  const box = db.prepare('SELECT * FROM boxes WHERE id = ?').get(result.lastInsertRowid);
  res.json({ message: '创建成功', box });
});

router.post('/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请选择图片文件' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ message: '上传成功', imageUrl });
});

router.put('/:id', authMiddleware, (req, res) => {
  const { name, location, width, height, depth, color, description, image } = req.body;
  const db = getDb();
  const boxId = req.params.id;

  const existingBox = db.prepare('SELECT id FROM boxes WHERE id = ? AND user_id = ?').get(boxId, req.user.id);
  if (!existingBox) {
    return res.status(404).json({ message: '收纳盒不存在' });
  }

  db.prepare(`
    UPDATE boxes 
    SET name = ?, location = ?, width = ?, height = ?, depth = ?, color = ?, description = ?, image = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(
    name,
    location || '',
    width || 0,
    height || 0,
    depth || 0,
    color || '#F5F5DC',
    description || '',
    image || null,
    boxId,
    req.user.id
  );

  const box = db.prepare('SELECT * FROM boxes WHERE id = ?').get(boxId);
  res.json({ message: '更新成功', box });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const boxId = req.params.id;

  const existingBox = db.prepare('SELECT id FROM boxes WHERE id = ? AND user_id = ?').get(boxId, req.user.id);
  if (!existingBox) {
    return res.status(404).json({ message: '收纳盒不存在' });
  }

  db.prepare('DELETE FROM boxes WHERE id = ? AND user_id = ?').run(boxId, req.user.id);
  res.json({ message: '删除成功' });
});

module.exports = router;
