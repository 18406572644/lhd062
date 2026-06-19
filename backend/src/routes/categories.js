const express = require('express');
const { getDb } = require('../db');
const authMiddleware = require('../middleware/auth');
const { familyAuthMiddleware, requirePermission } = require('../middleware/familyAuth');

const router = express.Router();

function buildSpaceWhereClause(req, tableAlias = 'c') {
  const params = [];
  let whereClause = '';
  
  if (req.space.type === 'private') {
    whereClause = `WHERE ${tableAlias}.user_id = ? AND ${tableAlias}.space_type = 'private'`;
    params.push(req.user.id);
  } else if (req.space.type === 'family') {
    const familyId = req.space.id;
    const isOwnerOrAdmin = req.space.role === 'owner' || req.space.role === 'admin';
    const shareAll = req.space.shareAll;
    
    if (isOwnerOrAdmin || shareAll) {
      whereClause = `WHERE ${tableAlias}.space_type = 'family' AND ${tableAlias}.space_id = ?`;
      params.push(familyId);
    } else {
      whereClause = `WHERE ${tableAlias}.space_type = 'family' AND ${tableAlias}.space_id = ? AND ${tableAlias}.owner_id = ?`;
      params.push(familyId, req.user.id);
    }
  }
  
  return { whereClause, params };
}

function buildSpaceWhereClauseNoWhere(req, tableAlias = 'c') {
  const result = buildSpaceWhereClause(req, tableAlias);
  return {
    whereClause: result.whereClause.replace(/^WHERE\s*/, ''),
    params: result.params
  };
}

router.get('/', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const { whereClause, params } = buildSpaceWhereClause(req);

  const categories = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM items i 
        WHERE (
          (i.space_type = 'private' AND i.user_id = c.user_id AND i.space_type = c.space_type)
          OR
          (i.space_type = 'family' AND i.space_id = c.space_id AND i.space_type = c.space_type)
        )
        AND (i.category = c.name OR i.category_id = c.id)
      ) as item_count
    FROM categories c
    ${whereClause}
    ORDER BY c.sort_order ASC, c.created_at ASC
  `).all(...params);

  res.json({ list: categories });
});

router.get('/:id', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const { whereClause, params } = buildSpaceWhereClauseNoWhere(req);
  params.unshift(req.params.id);

  const category = db.prepare(`
    SELECT * FROM categories c WHERE c.id = ? AND ${whereClause}`).get(...params);

  if (!category) {
    return res.status(404).json({ message: '分类不存在' });
  }

  const itemCount = db.prepare(`
    SELECT COUNT(*) as count FROM items 
    WHERE (category = ? OR category_id = ?)
    AND space_type = ? 
    AND (
      (space_type = 'private' AND user_id = ? AND space_type = ?)
      OR
      (space_type = 'family' AND space_id = ? AND space_type = ?)
    )
  `).get(
    category.name,
    category.id,
    category.space_type,
    category.user_id, 'private',
    category.space_id, 'family'
  ).count;

  res.json({ ...category, item_count: itemCount });
});

router.post('/', authMiddleware, familyAuthMiddleware, requirePermission('manage_items'), (req, res) => {
  const { name, icon, color, sort_order } = req.body;
  const db = getDb();

  if (!name || !name.trim()) {
    return res.status(400).json({ message: '分类名称不能为空' });
  }

  const spaceType = req.space.type;
  const spaceId = req.space.type === 'family' ? req.space.id : null;

  const { whereClause, params } = buildSpaceWhereClauseNoWhere(req);

  const existing = db.prepare(`
    SELECT id FROM categories c WHERE c.name = ? AND ${whereClause}`).get(name.trim(), ...params);

  if (existing) {
    return res.status(400).json({ message: '分类名称已存在' });
  }

  const result = db.prepare(`
    INSERT INTO categories (user_id, owner_id, space_type, space_id, name, icon, color, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    req.user.id,
    spaceType,
    spaceId,
    name.trim(),
    icon || '',
    color || '',
    sort_order || 0
  );

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  res.json({ message: '创建成功', category });
});

