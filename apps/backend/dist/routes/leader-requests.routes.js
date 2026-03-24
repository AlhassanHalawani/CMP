"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const leader_requests_controller_1 = require("../controllers/leader-requests.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', leader_requests_controller_1.createLeaderRequest);
router.get('/mine', leader_requests_controller_1.listMyLeaderRequests);
router.get('/', (0, roles_1.requireRole)('admin'), leader_requests_controller_1.listLeaderRequests);
router.patch('/:id/approve', (0, roles_1.requireRole)('admin'), leader_requests_controller_1.approveLeaderRequest);
router.patch('/:id/reject', (0, roles_1.requireRole)('admin'), leader_requests_controller_1.rejectLeaderRequest);
exports.default = router;
//# sourceMappingURL=leader-requests.routes.js.map