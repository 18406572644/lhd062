const express = require('express');
const { getDb } = require('../db');
const authMiddleware = require('../middleware/auth');
const { familyAuthMiddleware, ROLES } = require('../middleware/familyAuth');

const router = express.Router();

function buildSpaceFilter(req, tableAlias = '') {
  const alias = tableAlias ? tableAlias + '.' : '';
  const space = req.space;
  const userId = req.user.id;
  const params = [];

  if (space.type === 'private') {
    params.push(userId);
    return {
      where: `${alias}user_id = ? AND ${alias}space_type = 'private'`,
      params
    };
  }

  if (space.type === 'family') {
    params.push(space.id);
    if (space.role === ROLES.OWNER || space.role === ROLES.ADMIN || space.shareAll) {
      return {
        where: `${alias}space_type = 'family' AND ${alias}space_id = ?`,
        params
      };
    } else {
      params.push(space.id, userId, space.id);
      return {
        where: `${alias}space_type = 'family' AND ${alias}space_id = ? AND (${alias}owner_id = ? OR ${alias}id IN (SELECT box_id FROM shared_boxes WHERE family_id = ?))`,
        params
      };
    }
  }

  return { where: '1=0', params };
}

function buildItemSpaceFilter(req, tableAlias = '') {
  const alias = tableAlias ? tableAlias + '.' : '';
  const space = req.space;
  const userId = req.user.id;
  const params = [];

  if (space.type === 'private') {
    params.push(userId);
    return {
      where: `${alias}user_id = ? AND ${alias}space_type = 'private'`,
      params
    };
  }

  if (space.type === 'family') {
    params.push(space.id);
    if (space.role === ROLES.OWNER || space.role === ROLES.ADMIN || space.shareAll) {
      return {
        where: `${alias}space_type = 'family' AND ${alias}space_id = ?`,
        params
      };
    } else {
      params.push(space.id, userId, space.id);
      return {
        where: `${alias}space_type = 'family' AND ${alias}space_id = ? AND (${alias}owner_id = ? OR ${alias}box_id IN (SELECT box_id FROM shared_boxes WHERE family_id = ?))`,
        params
      };
    }
  }

  return { where: '1=0', params };
}

function buildRecordSpaceFilter(req, tableAlias = '') {
  const alias = tableAlias ? tableAlias + '.' : '';
  const space = req.space;
  const params = [];

  if (space.type === 'private') {
    params.push(req.user.id);
    return {
      where: `${alias}user_id = ? AND ${alias}space_type = 'private'`,
      params
    };
  }

  if (space.type === 'family') {
    params.push(space.id);
    return {
      where: `${alias}space_type = 'family' AND ${alias}space_id = ?`,
      params
    };
  }

  return { where: '1=0', params };
}

router.get('/overview', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();

  const boxFilter = buildSpaceFilter(req);
  const itemFilter = buildItemSpaceFilter(req);

  const boxCount = db.prepare(`SELECT COUNT(*) as count FROM boxes WHERE ${boxFilter.where}`).get(...boxFilter.params).count;
  const itemCount = db.prepare(`SELECT COUNT(*) as count FROM items WHERE ${itemFilter.where}`).get(...itemFilter.params).count;
  const storedCount = db.prepare(`SELECT COUNT(*) as count FROM items WHERE ${itemFilter.where} AND status = 'stored'`).get(...itemFilter.params).count;
  const expireSoonCount = db.prepare(`
    SELECT COUNT(*) as count FROM items 
    WHERE ${itemFilter.where} AND status = 'stored'
      AND expire_date IS NOT NULL 
      AND expire_date != ''
      AND expire_date <= date('now', '+30 days')
      AND expire_date >= date('now')
  `).get(...itemFilter.params).count;

  const expiredCount = db.prepare(`
    SELECT COUNT(*) as count FROM items 
    WHERE ${itemFilter.where}
      AND expire_date IS NOT NULL 
      AND expire_date != ''
      AND expire_date < date('now')
  `).get(...itemFilter.params).count;

  const lowStockCount = db.prepare(`
    SELECT COUNT(*) as count FROM items 
    WHERE ${itemFilter.where}
      AND need_restock = 1
  `).get(...itemFilter.params).count;

  let totalVolume = 0;
  const boxes = db.prepare(`SELECT width, height, depth FROM boxes WHERE ${boxFilter.where}`).all(...boxFilter.params);
  boxes.forEach(b => {
    if (b.width && b.height && b.depth) {
      totalVolume += b.width * b.height * b.depth;
    }
  });

  const totalValue = db.prepare(`
    SELECT COALESCE(SUM(estimated_value * quantity), 0) as total_value
    FROM items WHERE ${itemFilter.where}
  `).get(...itemFilter.params).total_value;

  res.json({
    box_count: boxCount,
    item_count: itemCount,
    stored_count: storedCount,
    expire_soon_count: expireSoonCount,
    expired_count: expiredCount,
    low_stock_count: lowStockCount,
    total_volume: Math.round(totalVolume),
    total_value: Math.round(totalValue * 100) / 100
  });
});

