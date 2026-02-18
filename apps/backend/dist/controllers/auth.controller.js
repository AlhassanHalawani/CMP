"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = signup;
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const keycloakAdmin_service_1 = require("../services/keycloakAdmin.service");
const audit_service_1 = require("../services/audit.service");
async function signup(req, res) {
    const email = (req.body.email ?? '').trim().toLowerCase();
    const name = (req.body.name ?? '').trim();
    const password = req.body.password ?? '';
    const domain = email.split('@')[1];
    const allowed = env_1.env.allowedSignupDomains;
    if (!allowed.includes(domain)) {
        logger_1.logger.warn(`Signup rejected – disallowed domain: ${email}`);
        (0, audit_service_1.logAction)({
            actorId: null,
            action: 'signup_rejected',
            entityType: 'auth',
            payload: { email, reason: 'disallowed_domain' },
        });
        res.status(422).json({
            error: `Only @${allowed.join(' and @')} emails are allowed.`,
        });
        return;
    }
    try {
        await (0, keycloakAdmin_service_1.createKeycloakUser)({ email, name, password });
        logger_1.logger.info(`New user registered: ${email}`);
        (0, audit_service_1.logAction)({
            actorId: null,
            action: 'signup_success',
            entityType: 'auth',
            payload: { email },
        });
        res.status(201).json({ ok: true });
    }
    catch (err) {
        if (err?.status === 409) {
            logger_1.logger.warn(`Signup conflict – duplicate email: ${email}`);
            (0, audit_service_1.logAction)({
                actorId: null,
                action: 'signup_rejected',
                entityType: 'auth',
                payload: { email, reason: 'duplicate_email' },
            });
            res.status(409).json({ error: 'An account with this email already exists.' });
            return;
        }
        logger_1.logger.error(`Signup error for ${email}: ${err?.message}`);
        (0, audit_service_1.logAction)({
            actorId: null,
            action: 'signup_error',
            entityType: 'auth',
            payload: { email, reason: err?.message },
        });
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
}
//# sourceMappingURL=auth.controller.js.map