router.put('/:id', authMiddleware, familyAuthMiddleware, requirePermission('manage_items'), (req, res) => {
  const { name, icon, color, sort_order } = req.body;
  const db = getDb();
  const categoryId = req.params.id;

  const { whereClause, params } = buildSpaceWhereClauseNoWhere(req);
  params.unshift(categoryId);

  const existingCategory = db.prepare(`SELECT * FROM categories c WHERE c.id = ? AND ${whereClause}`).get(...params);
  if (!existingCategory) {
    return res.status(404).json({ message: '分类不存在' });
  }

  if (name && name.trim() && name.trim() !== existingCategory.name) {
    const nameCheckParams = [name.trim(), ...params.slice(1)];
    const duplicate = db.prepare(`SELECT id FROM categories c WHERE c.name = ? AND ${whereClause} AND c.id != ?`).get(name.trim(), ...params.slice(1), categoryId);
    if (duplicate) {
      return res.status(400).json({ message: '分类名称已存在' });
    }
  }

  const updateName = name ? name.trim() : existingCategory.name;
  const updateIcon = icon !== undefined ? icon : existingCategory.icon;
  const updateColor = color !== undefined ? color : existingCategory.color;
  const updateSortOrder = sort_order !== undefined ? sort_order : existingCategory.sort_order;

  const updateParams = [
    updateName,
    updateIcon,
    updateColor,
    updateSortOrder,
    categoryId
  ];

  let updateWhere = 'WHERE id = ?';
  if (req.space.type === 'private') {
    updateWhere += ' AND user_id = ?';
    updateParams.push(req.user.id);
  } else {
    updateWhere += ' AND space_type = ? AND space_id = ?';
    updateParams.push('family', req.space.id);
  }

  db.prepare(`
    UPDATE categories 
    SET name = ?, icon = ?, color = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    ${updateWhere}
  `).run(...updateParams);

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
  res.json({ message: '更新成功', category });
});

router.delete('/:id', authMiddleware, familyAuthMiddleware, requirePermission('manage_items'), (req, res) => {
  const db = getDb();
  const categoryId = req.params.id;

  const { whereClause, params } = buildSpaceWhereClauseNoWhere(req);
  params.unshift(categoryId);

  const existingCategory = db.prepare(`SELECT * FROM categories c WHERE c.id = ? AND ${whereClause}`).get(...params);
  if (!existingCategory) {
    return res.status(404).json({ message: '分类不存在' });
  }

  const deleteParams = [categoryId];
  let deleteWhere = 'WHERE id = ?';

  if (req.space.type === 'private') {
    deleteWhere += ' AND user_id = ?';
    deleteParams.push(req.user.id);
  } else {
    deleteWhere += ' AND space_type = ? AND space_id = ?';
    deleteParams.push('family', req.space.id);
  }

  db.prepare(`DELETE FROM categories ${deleteWhere}`).run(...deleteParams);
  res.json({ message: '删除成功' });
});

router.post('/:id/items/move', authMiddleware, familyAuthMiddleware, requirePermission('manage_items'), (req, res) => {
  const { target_category_id, delete_items } = req.body;
  const db = getDb();
  const categoryId = req.params.id;

  const { whereClause, params } = buildSpaceWhereClauseNoWhere(req, 'c');
  params.unshift(categoryId);

  const sourceCategory = db.prepare(`SELECT * FROM categories c WHERE c.id = ? AND ${whereClause}`).get(...params);
  if (!sourceCategory) {
    return res.status(404).json({ message: '源分类不存在' });
  }

  const itemWhere = buildSpaceWhereClauseNoWhere(req, 'i');

  if (delete_items) {
    const deleteItemParams = [...itemWhere.params];
    db.prepare(`
      DELETE FROM items 
      WHERE (category_id = ? OR category = ?)
      AND ${itemWhere.whereClause}
    `).run(categoryId, sourceCategory.name, ...deleteItemParams);
    
    return res.json({ message: '删除成功' });
  }

  if (target_category_id) {
    const targetCategory = db.prepare(`SELECT * FROM categories c WHERE c.id = ? AND ${whereClause}`).get(target_category_id, ...params.slice(1));
    if (!targetCategory) {
      return res.status(404).json({ message: '目标分类不存在' });
    }

    const updateItemParams = [target_category_id, targetCategory.name, categoryId, sourceCategory.name, ...itemWhere.params];
    
    db.prepare(`
      UPDATE items 
      SET category_id = ?, category = ?, updated_at = CURRENT_TIMESTAMP
      WHERE (category_id = ? OR category = ?)
      AND ${itemWhere.whereClause}
    `).run(...updateItemParams);
    
    return res.json({ message: '移动成功' });
  }

  res.status(400).json({ message: '请选择操作方式' });
});

module.exports = router;
