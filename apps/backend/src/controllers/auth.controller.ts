import { Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export async function signupValidate(req: Request, res: Response): Promise<void> {
  const rawEmail: string = req.body.email ?? '';
  const email = rawEmail.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    res.status(422).json({ error: 'A valid email address is required.' });
    return;
  }

  const domain = email.split('@')[1];
  const allowed = env.allowedSignupDomains;

  if (!allowed.includes(domain)) {
    logger.info(`Signup rejected for domain: ${domain}`);
    res.status(422).json({
      error: `Only @${allowed.join(' and @')} emails are allowed.`,
    });
    return;
  }

  logger.info(`Signup domain validated for: ${email}`);
  res.json({ ok: true });
}