router.get('/by-category', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const itemFilter = buildItemSpaceFilter(req);

  const data = db.prepare(`
    SELECT 
      COALESCE(NULLIF(category, ''), '未分类') as category,
      COUNT(*) as count,
      SUM(quantity) as total_quantity,
      COALESCE(SUM(estimated_value * quantity), 0) as total_value
    FROM items 
    WHERE ${itemFilter.where}
    GROUP BY category
    ORDER BY count DESC
  `).all(...itemFilter.params);

  res.json({ list: data });
});

router.get('/by-box', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const boxFilter = buildSpaceFilter(req, 'b');

  const data = db.prepare(`
    SELECT 
      b.id,
      b.name,
      b.color,
      COUNT(i.id) as item_count,
      SUM(i.quantity) as total_quantity
    FROM boxes b
    LEFT JOIN items i ON b.id = i.box_id
    WHERE ${boxFilter.where}
    GROUP BY b.id
    ORDER BY item_count DESC
    LIMIT 10
  `).all(...boxFilter.params);

  res.json({ list: data });
});

router.get('/record-trend', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const { days = 7 } = req.query;

  const daysNum = parseInt(days);
  const data = [];
  const recordFilter = buildRecordSpaceFilter(req);

  for (let i = daysNum - 1; i >= 0; i--) {
    const date = db.prepare(`SELECT date('now', '-' || ? || ' days') as date`).get(i).date;
    
    const borrowCount = db.prepare(`
      SELECT COUNT(*) as count FROM records 
      WHERE ${recordFilter.where} AND type = 'borrow' AND date(created_at) = ?
    `).get(...recordFilter.params, date).count;

    const returnCount = db.prepare(`
      SELECT COUNT(*) as count FROM records 
      WHERE ${recordFilter.where} AND type = 'return' AND date(created_at) = ?
    `).get(...recordFilter.params, date).count;

    data.push({
      date,
      borrow: borrowCount,
      return: returnCount
    });
  }

  res.json({ list: data });
});

router.get('/location-stats', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const boxFilter = buildSpaceFilter(req);

  const data = db.prepare(`
    SELECT 
      COALESCE(NULLIF(location, ''), '未指定位置') as location,
      COUNT(*) as box_count
    FROM boxes 
    WHERE ${boxFilter.where}
    GROUP BY location
    ORDER BY box_count DESC
  `).all(...boxFilter.params);

  res.json({ list: data });
});

