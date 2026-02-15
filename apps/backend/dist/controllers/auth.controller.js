"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = signup;
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const keycloakAdmin_service_1 = require("../services/keycloakAdmin.service");
async function signup(req, res) {
    const email = (req.body.email ?? '').trim().toLowerCase();
    const name = (req.body.name ?? '').trim();
    const password = req.body.password ?? '';
    const domain = email.split('@')[1];
    const allowed = env_1.env.allowedSignupDomains;
    if (!allowed.includes(domain)) {
        res.status(422).json({
            error: `Only @${allowed.join(' and @')} emails are allowed.`,
        });
        return;
    }
    try {
        await (0, keycloakAdmin_service_1.createKeycloakUser)({ email, name, password });
        logger_1.logger.info(`New user registered: ${email}`);
        res.status(201).json({ ok: true });
    }
    catch (err) {
        if (err?.status === 409) {
            res.status(409).json({ error: 'An account with this email already exists.' });
            return;
        }
        logger_1.logger.error(`Signup error for ${email}: ${err?.message}`);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
}
//# sourceMappingURL=auth.controller.js.map