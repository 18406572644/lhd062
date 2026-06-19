const express = require('express');
const { getDb } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/templates', authMiddleware, (req, res) => {
  const db = getDb();
  const templates = db.prepare(`
    SELECT id, name, is_default, created_at
    FROM label_templates
    WHERE user_id = ?
    ORDER BY is_default DESC, created_at DESC
  `).all(req.user.id);

  const result = templates.map(t => ({
    ...t,
    template_data: JSON.parse(t.template_data || '{}')
  }));

  res.json({ list: result });
});

router.get('/templates/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const template = db.prepare(`
    SELECT * FROM label_templates
    WHERE id = ? AND user_id = ?
  `).get(req.params.id, req.user.id);

  if (!template) {
    return res.status(404).json({ message: '模板不存在' });
  }

  template.template_data = JSON.parse(template.template_data || '{}');
  res.json(template);
});

router.post('/templates', authMiddleware, (req, res) => {
  const { name, template_data, is_default } = req.body;
  const db = getDb();

  if (!name) {
    return res.status(400).json({ message: '模板名称不能为空' });
  }

  if (is_default) {
    db.prepare('UPDATE label_templates SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }

  const result = db.prepare(`
    INSERT INTO label_templates (user_id, name, template_data, is_default)
    VALUES (?, ?, ?, ?)
  `).run(
    req.user.id,
    name,
    JSON.stringify(template_data || {}),
    is_default ? 1 : 0
  );

  const template = db.prepare('SELECT * FROM label_templates WHERE id = ?').get(result.lastInsertRowid);
  template.template_data = JSON.parse(template.template_data || '{}');

  res.json({ message: '保存成功', template });
});

router.put('/templates/:id', authMiddleware, (req, res) => {
  const { name, template_data, is_default } = req.body;
  const db = getDb();
  const templateId = req.params.id;

  const existing = db.prepare('SELECT id FROM label_templates WHERE id = ? AND user_id = ?').get(templateId, req.user.id);
  if (!existing) {
    return res.status(404).json({ message: '模板不存在' });
  }

  if (is_default) {
    db.prepare('UPDATE label_templates SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }

  db.prepare(`
    UPDATE label_templates 
    SET name = ?, template_data = ?, is_default = ?
    WHERE id = ? AND user_id = ?
  `).run(
    name,
    JSON.stringify(template_data || {}),
    is_default ? 1 : 0,
    templateId,
    req.user.id
  );

  const template = db.prepare('SELECT * FROM label_templates WHERE id = ?').get(templateId);
  template.template_data = JSON.parse(template.template_data || '{}');

  res.json({ message: '更新成功', template });
});

router.delete('/templates/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const templateId = req.params.id;

  const existing = db.prepare('SELECT id FROM label_templates WHERE id = ? AND user_id = ?').get(templateId, req.user.id);
  if (!existing) {
    return res.status(404).json({ message: '模板不存在' });
  }

  db.prepare('DELETE FROM label_templates WHERE id = ? AND user_id = ?').run(templateId, req.user.id);
  res.json({ message: '删除成功' });
});

router.post('/generate', authMiddleware, (req, res) => {
  const { box_id, item_ids, template_id } = req.body;
  const db = getDb();
  const userId = req.user.id;

  let labels = [];

  if (box_id) {
    const box = db.prepare('SELECT * FROM boxes WHERE id = ? AND user_id = ?').get(box_id, userId);
    if (!box) {
      return res.status(404).json({ message: '收纳盒不存在' });
    }

    const items = db.prepare('SELECT * FROM items WHERE box_id = ? AND user_id = ?').all(box_id, userId);
    
    labels.push({
      type: 'box',
      id: box.id,
      name: box.name,
      location: box.location,
      itemCount: items.length,
      items: items.map(i => ({ name: i.name, quantity: i.quantity }))
    });

    items.forEach(item => {
      labels.push({
        type: 'item',
        id: item.id,
        name: item.name,
        boxName: box.name,
        quantity: item.quantity,
        unit: item.unit,
        expireDate: item.expire_date
      });
    });
  }

  if (item_ids && item_ids.length > 0) {
    const placeholders = item_ids.map(() => '?').join(',');
    const items = db.prepare(`
      SELECT i.*, b.name as box_name 
      FROM items i
      LEFT JOIN boxes b ON i.box_id = b.id
      WHERE i.id IN (${placeholders}) AND i.user_id = ?
    `).all(...item_ids, userId);

    items.forEach(item => {
      labels.push({
        type: 'item',
        id: item.id,
        name: item.name,
        boxName: item.box_name || '',
        quantity: item.quantity,
        unit: item.unit,
        expireDate: item.expire_date
      });
    });
  }

  let template = null;
  if (template_id) {
    const t = db.prepare('SELECT * FROM label_templates WHERE id = ? AND user_id = ?').get(template_id, userId);
    if (t) {
      template = { ...t, template_data: JSON.parse(t.template_data || '{}') };
    }
  }

  if (!template) {
    const t = db.prepare('SELECT * FROM label_templates WHERE user_id = ? AND is_default = 1').get(userId);
    if (t) {
      template = { ...t, template_data: JSON.parse(t.template_data || '{}') };
    }
  }

  res.json({ labels, template });
});

module.exports = router;