router.get('/usage-frequency', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const { days = 30 } = req.query;
  const itemFilter = buildItemSpaceFilter(req, 'i');

  const topItems = db.prepare(`
    SELECT 
      i.id,
      i.name,
      i.category,
      i.image,
      COUNT(r.id) as borrow_count,
      SUM(r.quantity) as total_quantity
    FROM items i
    LEFT JOIN records r ON i.id = r.item_id AND r.type = 'borrow' 
      AND date(r.created_at) >= date('now', '-' || ? || ' days')
    WHERE ${itemFilter.where}
    GROUP BY i.id
    ORDER BY borrow_count DESC
    LIMIT 10
  `).all(parseInt(days), ...itemFilter.params);

  const bottomItems = db.prepare(`
    SELECT 
      i.id,
      i.name,
      i.category,
      i.image,
      COUNT(r.id) as borrow_count,
      SUM(r.quantity) as total_quantity
    FROM items i
    LEFT JOIN records r ON i.id = r.item_id AND r.type = 'borrow' 
      AND date(r.created_at) >= date('now', '-' || ? || ' days')
    WHERE ${itemFilter.where}
    GROUP BY i.id
    ORDER BY borrow_count ASC, i.created_at DESC
    LIMIT 10
  `).all(parseInt(days), ...itemFilter.params);

  res.json({
    top_10: topItems,
    bottom_10: bottomItems,
    days: parseInt(days)
  });
});

router.get('/space-utilization', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const boxFilter = buildSpaceFilter(req, 'b');
  const itemFilter = buildItemSpaceFilter(req);

  const boxes = db.prepare(`
    SELECT 
      b.id,
      b.name,
      b.location,
      b.color,
      b.width,
      b.height,
      b.depth,
      CASE 
        WHEN b.width > 0 AND b.height > 0 AND b.depth > 0 
        THEN b.width * b.height * b.depth 
        ELSE 0 
      END as box_volume,
      COUNT(i.id) as item_count,
      COALESCE(SUM(CASE WHEN i.estimated_size > 0 THEN i.estimated_size * i.quantity ELSE 0 END), 0) as used_volume
    FROM boxes b
    LEFT JOIN items i ON b.id = i.box_id
    WHERE ${boxFilter.where}
    GROUP BY b.id
    ORDER BY box_volume DESC
  `).all(...boxFilter.params);

  const result = boxes.map(box => {
    const utilizationRate = box.box_volume > 0 
      ? Math.min(100, Math.round((box.used_volume / box.box_volume * 10000) / 100))
      : 0;
    
    let status = 'normal';
    if (box.box_volume > 0) {
      if (utilizationRate >= 90) status = 'overfull';
      else if (utilizationRate < 30) status = 'underutilized';
    } else if (box.item_count === 0) {
      status = 'empty';
    }

    return {
      ...box,
      utilization_rate: utilizationRate,
      free_volume: Math.max(0, box.box_volume - box.used_volume),
      status
    };
  });

  const unboxedItems = db.prepare(`
    SELECT 
      COUNT(*) as item_count,
      COALESCE(SUM(CASE WHEN estimated_size > 0 THEN estimated_size * quantity ELSE 0 END), 0) as total_size
    FROM items 
    WHERE ${itemFilter.where} AND box_id IS NULL
  `).get(...itemFilter.params);

  res.json({
    boxes: result,
    unboxed_items: unboxedItems
  });
});

router.get('/heatmap-data', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const { weeks = 4 } = req.query;
  const recordFilter = buildRecordSpaceFilter(req);

  const records = db.prepare(`
    SELECT 
      strftime('%w', created_at) as day_of_week,
      CAST(strftime('%H', created_at) as INTEGER) as hour,
      COUNT(*) as count
    FROM records
    WHERE ${recordFilter.where}
      AND type = 'borrow'
      AND date(created_at) >= date('now', '-' || (? * 7) || ' days')
    GROUP BY day_of_week, hour
  `).all(...recordFilter.params, parseInt(weeks));

  const heatmap = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const record = records.find(r => parseInt(r.day_of_week) === day && parseInt(r.hour) === hour);
      heatmap.push([hour, day, record ? record.count : 0]);
    }
  }

  const dayTotals = [];
  for (let day = 0; day < 7; day++) {
    const total = records
      .filter(r => parseInt(r.day_of_week) === day)
      .reduce((sum, r) => sum + r.count, 0);
    dayTotals.push(total);
  }

  const hourTotals = [];
  for (let hour = 0; hour < 24; hour++) {
    const total = records
      .filter(r => parseInt(r.hour) === hour)
      .reduce((sum, r) => sum + r.count, 0);
    hourTotals.push(total);
  }

  res.json({
    heatmap,
    day_totals: dayTotals,
    hour_totals: hourTotals,
    peak_hour: hourTotals.indexOf(Math.max(...hourTotals)),
    peak_day: dayTotals.indexOf(Math.max(...dayTotals)),
    weeks: parseInt(weeks)
  });
});

