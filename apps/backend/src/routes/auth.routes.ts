import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { signupValidate } from '../controllers/auth.controller';

const router = Router();

router.post(
  '/signup',
  validate([body('email').isString().notEmpty().withMessage('Email is required.')]),
  signupValidate,
);

export default router;
