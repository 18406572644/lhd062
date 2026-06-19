require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'storage_box_default_secret_key_safe_fallback_2024';
  console.warn('⚠️  警告: JWT_SECRET 未设置，已使用默认值。生产环境请在 .env 文件中配置');
}

const authRoutes = require('./routes/auth');
const familyRoutes = require('./routes/families');
const boxRoutes = require('./routes/boxes');
const itemRoutes = require('./routes/items');
const labelRoutes = require('./routes/labels');
const recordRoutes = require('./routes/records');
const statsRoutes = require('./routes/stats');
const shoppingRoutes = require('./routes/shopping');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/boxes', boxRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/shopping', shoppingRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '收纳盒管理系统后端运行正常',
    env: process.env.NODE_ENV || 'development'
  });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ message: '服务器内部错误' });
});

db.init();

app.listen(PORT, () => {
  console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
  console.log(`🔐 JWT 密钥已加载: ${process.env.JWT_SECRET.substring(0, 8)}...`);
});

module.exports = app;
