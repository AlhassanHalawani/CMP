"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const analytics_controller_1 = require("../controllers/analytics.controller");
const router = (0, express_1.Router)();
// Auth is optional for page view recording — try authenticate but don't block
router.post('/page-view', (req, res, next) => {
    (0, auth_1.authenticate)(req, res, (err) => {
        // swallow auth errors — user may not be logged in
        if (err)
            return next();
        next();
    });
}, analytics_controller_1.recordPageView);
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map