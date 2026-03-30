/**
 * Regression tests for event visibility rules.
 *
 * Seed layout (seedOwnershipData):
 *   Users:
 *     id=1  student        (test-keycloak-id)
 *     id=2  admin          (admin-keycloak-id)
 *     id=3  club_leader    (leader-keycloak-id)   → owns club 1
 *     id=4  club_leader    (leader2-keycloak-id)  → owns club 2
 *   Clubs:
 *     id=1  leader_id=3
 *     id=2  leader_id=4
 *   Events:
 *     id=1  club_id=1  published
 *     id=2  club_id=1  draft      ← leader1 can see, leader2 cannot
 *     id=3  club_id=2  published
 */

import {
  createTestDb,
  generateAdminToken,
  generateLeaderToken,
  generateLeader2Token,
  generateTestToken,
  seedOwnershipData,
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

import request from 'supertest';
import { createTestApp } from '../createTestApp';

const app = createTestApp();

beforeEach(() => {
  testDb = createTestDb();
  seedOwnershipData(testDb);
});

afterEach(() => {
  if (testDb) testDb.close();
});

describe('GET /api/events — list visibility', () => {
  it('anonymous: only published events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    const ids = res.body.data.map((e: any) => e.id);
    expect(ids).toContain(1); // club1 published
    expect(ids).toContain(3); // club2 published
    expect(ids).not.toContain(2); // club1 draft — hidden
  });

  it('student: only published events', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${generateTestToken()}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.map((e: any) => e.id);
    expect(ids).toContain(1);
    expect(ids).toContain(3);
    expect(ids).not.toContain(2);
  });

  it('admin: sees all events including drafts', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${generateAdminToken()}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.map((e: any) => e.id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).toContain(3);
  });

  it('leader1: sees own draft plus all published', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${generateLeaderToken()}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.map((e: any) => e.id);
    expect(ids).toContain(1); // own club published
    expect(ids).toContain(2); // own club draft ← key assertion
    expect(ids).toContain(3); // other club published
  });

  it('leader2: does not see leader1 club draft', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${generateLeader2Token()}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.map((e: any) => e.id);
    expect(ids).not.toContain(2); // club1 draft — not leader2's club
    expect(ids).toContain(1);
    expect(ids).toContain(3);
  });

  it('invalid token returns 401', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('total count matches visible events for leader1', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${generateLeaderToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3); // all 3 events visible
  });

  it('total count matches visible events for anonymous', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2); // only 2 published
  });
});

describe('GET /api/events/:id — detail visibility', () => {
  it('published event is accessible anonymously', async () => {
    const res = await request(app).get('/api/events/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('draft event returns 404 for anonymous', async () => {
    const res = await request(app).get('/api/events/2');
    expect(res.status).toBe(404);
  });

  it('draft event returns 404 for student', async () => {
    const res = await request(app)
      .get('/api/events/2')
      .set('Authorization', `Bearer ${generateTestToken()}`);
    expect(res.status).toBe(404);
  });

  it('draft event is accessible to admin', async () => {
    const res = await request(app)
      .get('/api/events/2')
      .set('Authorization', `Bearer ${generateAdminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(2);
  });

  it('draft event is accessible to the owning leader', async () => {
    const res = await request(app)
      .get('/api/events/2')
      .set('Authorization', `Bearer ${generateLeaderToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(2);
  });

  it('draft event returns 404 for non-owning leader', async () => {
    const res = await request(app)
      .get('/api/events/2')
      .set('Authorization', `Bearer ${generateLeader2Token()}`);
    expect(res.status).toBe(404);
  });
});

describe('Create event then list — regression', () => {
  it('leader-created draft appears in leader own list immediately', async () => {
    const leaderToken = generateLeaderToken();

    // Create a new event as leader1
    const createRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        club_id: 1,
        title: 'New Draft Event',
        title_ar: 'فعالية جديدة',
        starts_at: '2026-09-01 10:00:00',
        ends_at: '2026-09-01 12:00:00',
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('draft');
    const newId = createRes.body.id;

    // Immediately list as same leader — new draft must be visible
    const listRes = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(listRes.status).toBe(200);
    const ids = listRes.body.data.map((e: any) => e.id);
    expect(ids).toContain(newId);
  });

  it('leader-created draft does not appear in anonymous list', async () => {
    const leaderToken = generateLeaderToken();

    const createRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        club_id: 1,
        title: 'Hidden Draft',
        title_ar: 'مسودة مخفية',
        starts_at: '2026-09-01 10:00:00',
        ends_at: '2026-09-01 12:00:00',
      });
    expect(createRes.status).toBe(201);
    const newId = createRes.body.id;

    const listRes = await request(app).get('/api/events');
    expect(listRes.status).toBe(200);
    const ids = listRes.body.data.map((e: any) => e.id);
    expect(ids).not.toContain(newId);
  });
});
