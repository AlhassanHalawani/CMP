"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestApp = createTestApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const auth_routes_1 = __importDefault(require("../routes/auth.routes"));
const events_routes_1 = __importDefault(require("../routes/events.routes"));
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Creates a minimal Express app for integration testing.
 * Assumes that jest module mocks for database, env, and keycloakAdmin
 * are already in place before importing routes.
 */
function createTestApp() {
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok' });
    });
    app.use('/api/auth', auth_routes_1.default);
    app.use('/api/events', events_routes_1.default);
    app.use(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=createTestApp.js.map