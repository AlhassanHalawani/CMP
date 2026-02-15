import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

import authRouter from './routes/auth.routes';
import usersRouter from './routes/users.routes';
import clubsRouter from './routes/clubs.routes';
import eventsRouter from './routes/events.routes';
import attendanceRouter from './routes/attendance.routes';
import achievementsRouter from './routes/achievements.routes';
import kpiRouter from './routes/kpi.routes';
import notificationsRouter from './routes/notifications.routes';
import adminRouter from './routes/admin.routes';

// ensure db is initialized on startup
import './config/database';

const app = express();

// --- global middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json());

// --- health check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- routes ---
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/clubs', clubsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/kpi', kpiRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);

// --- error handler (must be last) ---
app.use(errorHandler);

// --- start server ---
app.listen(env.port, () => {
  logger.info(`CMP backend running on port ${env.port} [${env.nodeEnv}]`);
});

export default app;
