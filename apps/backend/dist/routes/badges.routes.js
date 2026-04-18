"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const badges_controller_1 = require("../controllers/badges.controller");
const router = (0, express_1.Router)();
router.get('/catalog', auth_1.authenticate, badges_controller_1.getCatalog);
router.get('/me', auth_1.authenticate, badges_controller_1.getMyBadges);
router.get('/me/progress', auth_1.authenticate, badges_controller_1.getMyProgress);
router.patch('/me/featured', auth_1.authenticate, badges_controller_1.patchFeaturedBadge);
exports.default = router;
//# sourceMappingURL=badges.routes.js.map