function getSeason(month) {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

const seasonNames = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季'
};

router.get('/seasonal-analysis', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const itemFilter = buildItemSpaceFilter(req);
  const recordFilter = buildRecordSpaceFilter(req);

  const allItems = db.prepare(`
    SELECT id, name, category, image FROM items WHERE ${itemFilter.where}
  `).all(...itemFilter.params);

  const records = db.prepare(`
    SELECT 
      item_id,
      CAST(strftime('%m', created_at) as INTEGER) as month
    FROM records
    WHERE ${recordFilter.where} AND type = 'borrow'
  `).all(...recordFilter.params);

  const seasonalItems = [];

  allItems.forEach(item => {
    const itemRecords = records.filter(r => r.item_id === item.id);
    if (itemRecords.length === 0) return;

    const seasonCounts = { spring: 0, summer: 0, autumn: 0, winter: 0 };
    itemRecords.forEach(r => {
      const season = getSeason(r.month);
      seasonCounts[season]++;
    });

    const total = itemRecords.length;
    const dominantSeason = Object.entries(seasonCounts)
      .sort((a, b) => b[1] - a[1])[0];

    if (total >= 3 && dominantSeason[1] / total >= 0.6) {
      seasonalItems.push({
        ...item,
        total_borrows: total,
        season_counts: seasonCounts,
        dominant_season: dominantSeason[0],
        dominant_season_name: seasonNames[dominantSeason[0]],
        dominance_ratio: Math.round(dominantSeason[1] / total * 10000) / 100
      });
    }
  });

  seasonalItems.sort((a, b) => b.total_borrows - a.total_borrows);

  res.json({
    seasonal_items: seasonalItems,
    season_names: seasonNames
  });
});

