"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const validate_1 = require("../middleware/validate");
const auth_controller_1 = require("../controllers/auth.controller");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
// Rate-limit signup: max 10 attempts per IP per 15-minute window
// Disabled (very high limit) in test to avoid interference with test suites
const signupLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: env_1.env.nodeEnv === 'test' ? 10_000 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many signup attempts. Please try again later.' },
});
router.post('/signup', signupLimiter, (0, validate_1.validate)([
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('A valid email address is required.')
        .normalizeEmail(),
    (0, express_validator_1.body)('name')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Name is required.')
        .isLength({ max: 100 })
        .withMessage('Name must not exceed 100 characters.'),
    (0, express_validator_1.body)('password')
        .isString()
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters.')
        .isLength({ max: 128 })
        .withMessage('Password must not exceed 128 characters.')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter.')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter.')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number.'),
]), auth_controller_1.signup);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map