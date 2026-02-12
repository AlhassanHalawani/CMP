import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: false,
  ...(env.smtp.user ? { auth: { user: env.smtp.user, pass: env.smtp.pass } } : {}),
});

export async function sendEmail(options: { to: string; subject: string; html: string }): Promise<void> {
  try {
    await transporter.sendMail({
      from: env.smtp.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    logger.info(`Email sent to ${options.to}: ${options.subject}`);
  } catch (err) {
    logger.error('Failed to send email', { error: (err as Error).message, to: options.to });
    throw err;
  }
}