router.get('/smart-suggestions', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const { days = 30 } = req.query;
  const itemFilter = buildItemSpaceFilter(req, 'i');
  const boxFilter = buildSpaceFilter(req, 'b');

  const suggestions = [];

  const freqData = db.prepare(`
    SELECT 
      i.id,
      i.name,
      i.category,
      i.box_id,
      b.name as box_name,
      b.location as box_location,
      COUNT(r.id) as borrow_count
    FROM items i
    LEFT JOIN records r ON i.id = r.item_id AND r.type = 'borrow'
      AND date(r.created_at) >= date('now', '-' || ? || ' days')
    LEFT JOIN boxes b ON i.box_id = b.id
    WHERE ${itemFilter.where} AND i.status = 'stored'
    GROUP BY i.id
    ORDER BY borrow_count DESC
  `).all(parseInt(days), ...itemFilter.params);

  const totalItems = freqData.length;
  const frequentThreshold = Math.ceil(totalItems * 0.2);
  const infrequentThreshold = Math.floor(totalItems * 0.8);

  const frequentItems = freqData.slice(0, frequentThreshold).filter(i => i.borrow_count > 0);
  const infrequentItems = freqData.slice(infrequentThreshold);

  if (frequentItems.length > 0) {
    const easyAccessBoxes = frequentItems
      .map(i => ({ id: i.box_id, name: i.box_name, location: i.box_location }))
      .filter((v, i, a) => v.id && a.findIndex(t => t.id === v.id) === i);

    suggestions.push({
      type: 'easy_access',
      title: '常用物品收纳建议',
      icon: '⭐',
      priority: 'high',
      items: frequentItems.slice(0, 5),
      message: `以下 ${frequentItems.length} 个物品取用频繁，建议放在易取位置（如抽屉外层、衣柜上部等）`,
      current_boxes: easyAccessBoxes
    });
  }

  if (infrequentItems.length > 0) {
    const lowUseItems = infrequentItems.filter(i => i.borrow_count === 0).slice(0, 10);
    if (lowUseItems.length >= 3) {
      suggestions.push({
        type: 'declutter',
        title: '闲置物品建议',
        icon: '📦',
        priority: 'medium',
        items: lowUseItems,
        message: `以下 ${lowUseItems.length} 个物品近 ${days} 天从未被使用，可考虑丢弃、送人或收纳到不常用位置`,
        days: parseInt(days)
      });
    }
  }

  const spaceData = db.prepare(`
    SELECT 
      b.id,
      b.name,
      b.width,
      b.height,
      b.depth,
      CASE 
        WHEN b.width > 0 AND b.height > 0 AND b.depth > 0 
        THEN b.width * b.height * b.depth 
        ELSE 0 
      END as box_volume,
      COALESCE(SUM(CASE WHEN i.estimated_size > 0 THEN i.estimated_size * i.quantity ELSE 0 END), 0) as used_volume
    FROM boxes b
    LEFT JOIN items i ON b.id = i.box_id
    WHERE ${boxFilter.where}
    GROUP BY b.id
    HAVING box_volume > 0
  `).all(...boxFilter.params);

  const underutilizedBoxes = spaceData.filter(b => {
    const free = b.box_volume - b.used_volume;
    return free > b.box_volume * 0.3;
  });

  const unboxedItemFilter = buildItemSpaceFilter(req, 'i');
  const unboxedItemsWithSize = db.prepare(`
    SELECT 
      i.id,
      i.name,
      i.estimated_size,
      i.quantity,
      i.category
    FROM items i
    WHERE ${unboxedItemFilter.where} AND i.box_id IS NULL AND i.estimated_size > 0
    ORDER BY i.estimated_size DESC
  `).all(...unboxedItemFilter.params);

  if (underutilizedBoxes.length > 0 && unboxedItemsWithSize.length > 0) {
    const boxSuggestions = [];

    underutilizedBoxes.forEach(box => {
      const freeVolume = box.box_volume - box.used_volume;
      const fittingItems = [];
      let remaining = freeVolume;

      for (const item of unboxedItemsWithSize) {
        const itemTotal = item.estimated_size * item.quantity;
        if (itemTotal <= remaining) {
          fittingItems.push(item);
          remaining -= itemTotal;
        }
        if (fittingItems.length >= 5) break;
      }

      if (fittingItems.length > 0) {
        boxSuggestions.push({
          box_id: box.id,
          box_name: box.name,
          free_volume: Math.round(freeVolume),
          free_percent: Math.round((freeVolume / box.box_volume * 10000) / 100),
          suggested_items: fittingItems
        });
      }
    });

    if (boxSuggestions.length > 0) {
      suggestions.push({
        type: 'space_optimize',
        title: '空间优化建议',
        icon: '📐',
        priority: 'medium',
        boxes: boxSuggestions,
        message: '以下收纳盒有较多剩余空间，可考虑放入未归类物品',
        unboxed_count: unboxedItemsWithSize.length
      });
    }
  }

  const overfullBoxes = spaceData.filter(b => {
    return b.used_volume >= b.box_volume * 0.9 && b.box_volume > 0;
  });

  if (overfullBoxes.length > 0) {
    suggestions.push({
      type: 'overfull',
      title: '收纳盒过满提醒',
      icon: '⚠️',
      priority: 'low',
      boxes: overfullBoxes.map(b => ({
        ...b,
        used_percent: Math.round((b.used_volume / b.box_volume * 10000) / 100)
      })),
      message: '以下收纳盒空间占用超过 90%，建议清理或更换更大的收纳盒'
    });
  }

  const seasonalItemFilter = buildItemSpaceFilter(req, 'i');
  const seasonalData = db.prepare(`
    SELECT 
      i.id,
      i.name,
      i.category,
      i.image,
      COUNT(r.id) as borrow_count,
      CAST(strftime('%m', r.created_at) as INTEGER) as month
    FROM items i
    LEFT JOIN records r ON i.id = r.item_id AND r.type = 'borrow'
    WHERE ${seasonalItemFilter.where}
    GROUP BY i.id, month
  `).all(...seasonalItemFilter.params);

  const currentMonth = new Date().getMonth() + 1;
  const currentSeason = getSeason(currentMonth);
  const offSeasonNames = {
    spring: ['autumn', 'winter'],
    summer: ['winter', 'spring'],
    autumn: ['winter', 'spring'],
    winter: ['spring', 'summer']
  };

  const offSeasonItems = [];
  const itemSeasonMap = {};

  seasonalData.forEach(row => {
    if (!itemSeasonMap[row.id]) {
      itemSeasonMap[row.id] = {
        id: row.id,
        name: row.name,
        category: row.category,
        image: row.image,
        seasons: {}
      };
    }
    const season = getSeason(row.month);
    itemSeasonMap[row.id].seasons[season] = (itemSeasonMap[row.id].seasons[season] || 0) + row.borrow_count;
  });

  Object.values(itemSeasonMap).forEach(item => {
    const total = Object.values(item.seasons).reduce((a, b) => a + b, 0);
    if (total >= 3) {
      const offSeasonTotal = offSeasonNames[currentSeason].reduce((sum, s) => sum + (item.seasons[s] || 0), 0);
      if (offSeasonTotal / total >= 0.6) {
        offSeasonItems.push({
          ...item,
          total_borrows: total,
          off_season_ratio: Math.round(offSeasonTotal / total * 10000) / 100
        });
      }
    }
  });

  if (offSeasonItems.length > 0) {
    suggestions.push({
      type: 'seasonal',
      title: '换季收纳建议',
      icon: '🍂',
      priority: 'low',
      items: offSeasonItems.slice(0, 8),
      message: `当前是${seasonNames[currentSeason]}，以下物品主要在其他季节使用，建议收纳到不易取用的位置`,
      current_season: seasonNames[currentSeason]
    });
  }

  res.json({
    suggestions,
    days: parseInt(days)
  });
});

