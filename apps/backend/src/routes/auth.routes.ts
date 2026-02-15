import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { signup } from '../controllers/auth.controller';

const router = Router();

router.post(
  '/signup',
  validate([
    body('email').isEmail().withMessage('A valid email address is required.'),
    body('name').isString().trim().notEmpty().withMessage('Name is required.'),
    body('password')
      .isString()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters.'),
  ]),
  signup,
);

export default router;
