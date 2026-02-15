"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validate_1 = require("../middleware/validate");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
router.post('/signup', (0, validate_1.validate)([
    (0, express_validator_1.body)('email').isEmail().withMessage('A valid email address is required.'),
    (0, express_validator_1.body)('name').isString().trim().notEmpty().withMessage('Name is required.'),
    (0, express_validator_1.body)('password')
        .isString()
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters.'),
]), auth_controller_1.signup);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map