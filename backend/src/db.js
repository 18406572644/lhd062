const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let db;

function init() {
  const dbPath = path.join(__dirname, '..', 'data', 'storage.db');
  db = new Database(dbPath);

  const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_ENV === 'true';
  if (isDocker) {
    console.log('🐳 Docker 检测到 Docker 环境，禁用 WAL 模式');
    db.pragma('journal_mode = DELETE');
  } else {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');
  
  createTables();
  migrateTables();
  seedData();
  
  console.log('数据库初始化完成');
}

function migrateTables() {
  const itemColumns = db.prepare("PRAGMA table_info(items)").all();
  const boxColumns = db.prepare("PRAGMA table_info(boxes)").all();
  const recordColumns = db.prepare("PRAGMA table_info(records)").all();

  const itemColumnsToAdd = [
    { name: 'image', type: 'TEXT', default: null },
    { name: 'min_stock', type: 'INTEGER', default: '0' },
    { name: 'need_restock', type: 'INTEGER', default: '0' },
    { name: 'estimated_size', type: 'REAL', default: '0' },
    { name: 'estimated_value', type: 'REAL', default: '0' },
    { name: 'owner_id', type: 'INTEGER NOT NULL', default: null, requiresUpdate: true },
    { name: 'space_type', type: 'TEXT NOT NULL', default: "'private'" },
    { name: 'space_id', type: 'INTEGER', default: null }
  ];

  itemColumnsToAdd.forEach(col => {
    const hasCol = itemColumns.some(c => c.name === col.name);
    if (!hasCol) {
      let sql = `ALTER TABLE items ADD COLUMN ${col.name} ${col.type}`;
      if (col.default !== null) {
        sql += ` DEFAULT ${col.default}`;
      }
      db.exec(sql);
      console.log(`迁移完成：items 表已添加 ${col.name} 列`);
      if (col.requiresUpdate) {
        db.exec('UPDATE items SET owner_id = user_id WHERE owner_id IS NULL');
        console.log('迁移完成：items 表 owner_id 字段已初始化');
      }
    }
  });

  const boxColumnsToAdd = [
    { name: 'image', type: 'TEXT', default: null },
    { name: 'owner_id', type: 'INTEGER NOT NULL', default: null, requiresUpdate: true },
    { name: 'space_type', type: 'TEXT NOT NULL', default: "'private'" },
    { name: 'space_id', type: 'INTEGER', default: null }
  ];

  boxColumnsToAdd.forEach(col => {
    const hasCol = boxColumns.some(c => c.name === col.name);
    if (!hasCol) {
      let sql = `ALTER TABLE boxes ADD COLUMN ${col.name} ${col.type}`;
      if (col.default !== null) {
        sql += ` DEFAULT ${col.default}`;
      }
      db.exec(sql);
      console.log(`迁移完成：boxes 表已添加 ${col.name} 列`);
      if (col.requiresUpdate) {
        db.exec('UPDATE boxes SET owner_id = user_id WHERE owner_id IS NULL');
        console.log('迁移完成：boxes 表 owner_id 字段已初始化');
      }
    }
  });

  const recordColumnsToAdd = [
    { name: 'operator_id', type: 'INTEGER NOT NULL', default: null, requiresUpdate: true },
    { name: 'operator_name', type: 'TEXT NOT NULL', default: "'未知用户'", requiresUpdate: true },
    { name: 'space_type', type: 'TEXT NOT NULL', default: "'private'" },
    { name: 'space_id', type: 'INTEGER', default: null }
  ];

  recordColumnsToAdd.forEach(col => {
    const hasCol = recordColumns.some(c => c.name === col.name);
    if (!hasCol) {
      let sql = `ALTER TABLE records ADD COLUMN ${col.name} ${col.type}`;
      if (col.default !== null) {
        sql += ` DEFAULT ${col.default}`;
      }
      db.exec(sql);
      console.log(`迁移完成：records 表已添加 ${col.name} 列`);
      if (col.requiresUpdate && col.name === 'operator_id') {
        db.exec('UPDATE records SET operator_id = user_id WHERE operator_id IS NULL');
        console.log('迁移完成：records 表 operator_id 字段已初始化');
      }
    }
  });
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

    CREATE TABLE IF NOT EXISTS families (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      description TEXT,
      share_all INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      inviter_id INTEGER,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(family_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS family_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      inviter_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      max_uses INTEGER DEFAULT 0,
      used_count INTEGER DEFAULT 0,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shared_boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      box_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (box_id) REFERENCES boxes(id) ON DELETE CASCADE,
      UNIQUE(family_id, box_id)
    );

    CREATE TABLE IF NOT EXISTS boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      space_type TEXT NOT NULL DEFAULT 'private',
      space_id INTEGER,
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
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      space_type TEXT NOT NULL DEFAULT 'private',
      space_id INTEGER,
      box_id INTEGER,
      name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER DEFAULT 1,
      unit TEXT,
      expire_date DATE,
      description TEXT,
      image TEXT,
      status TEXT DEFAULT 'stored',
      min_stock INTEGER DEFAULT 0,
      need_restock INTEGER DEFAULT 0,
      estimated_size REAL DEFAULT 0,
      estimated_value REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (owner_id) REFERENCES users(id),
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
      operator_id INTEGER NOT NULL,
      operator_name TEXT NOT NULL,
      space_type TEXT NOT NULL DEFAULT 'private',
      space_id INTEGER,
      type TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS shopping_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      share_code TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      item_id INTEGER,
      name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER DEFAULT 1,
      unit TEXT DEFAULT '个',
      purchased INTEGER DEFAULT 0,
      purchased_at DATETIME,
      price REAL,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
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
      INSERT INTO boxes (user_id, owner_id, name, location, width, height, depth, color, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const box1 = insertBox.run(userId, userId, '客厅收纳箱A', '客厅电视柜左侧', 40, 30, 25, '#F5F5DC', '存放遥控器、电池等杂物');
    const box2 = insertBox.run(userId, userId, '厨房调料盒', '厨房橱柜第二层', 30, 20, 15, '#90EE90', '各种调味料');
    const box3 = insertBox.run(userId, userId, '卧室内衣收纳盒', '卧室衣柜第三层', 35, 25, 20, '#DEB887', '内衣袜子收纳');

    const insertItem = db.prepare(`
      INSERT INTO items (user_id, owner_id, box_id, name, category, quantity, unit, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertItem.run(userId, userId, box1.lastInsertRowid, '电视遥控器', '电子产品', 2, '个', '客厅电视和机顶盒遥控器');
    insertItem.run(userId, userId, box1.lastInsertRowid, '5号电池', '日用品', 10, '节', '碱性电池');
    insertItem.run(userId, userId, box1.lastInsertRowid, '螺丝刀套装', '工具', 1, '套', '多功能螺丝刀');
    
    insertItem.run(userId, userId, box2.lastInsertRowid, '食用盐', '调料', 2, '袋', '加碘食用盐');
    insertItem.run(userId, userId, box2.lastInsertRowid, '生抽酱油', '调料', 1, '瓶', '海天生抽');
    insertItem.run(userId, userId, box2.lastInsertRowid, '八角', '调料', 1, '袋', '八角大料');
    
    insertItem.run(userId, userId, box3.lastInsertRowid, '棉袜', '服饰', 5, '双', '纯棉袜子');
    insertItem.run(userId, userId, box3.lastInsertRowid, '内裤', '服饰', 3, '条', '纯棉内裤');

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
