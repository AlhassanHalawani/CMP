import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || './data/cmp.db';
const migrationsDir = path.resolve(__dirname, '../../migrations');

const dbDir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.resolve(dbPath));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const applied = new Set(
  db.prepare('SELECT name FROM _migrations').all().map((row: any) => row.name)
);

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

let count = 0;

for (const file of files) {
  if (applied.has(file)) {
    console.log(`  skip: ${file} (already applied)`);
    continue;
  }

  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8').trim();
  if (!sql) {
    console.log(`  skip: ${file} (empty)`);
    continue;
  }

  const run = db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
  });

  run();
  count++;
  console.log(`  applied: ${file}`);
}

console.log(`\nMigrations complete. ${count} applied, ${files.length - count} skipped.`);
db.close();
