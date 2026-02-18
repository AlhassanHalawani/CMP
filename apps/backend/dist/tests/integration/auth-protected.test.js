"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const setup_1 = require("../setup");
let testDb;
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
        jwt: { secret: setup_1.TEST_JWT_SECRET },
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
const supertest_1 = __importDefault(require("supertest"));
const createTestApp_1 = require("../createTestApp");
const app = (0, createTestApp_1.createTestApp)();
beforeEach(() => {
    testDb = (0, setup_1.createTestDb)();
});
afterEach(() => {
    if (testDb)
        testDb.close();
});
describe('Auth-protected route behavior', () => {
    describe('without token', () => {
        it('GET /api/events is public (no auth required)', async () => {
            const res = await (0, supertest_1.default)(app).get('/api/events');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
        });
        it('POST /api/events/:id/register returns 401 without token', async () => {
            const res = await (0, supertest_1.default)(app).post('/api/events/1/register');
            expect(res.status).toBe(401);
            expect(res.body.error).toBeDefined();
        });
        it('POST /api/events returns 401 without token', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/events')
                .send({ title: 'Test' });
            expect(res.status).toBe(401);
        });
    });
    describe('with valid token', () => {
        it('POST /api/events/:id/register is accessible with valid token', async () => {
            const token = (0, setup_1.generateTestToken)();
            // Event doesn't exist, so we get 404 — but NOT 401
            const res = await (0, supertest_1.default)(app)
                .post('/api/events/999/register')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
            expect(res.body.error).toMatch(/not found/i);
        });
        it('POST /api/events returns 403 for student role', async () => {
            const token = (0, setup_1.generateTestToken)({ realm_access: { roles: ['student'] } });
            const res = await (0, supertest_1.default)(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Test' });
            expect(res.status).toBe(403);
        });
    });
    describe('with invalid token', () => {
        it('rejects malformed Bearer token', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/events/1/register')
                .set('Authorization', 'Bearer invalid-token');
            expect(res.status).toBe(401);
        });
        it('rejects missing Bearer prefix', async () => {
            const token = (0, setup_1.generateTestToken)();
            const res = await (0, supertest_1.default)(app)
                .post('/api/events/1/register')
                .set('Authorization', token);
            expect(res.status).toBe(401);
        });
    });
});
//# sourceMappingURL=auth-protected.test.js.map