const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

let db;

function init() {
  const dbPath = path.join(__dirname, '..', 'data', 'storage.db');
  db = new Database(dbPath);
  
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  createTables();
  seedData();
  
  console.log('数据库初始化完成');
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      width REAL,
      height REAL,
      depth REAL,
      color TEXT,
      description TEXT,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      box_id INTEGER,
      name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER DEFAULT 1,
      unit TEXT,
      expire_date DATE,
      description TEXT,
      status TEXT DEFAULT 'stored',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (box_id) REFERENCES boxes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS label_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      template_data TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );
  `);
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('123456', 10);
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, nickname)
      VALUES (?, ?, ?)
    `);
    const result = insertUser.run('admin', hash, '管理员');
    const userId = result.lastInsertRowid;

    const insertBox = db.prepare(`
      INSERT INTO boxes (user_id, name, location, width, height, depth, color, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const box1 = insertBox.run(userId, '客厅收纳箱A', '客厅电视柜左侧', 40, 30, 25, '#F5F5DC', '存放遥控器、电池等杂物');
    const box2 = insertBox.run(userId, '厨房调料盒', '厨房橱柜第二层', 30, 20, 15, '#90EE90', '各种调味料');
    const box3 = insertBox.run(userId, '卧室内衣收纳盒', '卧室衣柜第三层', 35, 25, 20, '#DEB887', '内衣袜子收纳');

    const insertItem = db.prepare(`
      INSERT INTO items (user_id, box_id, name, category, quantity, unit, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertItem.run(userId, box1.lastInsertRowid, '电视遥控器', '电子产品', 2, '个', '客厅电视和机顶盒遥控器');
    insertItem.run(userId, box1.lastInsertRowid, '5号电池', '日用品', 10, '节', '碱性电池');
    insertItem.run(userId, box1.lastInsertRowid, '螺丝刀套装', '工具', 1, '套', '多功能螺丝刀');
    
    insertItem.run(userId, box2.lastInsertRowid, '食用盐', '调料', 2, '袋', '加碘食用盐');
    insertItem.run(userId, box2.lastInsertRowid, '生抽酱油', '调料', 1, '瓶', '海天生抽');
    insertItem.run(userId, box2.lastInsertRowid, '八角', '调料', 1, '袋', '八角大料');
    
    insertItem.run(userId, box3.lastInsertRowid, '棉袜', '服饰', 5, '双', '纯棉袜子');
    insertItem.run(userId, box3.lastInsertRowid, '内裤', '服饰', 3, '条', '纯棉内裤');

    const insertTemplate = db.prepare(`
      INSERT INTO label_templates (user_id, name, template_data, is_default)
      VALUES (?, ?, ?, ?)
    `);
    
    insertTemplate.run(userId, '默认标签模板', JSON.stringify({
      fontSize: 14,
      fontColor: '#5D4E37',
      bgColor: '#FDF6E3',
      borderColor: '#8B7355',
      showQrCode: true,
      showDate: true,
      width: 200,
      height: 100
    }), 1);
  }
}

function getDb() {
  if (!db) {
    init();
  }
  return db;
}

module.exports = { init, getDb };
