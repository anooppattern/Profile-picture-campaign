import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "db", "profilepic.db");

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        filename TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  return db;
}

export interface Template {
  id: number;
  name: string;
  filename: string;
  category: string;
  is_active: number;
  created_at: string;
}

export function getTemplates(activeOnly = true): Template[] {
  const d = getDb();
  if (activeOnly) {
    return d.prepare("SELECT * FROM templates WHERE is_active = 1 ORDER BY created_at DESC").all() as Template[];
  }
  return d.prepare("SELECT * FROM templates ORDER BY created_at DESC").all() as Template[];
}

export function addTemplate(name: string, filename: string, category: string): Template {
  const d = getDb();
  const result = d.prepare("INSERT INTO templates (name, filename, category) VALUES (?, ?, ?)").run(name, filename, category);
  return d.prepare("SELECT * FROM templates WHERE id = ?").get(result.lastInsertRowid) as Template;
}

export function deleteTemplate(id: number): boolean {
  const d = getDb();
  const result = d.prepare("DELETE FROM templates WHERE id = ?").run(id);
  return result.changes > 0;
}

export function toggleTemplate(id: number): Template | null {
  const d = getDb();
  d.prepare("UPDATE templates SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?").run(id);
  return d.prepare("SELECT * FROM templates WHERE id = ?").get(id) as Template | null;
}

export function updateTemplate(id: number, updates: { name?: string; category?: string }): Template | null {
  const d = getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (updates.name) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.category) {
    fields.push("category = ?");
    values.push(updates.category);
  }
  if (fields.length === 0) return null;
  values.push(id);
  d.prepare(`UPDATE templates SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return d.prepare("SELECT * FROM templates WHERE id = ?").get(id) as Template | null;
}
