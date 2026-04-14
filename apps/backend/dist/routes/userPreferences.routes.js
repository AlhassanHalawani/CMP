"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const userPreferences_controller_1 = require("../controllers/userPreferences.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/me/preferences', userPreferences_controller_1.getMyPreferences);
router.patch('/me/preferences', userPreferences_controller_1.updateMyPreferences);
exports.default = router;
//# sourceMappingURL=userPreferences.routes.js.map