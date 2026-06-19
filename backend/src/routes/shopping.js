const express = require('express');
const { getDb } = require('../db');
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

function generateShareCode() {
  return crypto.randomBytes(6).toString('hex').substring(0, 12);
}

router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const lists = db.prepare(`
    SELECT sl.*,
      COUNT(si.id) as item_count,
      SUM(CASE WHEN si.purchased = 1 THEN 1 ELSE 0 END) as purchased_count
    FROM shopping_lists sl
    LEFT JOIN shopping_items si ON sl.id = si.list_id
    WHERE sl.user_id = ?
    GROUP BY sl.id
    ORDER BY sl.is_active DESC, sl.updated_at DESC
  `).all(userId);

  res.json({ list: lists });
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const listId = req.params.id;

  const list = db.prepare(`
    SELECT * FROM shopping_lists WHERE id = ? AND user_id = ?
  `).get(listId, userId);

  if (!list) {
    return res.status(404).json({ message: '购物清单不存在' });
  }

  const items = db.prepare(`
    SELECT si.*, i.box_id
    FROM shopping_items si
    LEFT JOIN items i ON si.item_id = i.id
    WHERE si.list_id = ? AND si.user_id = ?
    ORDER BY si.purchased ASC, si.created_at DESC
  `).all(listId, userId);

  res.json({ ...list, items });
});

router.post('/', authMiddleware, (req, res) => {
  const { name, description } = req.body;
  const db = getDb();
  const userId = req.user.id;

  if (!name) {
    return res.status(400).json({ message: '清单名称不能为空' });
  }

  const result = db.prepare(`
    INSERT INTO shopping_lists (user_id, name, description)
    VALUES (?, ?, ?)
  `).run(userId, name, description || '');

  const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(result.lastInsertRowid);
  res.json({ message: '创建成功', list });
});

