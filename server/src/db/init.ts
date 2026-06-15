import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '../../data/health.db')

export function initDb(): Database.Database {
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      openid TEXT PRIMARY KEY,
      gender TEXT,
      age_range TEXT,
      height_range TEXT,
      weight_range TEXT,
      occupation TEXT,
      diseases TEXT DEFAULT '[]',
      allergies TEXT DEFAULT '[]',
      surgery_history TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openid TEXT NOT NULL,
      date TEXT NOT NULL,
      sleep_time TEXT,
      wake_time TEXT,
      nap_duration INTEGER DEFAULT 0,
      work_type TEXT,
      breakfast TEXT,
      lunch TEXT,
      dinner TEXT,
      exercise_type TEXT,
      exercise_duration INTEGER DEFAULT 0,
      steps INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (openid) REFERENCES users(openid),
      UNIQUE(openid, date)
    );

    CREATE TABLE IF NOT EXISTS metric_configs (
      openid TEXT PRIMARY KEY,
      metrics TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (openid) REFERENCES users(openid)
    );

    CREATE TABLE IF NOT EXISTS metric_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openid TEXT NOT NULL,
      metric_key TEXT NOT NULL,
      value REAL NOT NULL,
      recorded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (openid) REFERENCES users(openid)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openid TEXT NOT NULL,
      image_base64 TEXT NOT NULL,
      ocr_text TEXT,
      analysis_result TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (openid) REFERENCES users(openid)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openid TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (openid) REFERENCES users(openid)
    );

    CREATE INDEX IF NOT EXISTS idx_habits_openid_date ON habits(openid, date);
    CREATE INDEX IF NOT EXISTS idx_metric_records_openid ON metric_records(openid, metric_key, recorded_at);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_openid ON chat_messages(openid, created_at);
  `)

  // 幂等迁移：为旧库的 metric_configs 补 created_at 列
  // CREATE TABLE IF NOT EXISTS 不会修改已存在的表，需显式迁移。
  // 注：SQLite 的 ALTER TABLE ADD COLUMN 不允许 datetime('now') 这类非常量默认值，
  // 因此存量库中该列无默认值（新行不会自动填充）；此处用 updated_at 回填存量行作为近似。
  const metricConfigsCols = db.prepare('PRAGMA table_info(metric_configs)').all() as Array<{ name: string }>
  if (!metricConfigsCols.some((c) => c.name === 'created_at')) {
    db.exec('ALTER TABLE metric_configs ADD COLUMN created_at TEXT')
    db.exec('UPDATE metric_configs SET created_at = updated_at WHERE created_at IS NULL')
  }

  // 幂等迁移：为旧库的 users 补 allergies / surgery_history 列
  // 与 metric_configs.created_at 不同：'[]' 是常量默认值，SQLite 允许且会自动回填存量行。
  const usersCols = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>
  if (!usersCols.some((c) => c.name === 'allergies')) {
    db.exec("ALTER TABLE users ADD COLUMN allergies TEXT DEFAULT '[]'")
  }
  if (!usersCols.some((c) => c.name === 'surgery_history')) {
    db.exec("ALTER TABLE users ADD COLUMN surgery_history TEXT DEFAULT '[]'")
  }

  return db
}
