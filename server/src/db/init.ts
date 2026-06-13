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

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openid TEXT NOT NULL,
      week_start TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      source TEXT DEFAULT 'ai',
      done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (openid) REFERENCES users(openid)
    );

    CREATE INDEX IF NOT EXISTS idx_habits_openid_date ON habits(openid, date);
    CREATE INDEX IF NOT EXISTS idx_metric_records_openid ON metric_records(openid, metric_key, recorded_at);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_openid ON chat_messages(openid, created_at);
    CREATE INDEX IF NOT EXISTS idx_plans_openid_week ON plans(openid, week_start);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_unique ON plans(openid, week_start, title);
  `)

  return db
}