router.put('/:id', authMiddleware, (req, res) => {
  const { name, description, is_active } = req.body;
  const db = getDb();
  const userId = req.user.id;
  const listId = req.params.id;

  const existingList = db.prepare('SELECT id FROM shopping_lists WHERE id = ? AND user_id = ?').get(listId, userId);
  if (!existingList) {
    return res.status(404).json({ message: '购物清单不存在' });
  }

  db.prepare(`
    UPDATE shopping_lists 
    SET name = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(
    name,
    description || '',
    is_active !== undefined ? (is_active ? 1 : 0) : 1,
    listId,
    userId
  );

  const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(listId);
  res.json({ message: '更新成功', list });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const listId = req.params.id;

  const existingList = db.prepare('SELECT id FROM shopping_lists WHERE id = ? AND user_id = ?').get(listId, userId);
  if (!existingList) {
    return res.status(404).json({ message: '购物清单不存在' });
  }

  db.prepare('DELETE FROM shopping_lists WHERE id = ? AND user_id = ?').run(listId, userId);
  res.json({ message: '删除成功' });
});

router.post('/:id/items', authMiddleware, (req, res) => {
  const { item_id, name, category, quantity, unit, price, remark } = req.body;
  const db = getDb();
  const userId = req.user.id;
  const listId = req.params.id;

  const existingList = db.prepare('SELECT id FROM shopping_lists WHERE id = ? AND user_id = ?').get(listId, userId);
  if (!existingList) {
    return res.status(404).json({ message: '购物清单不存在' });
  }

  if (!name && !item_id) {
    return res.status(400).json({ message: '物品名称不能为空' });
  }

  let itemName = name;
  let itemCategory = category;
  let itemUnit = unit || '个';

  if (item_id) {
    const item = db.prepare('SELECT name, category, unit FROM items WHERE id = ? AND user_id = ?').get(item_id, userId);
    if (item) {
      itemName = itemName || item.name;
      itemCategory = itemCategory || item.category;
      itemUnit = itemUnit || item.unit || '个';
    }
  }

  const result = db.prepare(`
    INSERT INTO shopping_items (list_id, user_id, item_id, name, category, quantity, unit, price, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    listId,
    userId,
    item_id || null,
    itemName,
    itemCategory || '',
    quantity || 1,
    itemUnit,
    price || null,
    remark || ''
  );

  db.prepare('UPDATE shopping_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(listId);

  const item = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(result.lastInsertRowid);
  res.json({ message: '添加成功', item });
});

router.post('/:id/items/batch', authMiddleware, (req, res) => {
  const { items } = req.body;
  const db = getDb();
  const userId = req.user.id;
  const listId = req.params.id;

  const existingList = db.prepare('SELECT id FROM shopping_lists WHERE id = ? AND user_id = ?').get(listId, userId);
  if (!existingList) {
    return res.status(404).json({ message: '购物清单不存在' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: '物品列表不能为空' });
  }

  const insertStmt = db.prepare(`
    INSERT INTO shopping_items (list_id, user_id, item_id, name, category, quantity, unit, price, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(itemList => {
    for (const item of itemList) {
      if (item.item_id) {
        const existingItem = db.prepare('SELECT name, category, unit FROM items WHERE id = ? AND user_id = ?').get(item.item_id, userId);
        if (existingItem) {
          insertStmt.run(
            listId,
            userId,
            item.item_id,
            item.name || existingItem.name,
            item.category || existingItem.category || '',
            item.quantity || 1,
            item.unit || existingItem.unit || '个',
            item.price || null,
            item.remark || ''
          );
        }
      } else if (item.name) {
        insertStmt.run(
          listId,
          userId,
          null,
          item.name,
          item.category || '',
          item.quantity || 1,
          item.unit || '个',
          item.price || null,
          item.remark || ''
        );
      }
    }
  });

  transaction(items);

  db.prepare('UPDATE shopping_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(listId);

  res.json({ message: `成功添加 ${items.length} 个物品` });
});

router.put('/:id/items/:itemId', authMiddleware, (req, res) => {
  const { name, category, quantity, unit, price, remark, purchased } = req.body;
  const db = getDb();
  const userId = req.user.id;
  const listId = req.params.id;
  const itemId = req.params.itemId;

  const existingItem = db.prepare(`
    SELECT si.* FROM shopping_items si
    WHERE si.id = ? AND si.list_id = ? AND si.user_id = ?
  `).get(itemId, listId, userId);

  if (!existingItem) {
    return res.status(404).json({ message: '购物清单项不存在' });
  }

  db.prepare(`
    UPDATE shopping_items 
    SET name = ?, category = ?, quantity = ?, unit = ?, price = ?, remark = ?, 
        purchased = ?, purchased_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND list_id = ? AND user_id = ?
  `).run(
    name || existingItem.name,
    category !== undefined ? category : existingItem.category,
    quantity !== undefined ? quantity : existingItem.quantity,
    unit || existingItem.unit,
    price !== undefined ? price : existingItem.price,
    remark !== undefined ? remark : existingItem.remark,
    purchased !== undefined ? (purchased ? 1 : 0) : existingItem.purchased,
    purchased !== undefined ? (purchased ? 1 : 0) : existingItem.purchased,
    itemId,
    listId,
    userId
  );

  db.prepare('UPDATE shopping_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(listId);

  const item = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(itemId);
  res.json({ message: '更新成功', item });
});

router.post('/:id/items/:itemId/purchase', authMiddleware, (req, res) => {
  const { purchased, restock, price } = req.body;
  const db = getDb();
  const userId = req.user.id;
  const listId = req.params.id;
  const itemId = req.params.itemId;

  const existingItem = db.prepare(`
    SELECT si.* FROM shopping_items si
    WHERE si.id = ? AND si.list_id = ? AND si.user_id = ?
  `).get(itemId, listId, userId);

  if (!existingItem) {
    return res.status(404).json({ message: '购物清单项不存在' });
  }

  const isPurchased = purchased ? 1 : 0;

  if (isPurchased && restock && existingItem.item_id) {
    const item = db.prepare('SELECT * FROM items WHERE id = ? AND user_id = ?').get(existingItem.item_id, userId);
    if (item) {
      const newQuantity = item.quantity + existingItem.quantity;
      db.prepare('UPDATE items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQuantity, existingItem.item_id);
      
      db.prepare(`
        INSERT INTO records (user_id, item_id, type, quantity, remark)
        VALUES (?, ?, 'return', ?, ?)
      `).run(userId, existingItem.item_id, existingItem.quantity, '购物清单补货');
    }
  }

  db.prepare(`
    UPDATE shopping_items 
    SET purchased = ?, 
        purchased_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END,
        price = CASE WHEN ? IS NOT NULL THEN ? ELSE price END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND list_id = ? AND user_id = ?
  `).run(
    isPurchased,
    isPurchased,
    price !== undefined ? price : null,
    price !== undefined ? price : existingItem.price,
    itemId,
    listId,
    userId
  );

  db.prepare('UPDATE shopping_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(listId);

  const item = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(itemId);
  res.json({ message: isPurchased ? '已标记为已购买' : '已取消购买标记', item });
});

router.delete('/:id/items/:itemId', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const listId = req.params.id;
  const itemId = req.params.itemId;

  const existingItem = db.prepare(`
    SELECT id FROM shopping_items 
    WHERE id = ? AND list_id = ? AND user_id = ?
  `).get(itemId, listId, userId);

  if (!existingItem) {
    return res.status(404).json({ message: '购物清单项不存在' });
  }

  db.prepare('DELETE FROM shopping_items WHERE id = ? AND list_id = ? AND user_id = ?').run(itemId, listId, userId);
  db.prepare('UPDATE shopping_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(listId);
  res.json({ message: '删除成功' });
});

router.post('/:id/share', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const listId = req.params.id;

  const existingList = db.prepare('SELECT * FROM shopping_lists WHERE id = ? AND user_id = ?').get(listId, userId);
  if (!existingList) {
    return res.status(404).json({ message: '购物清单不存在' });
  }

  let shareCode = existingList.share_code;
  if (!shareCode) {
    shareCode = generateShareCode();
    db.prepare('UPDATE shopping_lists SET share_code = ? WHERE id = ?').run(shareCode, listId);
  }

  res.json({ message: '分享链接已生成', share_code: shareCode });
});

router.get('/share/:code', (req, res) => {
  const db = getDb();
  const shareCode = req.params.code;

  const list = db.prepare('SELECT * FROM shopping_lists WHERE share_code = ?').get(shareCode);
  if (!list) {
    return res.status(404).json({ message: '分享链接无效' });
  }

  const items = db.prepare(`
    SELECT name, category, quantity, unit, purchased, price, remark
    FROM shopping_items
    WHERE list_id = ?
    ORDER BY purchased ASC, created_at DESC
  `).all(list.id);

  res.json({
    name: list.name,
    description: list.description,
    items
  });
});

router.get('/:id/export', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const listId = req.params.id;

  const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ? AND user_id = ?').get(listId, userId);
  if (!list) {
    return res.status(404).json({ message: '购物清单不存在' });
  }

  const items = db.prepare(`
    SELECT * FROM shopping_items WHERE list_id = ? AND user_id = ?
    ORDER BY purchased ASC, created_at DESC
  `).all(listId, userId);

  let text = `【${list.name}】\n`;
  if (list.description) {
    text += `${list.description}\n`;
  }
  text += `\n生成时间：${new Date().toLocaleString()}\n`;
  text += '='.repeat(30) + '\n\n';

  let totalPrice = 0;
  let purchasedCount = 0;

  items.forEach((item, index) => {
    const status = item.purchased ? '✓' : '○';
    const priceStr = item.price ? ` ￥${item.price}` : '';
    text += `${index + 1}. ${status} ${item.name} × ${item.quantity}${item.unit || '个'}${priceStr}\n`;
    if (item.remark) {
      text += `   备注：${item.remark}\n`;
    }
    if (item.purchased && item.price) {
      totalPrice += item.price * item.quantity;
      purchasedCount++;
    }
  });

  text += '\n' + '='.repeat(30) + '\n';
  text += `总计：${items.length} 项\n`;
  text += `已购买：${purchasedCount} 项\n`;
  if (totalPrice > 0) {
    text += `已花费：￥${totalPrice.toFixed(2)}\n`;
  }

  const encodedFilename = encodeURIComponent(list.name) + '.txt';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
  res.send(text);
});

router.get('/stats/monthly', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { month } = req.query;

  let dateCondition = "date('now', 'start of month')";
  let endDateCondition = "date('now', '+1 month', 'start of month')";
  let params = [userId];

  if (month) {
    dateCondition = `date(?)`;
    endDateCondition = `date(?, '+1 month')`;
    params.push(month, month);
  }

  const totalSpent = db.prepare(`
    SELECT COALESCE(SUM(si.price * si.quantity), 0) as total
    FROM shopping_items si
    JOIN shopping_lists sl ON si.list_id = sl.id
    WHERE si.user_id = ? 
      AND si.purchased = 1 
      AND si.price IS NOT NULL
      AND si.purchased_at >= ${dateCondition}
      AND si.purchased_at < ${endDateCondition}
  `).get(...params).total;

  const byCategory = db.prepare(`
    SELECT 
      COALESCE(NULLIF(si.category, ''), '未分类') as category,
      COUNT(*) as item_count,
      SUM(si.quantity) as total_quantity,
      COALESCE(SUM(si.price * si.quantity), 0) as total_spent
    FROM shopping_items si
    JOIN shopping_lists sl ON si.list_id = sl.id
    WHERE si.user_id = ? 
      AND si.purchased = 1
      AND si.purchased_at >= ${dateCondition}
      AND si.purchased_at < ${endDateCondition}
    GROUP BY si.category
    ORDER BY total_spent DESC
  `).all(...params);

  const purchasedItemCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM shopping_items si
    JOIN shopping_lists sl ON si.list_id = sl.id
    WHERE si.user_id = ? 
      AND si.purchased = 1
      AND si.purchased_at >= ${dateCondition}
      AND si.purchased_at < ${endDateCondition}
  `).get(...params).count;

  res.json({
    total_spent: totalSpent,
    purchased_item_count: purchasedItemCount,
    by_category: byCategory
  });
});

router.post('/add-from-expiring', authMiddleware, (req, res) => {
  const { list_id, item_ids } = req.body;
  const db = getDb();
  const userId = req.user.id;

  if (!list_id || !item_ids || !Array.isArray(item_ids)) {
    return res.status(400).json({ message: '参数错误' });
  }

  const existingList = db.prepare('SELECT id FROM shopping_lists WHERE id = ? AND user_id = ?').get(list_id, userId);
  if (!existingList) {
    return res.status(404).json({ message: '购物清单不存在' });
  }

  const items = db.prepare(`
    SELECT id, name, category, quantity, unit 
    FROM items 
    WHERE user_id = ? AND id IN (${item_ids.map(() => '?').join(',')})
  `).all(userId, ...item_ids);

  if (items.length === 0) {
    return res.status(400).json({ message: '未找到有效物品' });
  }

  const insertStmt = db.prepare(`
    INSERT INTO shopping_items (list_id, user_id, item_id, name, category, quantity, unit, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(itemList => {
    for (const item of itemList) {
      insertStmt.run(
        list_id,
        userId,
        item.id,
        item.name,
        item.category || '',
        item.quantity,
        item.unit || '个',
        '过期补货'
      );
    }
  });

  transaction(items);
  db.prepare('UPDATE shopping_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(list_id);

  res.json({ message: `成功添加 ${items.length} 个物品到购物清单`, count: items.length });
});

router.post('/add-from-low-stock', authMiddleware, (req, res) => {
  const { list_id, item_ids } = req.body;
  const db = getDb();
  const userId = req.user.id;

  if (!list_id || !item_ids || !Array.isArray(item_ids)) {
    return res.status(400).json({ message: '参数错误' });
  }

  const existingList = db.prepare('SELECT id FROM shopping_lists WHERE id = ? AND user_id = ?').get(list_id, userId);
  if (!existingList) {
    return res.status(404).json({ message: '购物清单不存在' });
  }

  const items = db.prepare(`
    SELECT id, name, category, quantity, unit 
    FROM items 
    WHERE user_id = ? AND id IN (${item_ids.map(() => '?').join(',')})
  `).all(userId, ...item_ids);

  if (items.length === 0) {
    return res.status(400).json({ message: '未找到有效物品' });
  }

  const insertStmt = db.prepare(`
    INSERT INTO shopping_items (list_id, user_id, item_id, name, category, quantity, unit, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(itemList => {
    for (const item of itemList) {
      const restockQty = Math.max(item.quantity * 2, 1);
      insertStmt.run(
        list_id,
        userId,
        item.id,
        item.name,
        item.category || '',
        restockQty,
        item.unit || '个',
        '库存不足补货'
      );
    }
  });

  transaction(items);
  db.prepare('UPDATE shopping_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(list_id);

  res.json({ message: `成功添加 ${items.length} 个物品到购物清单`, count: items.length });
});

module.exports = router;
