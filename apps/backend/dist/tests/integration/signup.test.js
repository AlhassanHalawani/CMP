"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const setup_1 = require("../setup");
let testDb;
// Mock env before any app imports
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
// Mock database — will be set per test
jest.mock('../../config/database', () => {
    return {
        get db() {
            return testDb;
        },
    };
});
// Mock keycloakAdmin service
const mockCreateKeycloakUser = jest.fn();
jest.mock('../../services/keycloakAdmin.service', () => ({
    createKeycloakUser: (...args) => mockCreateKeycloakUser(...args),
}));
const supertest_1 = __importDefault(require("supertest"));
const createTestApp_1 = require("../createTestApp");
const app = (0, createTestApp_1.createTestApp)();
beforeEach(() => {
    testDb = (0, setup_1.createTestDb)();
    mockCreateKeycloakUser.mockReset();
    mockCreateKeycloakUser.mockResolvedValue(undefined);
});
afterEach(() => {
    if (testDb)
        testDb.close();
});
describe('POST /api/auth/signup', () => {
    describe('domain restriction', () => {
        it('accepts stu.kau.edu.sa emails', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'student@stu.kau.edu.sa', name: 'Student', password: 'Password123!' });
            expect(res.status).toBe(201);
            expect(res.body).toEqual({ ok: true });
            expect(mockCreateKeycloakUser).toHaveBeenCalledWith({
                email: 'student@stu.kau.edu.sa',
                name: 'Student',
                password: 'Password123!',
            });
        });
        it('accepts kau.edu.sa emails', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'faculty@kau.edu.sa', name: 'Faculty', password: 'Password123!' });
            expect(res.status).toBe(201);
            expect(res.body).toEqual({ ok: true });
        });
        it('rejects gmail.com emails', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'user@gmail.com', name: 'Test', password: 'Password123!' });
            expect(res.status).toBe(422);
            expect(res.body.error).toMatch(/Only @/);
        });
        it('rejects non-allowed university domains', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'user@other-uni.edu.sa', name: 'Test', password: 'Password123!' });
            expect(res.status).toBe(422);
            expect(res.body.error).toMatch(/Only @/);
        });
        it('rejects empty domain', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'nodomain', name: 'Test', password: 'Password123!' });
            // express-validator catches invalid email before domain check
            expect(res.status).toBe(422);
        });
    });
    describe('duplicate email conflict', () => {
        it('returns 409 when Keycloak reports duplicate', async () => {
            const err = new Error('Email already in use.');
            err.status = 409;
            mockCreateKeycloakUser.mockRejectedValueOnce(err);
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'dup@stu.kau.edu.sa', name: 'Dup User', password: 'Password123!' });
            expect(res.status).toBe(409);
            expect(res.body.error).toMatch(/already exists/);
        });
    });
    describe('validation', () => {
        it('rejects missing email', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ name: 'Test', password: 'Password123!' });
            expect(res.status).toBe(422);
        });
        it('rejects missing name', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'test@stu.kau.edu.sa', password: 'Password123!' });
            expect(res.status).toBe(422);
        });
        it('rejects short password', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'test@stu.kau.edu.sa', name: 'Test', password: '123' });
            expect(res.status).toBe(422);
        });
        it('rejects password without uppercase letter', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'test@stu.kau.edu.sa', name: 'Test', password: 'password123' });
            expect(res.status).toBe(422);
            expect(res.body.errors).toEqual(expect.arrayContaining([
                expect.objectContaining({ msg: expect.stringMatching(/uppercase/) }),
            ]));
        });
        it('rejects password without lowercase letter', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'test@stu.kau.edu.sa', name: 'Test', password: 'PASSWORD123' });
            expect(res.status).toBe(422);
            expect(res.body.errors).toEqual(expect.arrayContaining([
                expect.objectContaining({ msg: expect.stringMatching(/lowercase/) }),
            ]));
        });
        it('rejects password without number', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'test@stu.kau.edu.sa', name: 'Test', password: 'PasswordOnly' });
            expect(res.status).toBe(422);
            expect(res.body.errors).toEqual(expect.arrayContaining([
                expect.objectContaining({ msg: expect.stringMatching(/number/) }),
            ]));
        });
        it('returns 500 on unexpected Keycloak error', async () => {
            mockCreateKeycloakUser.mockRejectedValueOnce(new Error('Network timeout'));
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'test@stu.kau.edu.sa', name: 'Test', password: 'Password123!' });
            expect(res.status).toBe(500);
            expect(res.body.error).toMatch(/Registration failed/);
        });
    });
    describe('audit logging', () => {
        it('logs successful signup in audit_logs', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'audit@stu.kau.edu.sa', name: 'Audit Test', password: 'Password1!' });
            const logs = testDb
                .prepare("SELECT * FROM audit_logs WHERE action = 'signup_success'")
                .all();
            expect(logs).toHaveLength(1);
            expect(JSON.parse(logs[0].payload)).toMatchObject({ email: 'audit@stu.kau.edu.sa' });
        });
        it('logs rejected domain in audit_logs', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'bad@gmail.com', name: 'Bad', password: 'Password1!' });
            const logs = testDb
                .prepare("SELECT * FROM audit_logs WHERE action = 'signup_rejected'")
                .all();
            expect(logs).toHaveLength(1);
            expect(JSON.parse(logs[0].payload)).toMatchObject({ reason: 'disallowed_domain' });
        });
        it('logs duplicate email conflict in audit_logs', async () => {
            const err = new Error('Duplicate');
            err.status = 409;
            mockCreateKeycloakUser.mockRejectedValueOnce(err);
            await (0, supertest_1.default)(app)
                .post('/api/auth/signup')
                .send({ email: 'dup@stu.kau.edu.sa', name: 'Dup', password: 'Password1!' });
            const logs = testDb
                .prepare("SELECT * FROM audit_logs WHERE action = 'signup_rejected' AND payload LIKE '%duplicate_email%'")
                .all();
            expect(logs).toHaveLength(1);
        });
    });
});
//# sourceMappingURL=signup.test.js.map