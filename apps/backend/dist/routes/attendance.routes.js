"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const attendance_controller_1 = require("../controllers/attendance.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/:eventId/qr', (0, roles_1.requireRole)('admin', 'club_leader'), attendance_controller_1.generateEventQr);
router.post('/check-in', attendance_controller_1.checkIn);
router.post('/:eventId/manual', (0, roles_1.requireRole)('admin', 'club_leader'), attendance_controller_1.manualCheckIn);
router.get('/:eventId', (0, roles_1.requireRole)('admin', 'club_leader'), attendance_controller_1.getAttendanceList);
exports.default = router;
//# sourceMappingURL=attendance.routes.js.map