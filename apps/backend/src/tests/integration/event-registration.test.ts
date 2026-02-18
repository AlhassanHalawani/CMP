import { createTestDb, generateTestToken, generateAdminToken, TEST_JWT_SECRET } from '../setup';
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

function seedTestData() {
  // Create a user (simulating what the auth middleware does on token validation)
  testDb.prepare(
    "INSERT INTO users (keycloak_id, email, name, role) VALUES ('test-keycloak-id', 'test@stu.kau.edu.sa', 'Test User', 'student')"
  ).run();

  // Create an admin user
  testDb.prepare(
    "INSERT INTO users (keycloak_id, email, name, role) VALUES ('admin-keycloak-id', 'admin@kau.edu.sa', 'Admin User', 'admin')"
  ).run();

  // Create a club
  testDb.prepare(
    "INSERT INTO clubs (name, name_ar, description, description_ar) VALUES ('Tech Club', 'نادي التقنية', 'A tech club', 'نادي تقني')"
  ).run();

  // Create a published event
  testDb.prepare(
    `INSERT INTO events (club_id, title, title_ar, description, description_ar, location, starts_at, ends_at, capacity, status, created_by)
     VALUES (1, 'Tech Talk', 'محادثة تقنية', 'A talk about tech', 'حديث عن التقنية', 'Room 101', '2099-01-01T10:00:00', '2099-01-01T12:00:00', 50, 'published', 2)`
  ).run();

  // Create a draft event
  testDb.prepare(
    `INSERT INTO events (club_id, title, title_ar, description, description_ar, location, starts_at, ends_at, capacity, status, created_by)
     VALUES (1, 'Draft Event', 'حدث مسودة', 'A draft', 'مسودة', 'Room 102', '2099-02-01T10:00:00', '2099-02-01T12:00:00', 10, 'draft', 2)`
  ).run();

  // Create a full-capacity event (capacity=1)
  testDb.prepare(
    `INSERT INTO events (club_id, title, title_ar, description, description_ar, location, starts_at, ends_at, capacity, status, created_by)
     VALUES (1, 'Full Event', 'حدث ممتلئ', 'A full event', 'حدث ممتلئ', 'Room 103', '2099-03-01T10:00:00', '2099-03-01T12:00:00', 1, 'published', 2)`
  ).run();
}

beforeEach(() => {
  testDb = createTestDb();
  seedTestData();
});

afterEach(() => {
  if (testDb) testDb.close();
});

describe('Event registration flow', () => {
  describe('happy path', () => {
    it('registers a student for a published event', async () => {
      const token = generateTestToken();

      const res = await request(app)
        .post('/api/events/1/register')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        event_id: 1,
        user_id: 1,
        status: 'confirmed',
      });
    });

    it('cancels a registration', async () => {
      const token = generateTestToken();

      // First register
      await request(app)
        .post('/api/events/1/register')
        .set('Authorization', `Bearer ${token}`);

      // Then cancel
      const res = await request(app)
        .post('/api/events/1/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/cancelled/i);
    });
  });

  describe('failure cases', () => {
    it('rejects registration for non-existent event', async () => {
      const token = generateTestToken();

      const res = await request(app)
        .post('/api/events/999/register')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('rejects registration for draft event', async () => {
      const token = generateTestToken();

      const res = await request(app)
        .post('/api/events/2/register')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not open/i);
    });

    it('rejects duplicate registration', async () => {
      const token = generateTestToken();

      // Register once
      await request(app)
        .post('/api/events/1/register')
        .set('Authorization', `Bearer ${token}`);

      // Try again
      const res = await request(app)
        .post('/api/events/1/register')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already registered/i);
    });

    it('rejects registration when event is at full capacity', async () => {
      // Event 3 has capacity=1. Register admin first to fill it.
      const adminToken = generateAdminToken();
      await request(app)
        .post('/api/events/3/register')
        .set('Authorization', `Bearer ${adminToken}`);

      // Now try with student
      const studentToken = generateTestToken();
      const res = await request(app)
        .post('/api/events/3/register')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/full capacity/i);
    });

    it('rejects cancel for non-existent registration', async () => {
      const token = generateTestToken();

      const res = await request(app)
        .post('/api/events/1/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });
});
