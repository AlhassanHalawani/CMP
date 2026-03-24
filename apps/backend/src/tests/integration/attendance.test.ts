import {
  createTestDb,
  generateTestToken,
  generateAdminToken,
  generateLeaderToken,
  seedAttendanceData,
  TEST_JWT_SECRET,
} from '../setup';
import type { Database as DatabaseType } from 'better-sqlite3';

let testDb: DatabaseType;

jest.mock('../../config/env', () => ({
  env: {
    nodeEnv: 'test',
    port: 3000,
    databasePath: ':memory:',
    keycloak: {
      url: 'http://localhost:8080',
      realm: 'cmp',
      clientId: 'cmp-app',
      clientSecret: 'test-secret',
    },
    jwt: { secret: TEST_JWT_SECRET },
    smtp: { host: 'localhost', port: 1025, user: '', pass: '', from: 'test@test.com' },
    allowedSignupDomains: ['stu.kau.edu.sa', 'kau.edu.sa'],
    isDev: true,
    isProd: false,
  },
}));

jest.mock('../../config/database', () => {
  return {
    get db() {
      return testDb;
    },
  };
});

jest.mock('../../services/keycloakAdmin.service', () => ({
  createKeycloakUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/qrcode.service', () => ({
  generateQr: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode'),
}));

import request from 'supertest';
import { createTestApp } from '../createTestApp';

const app = createTestApp();

beforeEach(() => {
  testDb = createTestDb();
  seedAttendanceData(testDb);
});

afterEach(() => {
  if (testDb) testDb.close();
});

describe('Attendance API', () => {
  // --- Role auth for QR generation ---
  describe('POST /api/attendance/:eventId/qr', () => {
    it('returns 403 for student role', async () => {
      const token = generateTestToken();
      const res = await request(app)
        .post('/api/attendance/1/qr')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('returns 200 for admin role', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .post('/api/attendance/1/qr')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('qr');
    });

    it('returns 200 for club_leader role', async () => {
      const token = generateLeaderToken();
      const res = await request(app)
        .post('/api/attendance/1/qr')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('returns 404 for non-existent event', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .post('/api/attendance/999/qr')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('returns 400 for draft event', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .post('/api/attendance/2/qr')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/published/i);
    });
  });

  // --- QR check-in ---
  describe('POST /api/attendance/check-in', () => {
    it('succeeds with valid token for registered student', async () => {
      // First generate a QR token
      const adminToken = generateAdminToken();
      const qrRes = await request(app)
        .post('/api/attendance/1/qr')
        .set('Authorization', `Bearer ${adminToken}`);
      const qrToken = qrRes.body.token;

      // Check in as student
      const studentToken = generateTestToken();
      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ token: qrToken });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.method).toBe('qr');
    });

    it('returns 400 for invalid token', async () => {
      const studentToken = generateTestToken();
      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ token: 'invalid-token' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing token', async () => {
      const studentToken = generateTestToken();
      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 409 for duplicate check-in', async () => {
      // Generate QR
      const adminToken = generateAdminToken();
      const qrRes = await request(app)
        .post('/api/attendance/1/qr')
        .set('Authorization', `Bearer ${adminToken}`);
      const qrToken = qrRes.body.token;

      const studentToken = generateTestToken();

      // First check-in
      await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ token: qrToken });

      // Generate a new QR for the second attempt
      const qrRes2 = await request(app)
        .post('/api/attendance/1/qr')
        .set('Authorization', `Bearer ${adminToken}`);

      // Duplicate check-in
      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ token: qrRes2.body.token });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already/i);
    });

    it('returns 403 for unregistered user', async () => {
      // Leader is not registered for event 1
      const adminToken = generateAdminToken();
      const qrRes = await request(app)
        .post('/api/attendance/1/qr')
        .set('Authorization', `Bearer ${adminToken}`);
      const qrToken = qrRes.body.token;

      const leaderToken = generateLeaderToken();
      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ token: qrToken });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/registered/i);
    });
  });

  // --- Manual check-in ---
  describe('POST /api/attendance/:eventId/manual', () => {
    it('returns 403 for student role', async () => {
      const token = generateTestToken();
      const res = await request(app)
        .post('/api/attendance/1/manual')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: 1 });
      expect(res.status).toBe(403);
    });

    it('succeeds for admin with valid user_id', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .post('/api/attendance/1/manual')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: 1 });
      expect(res.status).toBe(201);
      expect(res.body.method).toBe('manual');
    });

    it('returns 409 for duplicate manual check-in', async () => {
      const token = generateAdminToken();
      await request(app)
        .post('/api/attendance/1/manual')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: 1 });

      const res = await request(app)
        .post('/api/attendance/1/manual')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: 1 });
      expect(res.status).toBe(409);
    });

    it('returns 400 for draft event', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .post('/api/attendance/2/manual')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: 1 });
      expect(res.status).toBe(400);
    });
  });

  // --- Attendance list ---
  describe('GET /api/attendance/:eventId', () => {
    it('returns 403 for student role', async () => {
      const token = generateTestToken();
      const res = await request(app)
        .get('/api/attendance/1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('returns attendance list for admin', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .get('/api/attendance/1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('summary');
    });

    it('returns 404 for non-existent event', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .get('/api/attendance/999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
