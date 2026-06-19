const express = require('express');
const multer = require('multer');
const path = require('path');
const { getDb } = require('../db');
const authMiddleware = require('../middleware/auth');
const { familyAuthMiddleware, requirePermission, ROLES } = require('../middleware/familyAuth');

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

router.get('/', authMiddleware, familyAuthMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, keyword, location } = req.query;
  const db = getDb();
  const userId = req.user.id;

  let whereClause = '';
  let params = [];

  if (req.space.type === 'private') {
    whereClause = 'WHERE owner_id = ? AND space_type = ?';
    params = [userId, 'private'];
  } else if (req.space.type === 'family') {
    const isOwnerOrAdmin = req.space.role === ROLES.OWNER || req.space.role === ROLES.ADMIN;
    
    if (isOwnerOrAdmin || req.space.shareAll) {
      whereClause = 'WHERE space_type = ? AND space_id = ?';
      params = ['family', req.space.id];
    } else {
      whereClause = `WHERE space_type = ? AND space_id = ? AND (owner_id = ? OR id IN (SELECT box_id FROM shared_boxes WHERE family_id = ?))`;
      params = ['family', req.space.id, userId, req.space.id];
    }
  }

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

router.get('/search', authMiddleware, familyAuthMiddleware, (req, res) => {
  const { keyword } = req.query;
  const db = getDb();
  const userId = req.user.id;

  if (!keyword) {
    return res.json({ list: [] });
  }

  let whereClause = '';
  let params = [];

  if (req.space.type === 'private') {
    whereClause = 'WHERE b.owner_id = ? AND b.space_type = ?';
    params = [userId, 'private'];
  } else if (req.space.type === 'family') {
    const isOwnerOrAdmin = req.space.role === ROLES.OWNER || req.space.role === ROLES.ADMIN;
    
    if (isOwnerOrAdmin || req.space.shareAll) {
      whereClause = 'WHERE b.space_type = ? AND b.space_id = ?';
      params = ['family', req.space.id];
    } else {
      whereClause = `WHERE b.space_type = ? AND b.space_id = ? AND (b.owner_id = ? OR b.id IN (SELECT box_id FROM shared_boxes WHERE family_id = ?))`;
      params = ['family', req.space.id, userId, req.space.id];
    }
  }

  whereClause += ' AND (b.name LIKE ? OR b.description LIKE ? OR b.location LIKE ?)';
  params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);

  const boxes = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM items i WHERE i.box_id = b.id) as item_count
    FROM boxes b
    ${whereClause}
    ORDER BY b.name ASC
    LIMIT 20
  `).all(...params);

  res.json({ list: boxes });
});

router.get('/all', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  let whereClause = '';
  let params = [];

  if (req.space.type === 'private') {
    whereClause = 'WHERE owner_id = ? AND space_type = ?';
    params = [userId, 'private'];
  } else if (req.space.type === 'family') {
    const isOwnerOrAdmin = req.space.role === ROLES.OWNER || req.space.role === ROLES.ADMIN;
    
    if (isOwnerOrAdmin || req.space.shareAll) {
      whereClause = 'WHERE space_type = ? AND space_id = ?';
      params = ['family', req.space.id];
    } else {
      whereClause = `WHERE space_type = ? AND space_id = ? AND (owner_id = ? OR id IN (SELECT box_id FROM shared_boxes WHERE family_id = ?))`;
      params = ['family', req.space.id, userId, req.space.id];
    }
  }

  const boxes = db.prepare(`
    SELECT id, name, location, color, space_type, space_id, owner_id
    FROM boxes 
    ${whereClause}
    ORDER BY name ASC
  `).all(...params);
  
  res.json({ list: boxes });
});

router.get('/:id', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const boxId = req.params.id;

  let boxWhereClause = '';
  let boxParams = [];

  if (req.space.type === 'private') {
    boxWhereClause = 'WHERE b.id = ? AND b.owner_id = ? AND b.space_type = ?';
    boxParams = [boxId, userId, 'private'];
  } else if (req.space.type === 'family') {
    const isOwnerOrAdmin = req.space.role === ROLES.OWNER || req.space.role === ROLES.ADMIN;
    
    if (isOwnerOrAdmin || req.space.shareAll) {
      boxWhereClause = 'WHERE b.id = ? AND b.space_type = ? AND b.space_id = ?';
      boxParams = [boxId, 'family', req.space.id];
    } else {
      boxWhereClause = `WHERE b.id = ? AND b.space_type = ? AND b.space_id = ? AND (b.owner_id = ? OR b.id IN (SELECT box_id FROM shared_boxes WHERE family_id = ?))`;
      boxParams = [boxId, 'family', req.space.id, userId, req.space.id];
    }
  }

  const box = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM items i WHERE i.box_id = b.id) as item_count,
      (SELECT COUNT(*) FROM items i WHERE i.box_id = b.id AND i.status = 'stored') as stored_count
    FROM boxes b
    ${boxWhereClause}
  `).get(...boxParams);

  if (!box) {
    return res.status(404).json({ message: '收纳盒不存在' });
  }

  let itemsWhereClause = '';
  let itemsParams = [];

  if (req.space.type === 'private') {
    itemsWhereClause = 'WHERE box_id = ? AND owner_id = ? AND space_type = ?';
    itemsParams = [boxId, userId, 'private'];
  } else if (req.space.type === 'family') {
    itemsWhereClause = 'WHERE box_id = ? AND space_type = ? AND space_id = ?';
    itemsParams = [boxId, 'family', req.space.id];
  }

  const items = db.prepare(`
    SELECT * FROM items 
    ${itemsWhereClause}
    ORDER BY created_at DESC
  `).all(...itemsParams);

  res.json({ ...box, items });
});

