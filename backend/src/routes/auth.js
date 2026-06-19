const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, password, nickname } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: '密码长度不能少于6位' });
  }

  const db = getDb();
  
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    return res.status(400).json({ message: '用户名已存在' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password, nickname)
    VALUES (?, ?, ?)
  `).run(username, hash, nickname || username);

  const token = jwt.sign(
    { userId: result.lastInsertRowid, username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const user = db.prepare('SELECT id, username, nickname, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

  res.json({
    message: '注册成功',
    token,
    user
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password: _, ...userInfo } = user;

  res.json({
    message: '登录成功',
    token,
    user: userInfo
  });
});

router.get('/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.put('/profile', authMiddleware, (req, res) => {
  const { nickname } = req.body;
  const db = getDb();
  
  db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname || req.user.nickname, req.user.id);
  
  const user = db.prepare('SELECT id, username, nickname FROM users WHERE id = ?').get(req.user.id);
  
  res.json({ message: '更新成功', user });
});

module.exports = router;
