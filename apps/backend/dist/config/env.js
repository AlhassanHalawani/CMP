"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
function required(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
function optional(key, fallback) {
    return process.env[key] || fallback;
}
exports.env = {
    nodeEnv: optional('NODE_ENV', 'development'),
    port: parseInt(optional('PORT', '3000'), 10),
    databasePath: optional('DATABASE_PATH', './data/cmp.db'),
    keycloak: {
        url: required('KEYCLOAK_URL'),
        realm: required('KEYCLOAK_REALM'),
        clientId: required('KEYCLOAK_CLIENT_ID'),
        clientSecret: required('KEYCLOAK_CLIENT_SECRET'),
    },
    jwt: {
        secret: required('JWT_SECRET'),
    },
    smtp: {
        host: optional('SMTP_HOST', 'localhost'),
        port: parseInt(optional('SMTP_PORT', '1025'), 10),
        user: optional('SMTP_USER', ''),
        pass: optional('SMTP_PASS', ''),
        from: optional('SMTP_FROM', 'noreply@fcit-cmp.local'),
    },
    get allowedSignupDomains() {
        return optional('ALLOWED_SIGNUP_EMAIL_DOMAINS', 'stu.kau.edu.sa,kau.edu.sa')
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean);
    },
    get isDev() {
        return this.nodeEnv === 'development';
    },
    get isProd() {
        return this.nodeEnv === 'production';
    },
};
//# sourceMappingURL=env.js.map