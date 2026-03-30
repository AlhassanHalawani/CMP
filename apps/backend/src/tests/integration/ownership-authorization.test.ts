/**
 * Integration tests for role ownership hardening.
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
 *     id=1  club_id=1  published  (leader1 owns via club)
 *     id=2  club_id=1  draft
 *     id=3  club_id=2  published  (leader2 owns via club)
 *   Registrations: user 1 registered for event 1
 *   KPI metrics: one entry for club 1
 *   Achievements: one entry (user 1, club 1)
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
// Club ownership
// ---------------------------------------------------------------------------
describe('Club ownership — PATCH /api/clubs/:id', () => {
  it('allows admin to update any club', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .patch('/api/clubs/2')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Updated by admin' });
    expect(res.status).toBe(200);
  });

  it('allows leader to update their own club', async () => {
    const token = generateLeaderToken(); // leader-keycloak-id → user id=3 → club 1
    const res = await request(app)
      .patch('/api/clubs/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Updated by owner' });
    expect(res.status).toBe(200);
  });

  it('returns 403 when leader updates a club they do not own', async () => {
    const token = generateLeaderToken(); // owns club 1, not club 2
    const res = await request(app)
      .patch('/api/clubs/2')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Unauthorized attempt' });
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 403 when leader tries to change leader_id', async () => {
    const token = generateLeaderToken();
    const res = await request(app)
      .patch('/api/clubs/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ leader_id: 4 });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  it('allows admin to change leader_id', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .patch('/api/clubs/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ leader_id: 4 });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Event ownership — create
// ---------------------------------------------------------------------------
describe('Event ownership — POST /api/events', () => {
  const eventPayload = {
    title: 'New Event',
    title_ar: 'فعالية جديدة',
    starts_at: '2026-09-01 10:00:00',
    ends_at: '2026-09-01 12:00:00',
    status: 'draft',
  };

  it('allows admin to create event in any club', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...eventPayload, club_id: 2 });
    expect(res.status).toBe(201);
  });

  it('allows leader to create event in their own club', async () => {
    const token = generateLeaderToken(); // owns club 1
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...eventPayload, club_id: 1 });
    expect(res.status).toBe(201);
  });

  it('returns 403 when leader creates event in a club they do not own', async () => {
    const token = generateLeaderToken(); // owns club 1, not club 2
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...eventPayload, club_id: 2 });
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Event ownership — update
// ---------------------------------------------------------------------------
describe('Event ownership — PATCH /api/events/:id', () => {
  it('allows admin to update any event', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .patch('/api/events/3') // club 2 event
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Admin update' });
    expect(res.status).toBe(200);
  });

  it('allows leader to update their own event', async () => {
    const token = generateLeaderToken(); // owns club 1 → event 1
    const res = await request(app)
      .patch('/api/events/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Leader update' });
    expect(res.status).toBe(200);
  });

  it('returns 403 when leader updates an event they do not own', async () => {
    const token = generateLeaderToken(); // owns club 1, not club 2 (event 3)
    const res = await request(app)
      .patch('/api/events/3')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Unauthorized' });
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 403 when leader tries to move event to a club they do not own', async () => {
    const token = generateLeaderToken(); // owns club 1
    const res = await request(app)
      .patch('/api/events/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ club_id: 2 }); // trying to move to club 2
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('allows leader to move event to another club they own', async () => {
    // Set club 2 leader to leader1 first (admin action)
    const adminToken = generateAdminToken();
    await request(app)
      .patch('/api/clubs/2')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ leader_id: 3 }); // leader1 now owns both clubs

    const token = generateLeaderToken();
    const res = await request(app)
      .patch('/api/events/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ club_id: 2 });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Event ownership — delete
// ---------------------------------------------------------------------------
describe('Event ownership — DELETE /api/events/:id', () => {
  it('allows admin to delete any event', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .delete('/api/events/3')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it('allows leader to delete their own event', async () => {
    const token = generateLeaderToken();
    const res = await request(app)
      .delete('/api/events/1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it('returns 403 when leader deletes an event they do not own', async () => {
    const token = generateLeaderToken(); // owns club 1, not club 2 (event 3)
    const res = await request(app)
      .delete('/api/events/3')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Attendance ownership
// ---------------------------------------------------------------------------
describe('Attendance ownership', () => {
  describe('POST /api/attendance/:eventId/qr', () => {
    it('allows admin to generate QR for any event', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .post('/api/attendance/3/qr')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('qr');
    });

    it('allows leader to generate QR for their own event', async () => {
      const token = generateLeaderToken(); // owns club 1 → event 1
      const res = await request(app)
        .post('/api/attendance/1/qr')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('returns 403 when leader generates QR for event they do not own', async () => {
      const token = generateLeaderToken(); // owns club 1, not club 2 (event 3)
      const res = await request(app)
        .post('/api/attendance/3/qr')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 403 when leader2 generates QR for leader1 event', async () => {
      const token = generateLeader2Token(); // owns club 2, not club 1
      const res = await request(app)
        .post('/api/attendance/1/qr')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/attendance/:eventId/manual', () => {
    it('allows admin manual check-in for any event', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .post('/api/attendance/1/manual')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: 1 });
      expect(res.status).toBe(201);
    });

    it('allows leader manual check-in for their own event', async () => {
      const token = generateLeaderToken(); // owns club 1 → event 1
      const res = await request(app)
        .post('/api/attendance/1/manual')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: 1 });
      expect(res.status).toBe(201);
    });

    it('returns 403 when leader manually checks in for event they do not own', async () => {
      const token = generateLeaderToken(); // owns club 1, not club 2 (event 3)
      const res = await request(app)
        .post('/api/attendance/3/manual')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: 1 });
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/attendance/:eventId', () => {
    it('allows admin to view attendance for any event', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .get('/api/attendance/3')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('allows leader to view attendance for their own event', async () => {
      const token = generateLeaderToken();
      const res = await request(app)
        .get('/api/attendance/1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('returns 403 when leader views attendance for event they do not own', async () => {
      const token = generateLeaderToken(); // owns club 1, not club 2 (event 3)
      const res = await request(app)
        .get('/api/attendance/3')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/attendance/:eventId/registrations', () => {
    it('allows admin to view registrations for any event', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .get('/api/attendance/3/registrations')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('allows leader to view registrations for their own event', async () => {
      const token = generateLeaderToken();
      const res = await request(app)
        .get('/api/attendance/1/registrations')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('returns 403 when leader views registrations for event they do not own', async () => {
      const token = generateLeaderToken();
      const res = await request(app)
        .get('/api/attendance/3/registrations')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
  });
});

// ---------------------------------------------------------------------------
// KPI ownership
// ---------------------------------------------------------------------------
describe('KPI ownership — POST /api/kpi', () => {
  it('allows admin to record metric for any club', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .post('/api/kpi')
      .set('Authorization', `Bearer ${token}`)
      .send({ club_id: 2, metric_key: 'events_held', metric_value: 5 });
    expect(res.status).toBe(201);
  });

  it('allows leader to record metric for their own club', async () => {
    const token = generateLeaderToken(); // owns club 1
    const res = await request(app)
      .post('/api/kpi')
      .set('Authorization', `Bearer ${token}`)
      .send({ club_id: 1, metric_key: 'events_held', metric_value: 3 });
    expect(res.status).toBe(201);
  });

  it('returns 403 when leader records metric for a club they do not own', async () => {
    const token = generateLeaderToken(); // owns club 1, not club 2
    const res = await request(app)
      .post('/api/kpi')
      .set('Authorization', `Bearer ${token}`)
      .send({ club_id: 2, metric_key: 'events_held', metric_value: 5 });
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Achievement ownership
// ---------------------------------------------------------------------------
describe('Achievement ownership', () => {
  describe('POST /api/achievements', () => {
    const achievementPayload = {
      user_id: 1,
      title: 'Best Member',
      title_ar: 'أفضل عضو',
    };

    it('allows admin to create achievement for any club', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .post('/api/achievements')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...achievementPayload, club_id: 2 });
      expect(res.status).toBe(201);
    });

    it('allows leader to create achievement for their own club', async () => {
      const token = generateLeaderToken(); // owns club 1
      const res = await request(app)
        .post('/api/achievements')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...achievementPayload, club_id: 1 });
      expect(res.status).toBe(201);
    });

    it('returns 403 when leader creates achievement for a club they do not own', async () => {
      const token = generateLeaderToken(); // owns club 1, not club 2
      const res = await request(app)
        .post('/api/achievements')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...achievementPayload, club_id: 2 });
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/achievements/:id', () => {
    it('allows admin to delete any achievement', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .delete('/api/achievements/1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(204);
    });

    it('allows leader to delete achievement from their own club', async () => {
      const token = generateLeaderToken(); // owns club 1, achievement 1 belongs to club 1
      const res = await request(app)
        .delete('/api/achievements/1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(204);
    });

    it('returns 403 when leader deletes achievement from a club they do not own', async () => {
      // Create an achievement for club 2 first
      const adminToken = generateAdminToken();
      const createRes = await request(app)
        .post('/api/achievements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ user_id: 1, club_id: 2, title: 'Club2 Award', title_ar: 'جائزة' });
      expect(createRes.status).toBe(201);
      const achId = createRes.body.id;

      const token = generateLeaderToken(); // owns club 1, not club 2
      const res = await request(app)
        .delete(`/api/achievements/${achId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 404 for non-existent achievement', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .delete('/api/achievements/999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});

// ---------------------------------------------------------------------------
// Membership management ownership
// ---------------------------------------------------------------------------
describe('Membership management — GET /api/clubs/:id/members', () => {
  it('allows admin to list members of any club', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .get('/api/clubs/2/members')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('allows leader to list members of their own club', async () => {
    const token = generateLeaderToken(); // owns club 1
    const res = await request(app)
      .get('/api/clubs/1/members')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('returns 403 when leader lists members of a club they do not own', async () => {
    const token = generateLeaderToken(); // owns club 1, not club 2
    const res = await request(app)
      .get('/api/clubs/2/members')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 403 for student', async () => {
    const token = generateTestToken();
    const res = await request(app)
      .get('/api/clubs/1/members')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('Membership management — PATCH /api/clubs/:id/members/:userId', () => {
  beforeEach(() => {
    testDb.exec(`INSERT INTO memberships (club_id, user_id, status) VALUES (1, 1, 'pending')`);
  });

  it('allows admin to approve a membership in any club', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .patch('/api/clubs/1/members/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });
    expect(res.status).toBe(200);
  });

  it('allows leader to approve a membership in their own club', async () => {
    const token = generateLeaderToken(); // owns club 1
    const res = await request(app)
      .patch('/api/clubs/1/members/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });
    expect(res.status).toBe(200);
  });

  it('returns 403 when leader manages membership in a club they do not own', async () => {
    testDb.exec(`INSERT INTO memberships (club_id, user_id, status) VALUES (2, 1, 'pending')`);
    const token = generateLeaderToken(); // owns club 1, not club 2
    const res = await request(app)
      .patch('/api/clubs/2/members/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 403 for student', async () => {
    const token = generateTestToken();
    const res = await request(app)
      .patch('/api/clubs/1/members/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid status value', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .patch('/api/clubs/1/members/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'rejected' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Admin global bypass
// ---------------------------------------------------------------------------
describe('Admin global access bypass', () => {
  it('admin can update any club', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .patch('/api/clubs/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Admin bypass' });
    expect(res.status).toBe(200);
  });

  it('admin can create event in any club', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        club_id: 2,
        title: 'Admin Event',
        title_ar: 'فعالية',
        starts_at: '2026-10-01 10:00:00',
        ends_at: '2026-10-01 12:00:00',
        status: 'draft',
      });
    expect(res.status).toBe(201);
  });

  it('admin can generate QR for any event', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .post('/api/attendance/1/qr')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('admin can record KPI metric for any club', async () => {
    const token = generateAdminToken();
    const res = await request(app)
      .post('/api/kpi')
      .set('Authorization', `Bearer ${token}`)
      .send({ club_id: 1, metric_key: 'score', metric_value: 10 });
    expect(res.status).toBe(201);
  });
});
