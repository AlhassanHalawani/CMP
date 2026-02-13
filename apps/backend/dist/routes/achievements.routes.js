"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const achievements_controller_1 = require("../controllers/achievements.controller");
const router = (0, express_1.Router)();
router.get('/user/:userId', achievements_controller_1.listForUser);
router.get('/user/:userId/report', achievements_controller_1.downloadReport);
router.get('/club/:clubId', achievements_controller_1.listForClub);
router.post('/', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), achievements_controller_1.create);
router.delete('/:id', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), achievements_controller_1.remove);
exports.default = router;
//# sourceMappingURL=achievements.routes.js.map