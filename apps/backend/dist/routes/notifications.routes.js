"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const notifications_controller_1 = require("../controllers/notifications.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', notifications_controller_1.list);
router.patch('/:id/read', notifications_controller_1.markRead);
router.patch('/read-all', notifications_controller_1.markAllRead);
exports.default = router;
//# sourceMappingURL=notifications.routes.js.map