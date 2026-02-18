import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { signup } from '../controllers/auth.controller';
import { env } from '../config/env';

const router = Router();

// Rate-limit signup: max 10 attempts per IP per 15-minute window
// Disabled (very high limit) in test to avoid interference with test suites
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === 'test' ? 10_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts. Please try again later.' },
});

router.post(
  '/signup',
  signupLimiter,
  validate([
    body('email')
      .isEmail()
      .withMessage('A valid email address is required.')
      .normalizeEmail(),
    body('name')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Name is required.')
      .isLength({ max: 100 })
      .withMessage('Name must not exceed 100 characters.'),
    body('password')
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
  ]),
  signup,
);

export default router;
