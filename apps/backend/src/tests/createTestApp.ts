import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRouter from '../routes/auth.routes';
import eventsRouter from '../routes/events.routes';
import attendanceRouter from '../routes/attendance.routes';
import { errorHandler } from '../middleware/errorHandler';

/**
 * Creates a minimal Express app for integration testing.
 * Assumes that jest module mocks for database, env, and keycloakAdmin
 * are already in place before importing routes.
 */
export function createTestApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/attendance', attendanceRouter);

  app.use(errorHandler);

  return app;
}
