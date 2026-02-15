"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKeycloakUser = createKeycloakUser;
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
let cachedToken = null;
let tokenExpiresAt = 0;
async function getAdminToken() {
    const now = Date.now();
    if (cachedToken && now < tokenExpiresAt - 10_000) {
        return cachedToken;
    }
    const url = `${env_1.env.keycloak.url}/realms/${env_1.env.keycloak.realm}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env_1.env.keycloak.clientId,
        client_secret: env_1.env.keycloak.clientSecret,
    });
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to get Keycloak admin token: ${res.status} ${text}`);
    }
    const data = (await res.json());
    cachedToken = data.access_token;
    tokenExpiresAt = now + data.expires_in * 1000;
    return cachedToken;
}
async function createKeycloakUser(payload) {
    const token = await getAdminToken();
    const url = `${env_1.env.keycloak.url}/admin/realms/${env_1.env.keycloak.realm}/users`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            username: payload.email,
            email: payload.email,
            firstName: payload.name,
            lastName: '',
            enabled: true,
            emailVerified: true,
            credentials: [
                { type: 'password', value: payload.password, temporary: false },
            ],
        }),
    });
    if (res.status === 409) {
        const err = new Error('Email already in use.');
        err.status = 409;
        throw err;
    }
    if (!res.ok) {
        const text = await res.text();
        logger_1.logger.error(`Keycloak user creation failed: ${res.status} ${text}`);
        throw new Error(`Failed to create user in Keycloak: ${res.status}`);
    }
}
//# sourceMappingURL=keycloakAdmin.service.js.map