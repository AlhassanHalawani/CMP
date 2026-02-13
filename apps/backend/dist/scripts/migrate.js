"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dbPath = process.env.DATABASE_PATH || './data/cmp.db';
const migrationsDir = path_1.default.resolve(__dirname, '../../migrations');
const dbDir = path_1.default.dirname(path_1.default.resolve(dbPath));
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
const db = new better_sqlite3_1.default(path_1.default.resolve(dbPath));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map((row) => row.name));
const files = fs_1.default
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
let count = 0;
for (const file of files) {
    if (applied.has(file)) {
        console.log(`  skip: ${file} (already applied)`);
        continue;
    }
    const sql = fs_1.default.readFileSync(path_1.default.join(migrationsDir, file), 'utf-8').trim();
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
//# sourceMappingURL=migrate.js.map