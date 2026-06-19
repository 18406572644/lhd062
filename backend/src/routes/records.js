const express = require('express');
const { getDb } = require('../db');
const authMiddleware = require('../middleware/auth');
const { familyAuthMiddleware, requirePermission, canAccessItem } = require('../middleware/familyAuth');

const router = express.Router();

router.get('/', authMiddleware, familyAuthMiddleware, (req, res) => {
  const { page = 1, pageSize = 20, type, item_id, start_date, end_date } = req.query;
  const db = getDb();
  const userId = req.user.id;

  let whereClause;
  let params = [];

  if (req.space.type === 'private') {
    whereClause = 'WHERE r.user_id = ? AND r.space_type = ?';
    params = [userId, 'private'];
  } else {
    whereClause = 'WHERE r.space_type = ? AND r.space_id = ?';
    params = ['family', req.space.id];
  }

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

router.post('/borrow', authMiddleware, familyAuthMiddleware, requirePermission('borrow_return'), (req, res) => {
  const { item_id, quantity, remark } = req.body;
  const db = getDb();
  const userId = req.user.id;
  const operatorId = req.user.id;
  const operatorName = req.user.nickname || req.user.username;
  const spaceType = req.space.type;
  const spaceId = req.space.type === 'family' ? req.space.id : null;

  if (!item_id) {
    return res.status(400).json({ message: '请选择物品' });
  }

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) {
    return res.status(404).json({ message: '物品不存在' });
  }

  if (!canAccessItem(item, userId, req.space.id)) {
    return res.status(403).json({ message: '无权限操作该物品' });
  }

  const borrowQty = quantity || 1;

  const result = db.prepare(`
    INSERT INTO records (user_id, item_id, type, quantity, remark, operator_id, operator_name, space_type, space_id)
    VALUES (?, ?, 'borrow', ?, ?, ?, ?, ?, ?)
  `).run(userId, item_id, borrowQty, remark || '', operatorId, operatorName, spaceType, spaceId);

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

router.post('/return', authMiddleware, familyAuthMiddleware, requirePermission('borrow_return'), (req, res) => {
  const { item_id, quantity, remark } = req.body;
  const db = getDb();
  const userId = req.user.id;
  const operatorId = req.user.id;
  const operatorName = req.user.nickname || req.user.username;
  const spaceType = req.space.type;
  const spaceId = req.space.type === 'family' ? req.space.id : null;

  if (!item_id) {
    return res.status(400).json({ message: '请选择物品' });
  }

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) {
    return res.status(404).json({ message: '物品不存在' });
  }

  if (!canAccessItem(item, userId, req.space.id)) {
    return res.status(403).json({ message: '无权限操作该物品' });
  }

  const returnQty = quantity || 1;

  const result = db.prepare(`
    INSERT INTO records (user_id, item_id, type, quantity, remark, operator_id, operator_name, space_type, space_id)
    VALUES (?, ?, 'return', ?, ?, ?, ?, ?, ?)
  `).run(userId, item_id, returnQty, remark || '', operatorId, operatorName, spaceType, spaceId);

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

router.get('/stats', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  let borrowWhere, returnWhere, recentWhere;
  let borrowParams, returnParams, recentParams;

  if (req.space.type === 'private') {
    borrowWhere = 'WHERE user_id = ? AND space_type = ? AND type = ? AND date(created_at) = date(\'now\')';
    borrowParams = [userId, 'private', 'borrow'];
    
    returnWhere = 'WHERE user_id = ? AND space_type = ? AND type = ? AND date(created_at) = date(\'now\')';
    returnParams = [userId, 'private', 'return'];
    
    recentWhere = 'WHERE r.user_id = ? AND r.space_type = ?';
    recentParams = [userId, 'private'];
  } else {
    borrowWhere = 'WHERE space_type = ? AND space_id = ? AND type = ? AND date(created_at) = date(\'now\')';
    borrowParams = ['family', req.space.id, 'borrow'];
    
    returnWhere = 'WHERE space_type = ? AND space_id = ? AND type = ? AND date(created_at) = date(\'now\')';
    returnParams = ['family', req.space.id, 'return'];
    
    recentWhere = 'WHERE r.space_type = ? AND r.space_id = ?';
    recentParams = ['family', req.space.id];
  }

  const borrowCount = db.prepare(`
    SELECT COUNT(*) as count FROM records 
    ${borrowWhere}
  `).get(...borrowParams).count;

  const returnCount = db.prepare(`
    SELECT COUNT(*) as count FROM records 
    ${returnWhere}
  `).get(...returnParams).count;

  const recentRecords = db.prepare(`
    SELECT r.*, i.name as item_name
    FROM records r
    LEFT JOIN items i ON r.item_id = i.id
    ${recentWhere}
    ORDER BY r.created_at DESC
    LIMIT 10
  `).all(...recentParams);

  res.json({
    today_borrow: borrowCount,
    today_return: returnCount,
    recent: recentRecords
  });
});

module.exports = router;
