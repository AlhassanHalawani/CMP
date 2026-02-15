import { Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { createKeycloakUser } from '../services/keycloakAdmin.service';

export async function signup(req: Request, res: Response): Promise<void> {
  const email: string = (req.body.email ?? '').trim().toLowerCase();
  const name: string = (req.body.name ?? '').trim();
  const password: string = req.body.password ?? '';

  const domain = email.split('@')[1];
  const allowed = env.allowedSignupDomains;

  if (!allowed.includes(domain)) {
    res.status(422).json({
      error: `Only @${allowed.join(' and @')} emails are allowed.`,
    });
    return;
  }

  try {
    await createKeycloakUser({ email, name, password });
    logger.info(`New user registered: ${email}`);
    res.status(201).json({ ok: true });
  } catch (err: any) {
    if (err?.status === 409) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    logger.error(`Signup error for ${email}: ${err?.message}`);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}
