const express = require('express');
const { getDb } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/overview', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const boxCount = db.prepare('SELECT COUNT(*) as count FROM boxes WHERE user_id = ?').get(userId).count;
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM items WHERE user_id = ?').get(userId).count;
  const storedCount = db.prepare("SELECT COUNT(*) as count FROM items WHERE user_id = ? AND status = 'stored'").get(userId).count;
  const expireSoonCount = db.prepare(`
    SELECT COUNT(*) as count FROM items 
    WHERE user_id = ? AND status = 'stored'
      AND expire_date IS NOT NULL 
      AND expire_date != ''
      AND expire_date <= date('now', '+30 days')
      AND expire_date >= date('now')
  `).get(userId).count;

  const expiredCount = db.prepare(`
    SELECT COUNT(*) as count FROM items 
    WHERE user_id = ? 
      AND expire_date IS NOT NULL 
      AND expire_date != ''
      AND expire_date < date('now')
  `).get(userId).count;

  const lowStockCount = db.prepare(`
    SELECT COUNT(*) as count FROM items 
    WHERE user_id = ? 
      AND need_restock = 1
  `).get(userId).count;

  let totalVolume = 0;
  const boxes = db.prepare('SELECT width, height, depth FROM boxes WHERE user_id = ?').all(userId);
  boxes.forEach(b => {
    if (b.width && b.height && b.depth) {
      totalVolume += b.width * b.height * b.depth;
    }
  });

  res.json({
    box_count: boxCount,
    item_count: itemCount,
    stored_count: storedCount,
    expire_soon_count: expireSoonCount,
    expired_count: expiredCount,
    low_stock_count: lowStockCount,
    total_volume: Math.round(totalVolume)
  });
});

router.get('/by-category', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const data = db.prepare(`
    SELECT 
      COALESCE(NULLIF(category, ''), '未分类') as category,
      COUNT(*) as count,
      SUM(quantity) as total_quantity
    FROM items 
    WHERE user_id = ?
    GROUP BY category
    ORDER BY count DESC
  `).all(userId);

  res.json({ list: data });
});

router.get('/by-box', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const data = db.prepare(`
    SELECT 
      b.id,
      b.name,
      b.color,
      COUNT(i.id) as item_count,
      SUM(i.quantity) as total_quantity
    FROM boxes b
    LEFT JOIN items i ON b.id = i.box_id
    WHERE b.user_id = ?
    GROUP BY b.id
    ORDER BY item_count DESC
    LIMIT 10
  `).all(userId);

  res.json({ list: data });
});

router.get('/record-trend', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { days = 7 } = req.query;

  const daysNum = parseInt(days);
  const data = [];

  for (let i = daysNum - 1; i >= 0; i--) {
    const date = db.prepare(`SELECT date('now', '-' || ? || ' days') as date`).get(i).date;
    
    const borrowCount = db.prepare(`
      SELECT COUNT(*) as count FROM records 
      WHERE user_id = ? AND type = 'borrow' AND date(created_at) = ?
    `).get(userId, date).count;

    const returnCount = db.prepare(`
      SELECT COUNT(*) as count FROM records 
      WHERE user_id = ? AND type = 'return' AND date(created_at) = ?
    `).get(userId, date).count;

    data.push({
      date,
      borrow: borrowCount,
      return: returnCount
    });
  }

  res.json({ list: data });
});

router.get('/location-stats', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const data = db.prepare(`
    SELECT 
      COALESCE(NULLIF(location, ''), '未指定位置') as location,
      COUNT(*) as box_count
    FROM boxes 
    WHERE user_id = ?
    GROUP BY location
    ORDER BY box_count DESC
  `).all(userId);

  res.json({ list: data });
});

module.exports = router;
