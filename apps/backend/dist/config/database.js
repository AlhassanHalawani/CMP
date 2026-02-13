"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
const dbPath = path_1.default.resolve(env_1.env.databasePath);
const dbDir = path_1.default.dirname(dbPath);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
exports.db = new better_sqlite3_1.default(dbPath);
exports.db.pragma('journal_mode = WAL');
exports.db.pragma('foreign_keys = ON');
exports.db.pragma('busy_timeout = 5000');
logger_1.logger.info(`SQLite connected: ${dbPath}`);
//# sourceMappingURL=database.js.map