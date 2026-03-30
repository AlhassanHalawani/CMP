/**
 * Integration tests for role update and club leader assignment.
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
 */

import {
  createTestDb,
  generateAdminToken,
  generateLeaderToken,
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
  syncUserRealmRole: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/qrcode.service', () => ({
  generateQr: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode'),
}));

jest.mock('../../services/pdf.service', () => ({
  generateAchievementReport: jest.fn().mockResolvedValue(Buffer.from('pdf')),
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

// ---------------------------------------------------------------------------
// PATCH /api/users/:id/role
// ---------------------------------------------------------------------------
describe('PATCH /api/users/:id/role', () => {
  it('allows admin to promote a student to club_leader', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .patch('/api/users/1/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'club_leader' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('club_leader');
  });

  it('allows admin to promote a student to admin', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .patch('/api/users/1/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });

  it('allows admin to demote a club_leader to student', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .patch('/api/users/3/role') // user 3 is club_leader
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'student' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('student');
  });

  it('returns 403 when club_leader attempts a role update', async () => {
    const token = generateLeaderToken();
    const res = await request(app)
      .patch('/api/users/1/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('returns 403 when student attempts a role update', async () => {
    const token = generateTestToken();
    const res = await request(app)
      .patch('/api/users/1/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent user', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .patch('/api/users/999/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// POST /api/clubs/:id/assign-leader
// ---------------------------------------------------------------------------
describe('POST /api/clubs/:id/assign-leader', () => {
  it('allows admin to assign a new club leader', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .post('/api/clubs/1/assign-leader')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: 1 }); // promote student (id=1) to leader of club 1
    expect(res.status).toBe(200);
    expect(res.body.leader_id).toBe(1);
  });

  it('promotes the new user role to club_leader in the DB', async () => {
    const token = generateAdminToken();
    await request(app)
      .post('/api/clubs/1/assign-leader')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: 1 });
    // Verify DB role was updated
    const user = testDb.prepare('SELECT role FROM users WHERE id = 1').get() as { role: string };
    expect(user.role).toBe('club_leader');
  });

  it('demotes the previous leader to student when they lead no other club', async () => {
    const token = generateAdminToken();
    await request(app)
      .post('/api/clubs/1/assign-leader')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: 1 }); // reassign club 1 from leader (id=3) to student (id=1)
    // Previous leader (id=3) no longer leads any club → should be demoted
    const prevLeader = testDb.prepare('SELECT role FROM users WHERE id = 3').get() as { role: string };
    expect(prevLeader.role).toBe('student');
  });

  it('keeps previous leader as club_leader if they still lead another club', async () => {
    // First assign club 2 to leader1 (id=3) so they lead both clubs
    testDb.prepare('UPDATE clubs SET leader_id = 3 WHERE id = 2').run();
    testDb.prepare("UPDATE users SET role = 'club_leader' WHERE id = 3").run();

    const token = generateAdminToken();
    await request(app)
      .post('/api/clubs/1/assign-leader')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: 1 }); // reassign club 1; leader1 still leads club 2

    const prevLeader = testDb.prepare('SELECT role FROM users WHERE id = 3').get() as { role: string };
    expect(prevLeader.role).toBe('club_leader');
  });

  it('returns 400 when user_id is missing', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .post('/api/clubs/1/assign-leader')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 for a non-existent club', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .post('/api/clubs/999/assign-leader')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: 1 });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 for a non-existent user', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .post('/api/clubs/1/assign-leader')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: 999 });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 403 when club_leader attempts to assign a leader', async () => {
    const token = generateLeaderToken();
    const res = await request(app)
      .post('/api/clubs/1/assign-leader')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: 1 });
    expect(res.status).toBe(403);
  });

  it('returns 403 when student attempts to assign a leader', async () => {
    const token = generateTestToken();
    const res = await request(app)
      .post('/api/clubs/1/assign-leader')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: 1 });
    expect(res.status).toBe(403);
  });
});
