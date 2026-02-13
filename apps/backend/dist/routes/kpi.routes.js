"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const kpi_controller_1 = require("../controllers/kpi.controller");
const router = (0, express_1.Router)();
router.get('/leaderboard', kpi_controller_1.getLeaderboard);
router.get('/club/:clubId', kpi_controller_1.getClubSummary);
router.post('/', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), kpi_controller_1.recordMetric);
exports.default = router;
//# sourceMappingURL=kpi.routes.js.map