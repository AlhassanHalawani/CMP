"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const clubs_controller_1 = require("../controllers/clubs.controller");
const membership_controller_1 = require("../controllers/membership.controller");
const router = (0, express_1.Router)();
router.get('/', clubs_controller_1.listClubs);
router.get('/:id', clubs_controller_1.getClub);
router.post('/', auth_1.authenticate, (0, roles_1.requireRole)('admin'), clubs_controller_1.createClub);
router.patch('/:id', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), clubs_controller_1.updateClub);
router.delete('/:id', auth_1.authenticate, (0, roles_1.requireRole)('admin'), clubs_controller_1.deleteClub);
// Admin: assign club leader
router.post('/:id/assign-leader', auth_1.authenticate, (0, roles_1.requireRole)('admin'), clubs_controller_1.assignClubLeader);
// Stats & logo
router.get('/:id/stats', clubs_controller_1.getClubStats);
router.post('/:id/logo', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), clubs_controller_1.logoUpload.single('logo'), clubs_controller_1.uploadLogo);
// Membership routes
router.post('/:id/join', auth_1.authenticate, membership_controller_1.joinClub);
router.delete('/:id/membership', auth_1.authenticate, membership_controller_1.leaveClub);
router.get('/:id/membership/me', auth_1.authenticate, membership_controller_1.getMembership);
router.get('/:id/members', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), membership_controller_1.listMembers);
router.patch('/:id/members/:userId', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), membership_controller_1.updateMembership);
exports.default = router;
//# sourceMappingURL=clubs.routes.js.map