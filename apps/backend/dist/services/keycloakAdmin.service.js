"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncUserRealmRole = syncUserRealmRole;
exports.deleteKeycloakUser = deleteKeycloakUser;
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
function extractUserIdFromLocationHeader(location) {
    if (!location)
        return null;
    const trimmed = location.trim();
    const userId = trimmed.split('/').pop();
    return userId || null;
}
async function getRealmRole(token, roleName) {
    const roleUrl = `${env_1.env.keycloak.url}/admin/realms/${env_1.env.keycloak.realm}/roles/${encodeURIComponent(roleName)}`;
    const roleRes = await fetch(roleUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
    if (!roleRes.ok) {
        const text = await roleRes.text();
        throw new Error(`Failed to fetch Keycloak role "${roleName}": ${roleRes.status} ${text}`);
    }
    return (await roleRes.json());
}
async function assignRealmRoleToUser(token, userId, role) {
    const mappingUrl = `${env_1.env.keycloak.url}/admin/realms/${env_1.env.keycloak.realm}/users/${userId}/role-mappings/realm`;
    const mappingRes = await fetch(mappingUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify([{ id: role.id, name: role.name }]),
    });
    if (!mappingRes.ok) {
        const text = await mappingRes.text();
        throw new Error(`Failed to assign role "${role.name}" to Keycloak user: ${mappingRes.status} ${text}`);
    }
}
async function revokeRealmRoleFromUser(token, userId, role) {
    const mappingUrl = `${env_1.env.keycloak.url}/admin/realms/${env_1.env.keycloak.realm}/users/${userId}/role-mappings/realm`;
    const res = await fetch(mappingUrl, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify([{ id: role.id, name: role.name }]),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to revoke role "${role.name}" from Keycloak user: ${res.status} ${text}`);
    }
}
/**
 * Syncs a user's Keycloak realm roles to match a new app role.
 * Grants the new role and revokes the previous one (if different).
 * keycloakUserId is the user's `sub` (UUID) from the JWT.
 */
async function syncUserRealmRole(keycloakUserId, newRole, previousRole) {
    const token = await getAdminToken();
    if (previousRole && previousRole !== newRole) {
        const prev = await getRealmRole(token, previousRole);
        await revokeRealmRoleFromUser(token, keycloakUserId, prev);
    }
    const next = await getRealmRole(token, newRole);
    await assignRealmRoleToUser(token, keycloakUserId, next);
}
async function deleteKeycloakUser(keycloakUserId) {
    const token = await getAdminToken();
    const url = `${env_1.env.keycloak.url}/admin/realms/${env_1.env.keycloak.realm}/users/${keycloakUserId}`;
    const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 404) {
        const text = await res.text();
        throw new Error(`Failed to delete Keycloak user: ${res.status} ${text}`);
    }
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
    const createdUserId = extractUserIdFromLocationHeader(res.headers.get('location'));
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
    if (!createdUserId) {
        throw new Error('Keycloak user was created but no user ID was returned in Location header.');
    }
    const studentRole = await getRealmRole(token, 'student');
    await assignRealmRoleToUser(token, createdUserId, studentRole);
}
//# sourceMappingURL=keycloakAdmin.service.js.map