router.post('/', authMiddleware, familyAuthMiddleware, requirePermission('manage_boxes'), (req, res) => {
  const { name, location, width, height, depth, color, description, image } = req.body;
  const db = getDb();
  const userId = req.user.id;

  if (!name) {
    return res.status(400).json({ message: '收纳盒名称不能为空' });
  }

  const result = db.prepare(`
    INSERT INTO boxes (user_id, owner_id, space_type, space_id, name, location, width, height, depth, color, description, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    userId,
    req.space.type,
    req.space.type === 'family' ? req.space.id : null,
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

router.post('/upload', authMiddleware, familyAuthMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请选择图片文件' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ message: '上传成功', imageUrl });
});

router.put('/:id', authMiddleware, familyAuthMiddleware, requirePermission('manage_boxes'), (req, res) => {
  const { name, location, width, height, depth, color, description, image } = req.body;
  const db = getDb();
  const boxId = req.params.id;
  const userId = req.user.id;

  let whereClause = '';
  let params = [];

  if (req.space.type === 'private') {
    whereClause = 'WHERE id = ? AND owner_id = ? AND space_type = ?';
    params = [boxId, userId, 'private'];
  } else if (req.space.type === 'family') {
    const isOwnerOrAdmin = req.space.role === ROLES.OWNER || req.space.role === ROLES.ADMIN;
    
    if (isOwnerOrAdmin) {
      whereClause = 'WHERE id = ? AND space_type = ? AND space_id = ?';
      params = [boxId, 'family', req.space.id];
    } else {
      whereClause = 'WHERE id = ? AND space_type = ? AND space_id = ? AND owner_id = ?';
      params = [boxId, 'family', req.space.id, userId];
    }
  }

  const existingBox = db.prepare(`SELECT id FROM boxes ${whereClause}`).get(...params);
  if (!existingBox) {
    return res.status(404).json({ message: '收纳盒不存在' });
  }

  const updateParams = [
    name,
    location || '',
    width || 0,
    height || 0,
    depth || 0,
    color || '#F5F5DC',
    description || '',
    image || null,
    ...params
  ];

  db.prepare(`
    UPDATE boxes 
    SET name = ?, location = ?, width = ?, height = ?, depth = ?, color = ?, description = ?, image = ?, updated_at = CURRENT_TIMESTAMP
    ${whereClause}
  `).run(...updateParams);

  const box = db.prepare('SELECT * FROM boxes WHERE id = ?').get(boxId);
  res.json({ message: '更新成功', box });
});

router.delete('/:id', authMiddleware, familyAuthMiddleware, requirePermission('manage_boxes'), (req, res) => {
  const db = getDb();
  const boxId = req.params.id;
  const userId = req.user.id;

  let whereClause = '';
  let params = [];

  if (req.space.type === 'private') {
    whereClause = 'WHERE id = ? AND owner_id = ? AND space_type = ?';
    params = [boxId, userId, 'private'];
  } else if (req.space.type === 'family') {
    const isOwnerOrAdmin = req.space.role === ROLES.OWNER || req.space.role === ROLES.ADMIN;
    
    if (isOwnerOrAdmin) {
      whereClause = 'WHERE id = ? AND space_type = ? AND space_id = ?';
      params = [boxId, 'family', req.space.id];
    } else {
      whereClause = 'WHERE id = ? AND space_type = ? AND space_id = ? AND owner_id = ?';
      params = [boxId, 'family', req.space.id, userId];
    }
  }

  const existingBox = db.prepare(`SELECT id FROM boxes ${whereClause}`).get(...params);
  if (!existingBox) {
    return res.status(404).json({ message: '收纳盒不存在' });
  }

  db.prepare(`DELETE FROM boxes ${whereClause}`).run(...params);
  res.json({ message: '删除成功' });
});

module.exports = router;
