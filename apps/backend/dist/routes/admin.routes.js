"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const admin_controller_1 = require("../controllers/admin.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use((0, roles_1.requireRole)('admin'));
router.get('/stats', admin_controller_1.getStats);
router.get('/audit-log', admin_controller_1.getAuditLog);
router.get('/semesters', admin_controller_1.listSemesters);
router.post('/semesters', admin_controller_1.createSemester);
router.patch('/semesters/:id/activate', admin_controller_1.setActiveSemester);
router.delete('/semesters/:id', admin_controller_1.deleteSemester);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map