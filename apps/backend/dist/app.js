"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const clubs_routes_1 = __importDefault(require("./routes/clubs.routes"));
const events_routes_1 = __importDefault(require("./routes/events.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const achievements_routes_1 = __importDefault(require("./routes/achievements.routes"));
const kpi_routes_1 = __importDefault(require("./routes/kpi.routes"));
const notifications_routes_1 = __importDefault(require("./routes/notifications.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
// ensure db is initialized on startup
require("./config/database");
const app = (0, express_1.default)();
// --- global middleware ---
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// --- health check ---
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// --- routes ---
app.use('/api/users', users_routes_1.default);
app.use('/api/clubs', clubs_routes_1.default);
app.use('/api/events', events_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/achievements', achievements_routes_1.default);
app.use('/api/kpi', kpi_routes_1.default);
app.use('/api/notifications', notifications_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
// --- error handler (must be last) ---
app.use(errorHandler_1.errorHandler);
// --- start server ---
app.listen(env_1.env.port, () => {
    logger_1.logger.info(`CMP backend running on port ${env_1.env.port} [${env_1.env.nodeEnv}]`);
});
exports.default = app;
//# sourceMappingURL=app.js.map