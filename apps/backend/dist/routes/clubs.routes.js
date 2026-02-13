"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const clubs_controller_1 = require("../controllers/clubs.controller");
const router = (0, express_1.Router)();
router.get('/', clubs_controller_1.listClubs);
router.get('/:id', clubs_controller_1.getClub);
router.post('/', auth_1.authenticate, (0, roles_1.requireRole)('admin'), clubs_controller_1.createClub);
router.patch('/:id', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), clubs_controller_1.updateClub);
router.delete('/:id', auth_1.authenticate, (0, roles_1.requireRole)('admin'), clubs_controller_1.deleteClub);
exports.default = router;
//# sourceMappingURL=clubs.routes.js.map