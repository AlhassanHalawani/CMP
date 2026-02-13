"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const events_controller_1 = require("../controllers/events.controller");
const router = (0, express_1.Router)();
router.get('/', events_controller_1.listEvents);
router.get('/:id', events_controller_1.getEvent);
router.post('/', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), events_controller_1.createEvent);
router.patch('/:id', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), events_controller_1.updateEvent);
router.delete('/:id', auth_1.authenticate, (0, roles_1.requireRole)('admin', 'club_leader'), events_controller_1.deleteEvent);
router.post('/:id/register', auth_1.authenticate, events_controller_1.registerForEvent);
router.post('/:id/cancel', auth_1.authenticate, events_controller_1.cancelRegistration);
exports.default = router;
//# sourceMappingURL=events.routes.js.map