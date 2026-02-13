"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const users_controller_1 = require("../controllers/users.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/me', users_controller_1.getMe);
router.patch('/me', users_controller_1.updateMe);
router.get('/', (0, roles_1.requireRole)('admin'), users_controller_1.listUsers);
router.patch('/:id/role', (0, roles_1.requireRole)('admin'), users_controller_1.updateUserRole);
exports.default = router;
//# sourceMappingURL=users.routes.js.map