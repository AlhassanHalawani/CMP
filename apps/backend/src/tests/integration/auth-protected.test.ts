import { createTestDb, generateTestToken, TEST_JWT_SECRET } from '../setup';
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

import request from 'supertest';
import { createTestApp } from '../createTestApp';

const app = createTestApp();

beforeEach(() => {
  testDb = createTestDb();
});

afterEach(() => {
  if (testDb) testDb.close();
});

describe('Auth-protected route behavior', () => {
  describe('without token', () => {
    it('GET /api/events is public (no auth required)', async () => {
      const res = await request(app).get('/api/events');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('POST /api/events/:id/register returns 401 without token', async () => {
      const res = await request(app).post('/api/events/1/register');
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('POST /api/events returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({ title: 'Test' });
      expect(res.status).toBe(401);
    });
  });

  describe('with valid token', () => {
    it('POST /api/events/:id/register is accessible with valid token', async () => {
      const token = generateTestToken();

      // Event doesn't exist, so we get 404 — but NOT 401
      const res = await request(app)
        .post('/api/events/999/register')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('POST /api/events returns 403 for student role', async () => {
      const token = generateTestToken({ realm_access: { roles: ['student'] } });

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test' });

      expect(res.status).toBe(403);
    });
  });

  describe('with invalid token', () => {
    it('rejects malformed Bearer token', async () => {
      const res = await request(app)
        .post('/api/events/1/register')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('rejects missing Bearer prefix', async () => {
      const token = generateTestToken();
      const res = await request(app)
        .post('/api/events/1/register')
        .set('Authorization', token);

      expect(res.status).toBe(401);
    });
  });
});
