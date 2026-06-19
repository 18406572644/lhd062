require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/auth');
const boxRoutes = require('./routes/boxes');
const itemRoutes = require('./routes/items');
const labelRoutes = require('./routes/labels');
const recordRoutes = require('./routes/records');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/boxes', boxRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '收纳盒管理系统后端运行正常' });
});

db.init();

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;
