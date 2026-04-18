"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const dailyQuestions_controller_1 = require("../controllers/dailyQuestions.controller");
const router = (0, express_1.Router)();
// Literal paths must come before parameterized :id routes
// ─── Student routes (all authenticated users) ─────────────────────────────────
router.get('/me/streak', auth_1.authenticate, dailyQuestions_controller_1.getMyStreak);
router.get('/me/history', auth_1.authenticate, dailyQuestions_controller_1.getMyHistory);
router.get('/', auth_1.authenticate, dailyQuestions_controller_1.getStudentFeed);
router.post('/:id/answer', auth_1.authenticate, dailyQuestions_controller_1.answerQuestion);
// ─── Management routes (club_leader + admin) ──────────────────────────────────
router.get('/manage', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), dailyQuestions_controller_1.getManagedQuestions);
router.post('/', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), dailyQuestions_controller_1.createDailyQuestion);
router.patch('/:id', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), dailyQuestions_controller_1.updateDailyQuestion);
router.delete('/:id', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), dailyQuestions_controller_1.deleteDailyQuestion);
router.post('/:id/publish', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), dailyQuestions_controller_1.publishDailyQuestion);
exports.default = router;
//# sourceMappingURL=dailyQuestions.routes.js.map