router.get('/dashboard', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();

  const boxFilter = buildSpaceFilter(req);
  const itemFilter = buildItemSpaceFilter(req);
  const recordFilter = buildRecordSpaceFilter(req);

  const overviewParams = [
    ...boxFilter.params,
    ...itemFilter.params,
    ...itemFilter.params,
    ...itemFilter.params,
    ...itemFilter.params,
    ...itemFilter.params
  ];
  const overview = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM boxes WHERE ${boxFilter.where}) as box_count,
      (SELECT COUNT(*) FROM items WHERE ${itemFilter.where}) as item_count,
      (SELECT COUNT(*) FROM items WHERE ${itemFilter.where} AND status = 'stored') as stored_count,
      (SELECT COALESCE(SUM(estimated_value * quantity), 0) FROM items WHERE ${itemFilter.where}) as total_value,
      (SELECT COUNT(*) FROM items WHERE ${itemFilter.where} AND need_restock = 1) as low_stock_count,
      (SELECT COUNT(*) FROM items WHERE ${itemFilter.where} AND status = 'stored' AND expire_date IS NOT NULL AND expire_date != '' AND expire_date <= date('now', '+30 days') AND expire_date >= date('now')) as expire_soon_count
  `).get(...overviewParams);

  const locationBoxFilter = buildSpaceFilter(req, 'b');
  const locationStats = db.prepare(`
    SELECT 
      COALESCE(NULLIF(b.location, ''), '未指定位置') as location,
      COUNT(DISTINCT b.id) as box_count,
      COUNT(i.id) as item_count,
      COALESCE(SUM(i.estimated_value * i.quantity), 0) as total_value
    FROM boxes b
    LEFT JOIN items i ON b.id = i.box_id
    WHERE ${locationBoxFilter.where}
    GROUP BY b.location
    ORDER BY box_count DESC
  `).all(...locationBoxFilter.params);

  const categoryValueFilter = buildItemSpaceFilter(req);
  const categoryValue = db.prepare(`
    SELECT 
      COALESCE(NULLIF(category, ''), '未分类') as category,
      COUNT(*) as count,
      COALESCE(SUM(estimated_value * quantity), 0) as total_value
    FROM items 
    WHERE ${categoryValueFilter.where}
    GROUP BY category
    ORDER BY total_value DESC
  `).all(...categoryValueFilter.params);

  const boxes3dFilter = buildSpaceFilter(req, 'b');
  const boxes3d = db.prepare(`
    SELECT 
      b.id,
      b.name,
      b.location,
      b.color,
      b.width,
      b.height,
      b.depth,
      COUNT(i.id) as item_count,
      COALESCE(SUM(i.estimated_value * i.quantity), 0) as total_value
    FROM boxes b
    LEFT JOIN items i ON b.id = i.box_id
    WHERE ${boxes3dFilter.where}
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `).all(...boxes3dFilter.params);

  const recentRecordFilter = buildRecordSpaceFilter(req, 'r');
  const recentRecords = db.prepare(`
    SELECT 
      r.id,
      r.type,
      r.quantity,
      r.created_at,
      i.name as item_name,
      i.unit as item_unit,
      b.name as box_name
    FROM records r
    LEFT JOIN items i ON r.item_id = i.id
    LEFT JOIN boxes b ON i.box_id = b.id
    WHERE ${recentRecordFilter.where}
    ORDER BY r.created_at DESC
    LIMIT 20
  `).all(...recentRecordFilter.params);

  const expiringItemFilter = buildItemSpaceFilter(req, 'i');
  const expiringItems = db.prepare(`
    SELECT 
      i.id,
      i.name,
      i.expire_date,
      i.quantity,
      i.unit,
      b.name as box_name,
      CAST(julianday(i.expire_date) - julianday(date('now')) AS INTEGER) as days_left
    FROM items i
    LEFT JOIN boxes b ON i.box_id = b.id
    WHERE ${expiringItemFilter.where}
      AND i.expire_date IS NOT NULL 
      AND i.expire_date != ''
      AND i.status = 'stored'
      AND i.expire_date <= date('now', '+30 days')
    ORDER BY i.expire_date ASC
    LIMIT 10
  `).all(...expiringItemFilter.params);

  const lowStockItemFilter = buildItemSpaceFilter(req, 'i');
  const lowStockItems = db.prepare(`
    SELECT 
      i.id,
      i.name,
      i.quantity,
      i.unit,
      i.min_stock,
      b.name as box_name,
      i.category
    FROM items i
    LEFT JOIN boxes b ON i.box_id = b.id
    WHERE ${lowStockItemFilter.where}
      AND i.need_restock = 1
    ORDER BY i.quantity ASC
    LIMIT 10
  `).all(...lowStockItemFilter.params);

  const trend30 = [];
  const trendRecordFilter = buildRecordSpaceFilter(req);
  for (let i = 29; i >= 0; i--) {
    const date = db.prepare(`SELECT date('now', '-' || ? || ' days') as date`).get(i).date;
    
    const borrowCount = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(quantity), 0) as total_qty
      FROM records 
      WHERE ${trendRecordFilter.where} AND type = 'borrow' AND date(created_at) = ?
    `).get(...trendRecordFilter.params, date);

    const returnCount = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(quantity), 0) as total_qty
      FROM records 
      WHERE ${trendRecordFilter.where} AND type = 'return' AND date(created_at) = ?
    `).get(...trendRecordFilter.params, date);

    trend30.push({
      date,
      borrow: borrowCount.count,
      borrow_qty: borrowCount.total_qty,
      return: returnCount.count,
      return_qty: returnCount.total_qty
    });
  }

  res.json({
    overview: {
      box_count: overview.box_count,
      item_count: overview.item_count,
      stored_count: overview.stored_count,
      total_value: Math.round(overview.total_value * 100) / 100,
      low_stock_count: overview.low_stock_count,
      expire_soon_count: overview.expire_soon_count
    },
    location_stats: locationStats,
    category_value: categoryValue,
    boxes_3d: boxes3d,
    recent_records: recentRecords,
    expiring_items: expiringItems,
    low_stock_items: lowStockItems,
    trend_30: trend30
  });
});

module.exports = router;
