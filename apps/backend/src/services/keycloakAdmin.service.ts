import { env } from '../config/env';
import { logger } from '../utils/logger';

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface KeycloakRole {
  id: string;
  name: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAdminToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 10_000) {
    return cachedToken;
  }

  const url = `${env.keycloak.url}/realms/${env.keycloak.realm}/protocol/openid-connect/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.keycloak.clientId,
    client_secret: env.keycloak.clientSecret,
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

  const data = (await res.json()) as TokenResponse;
  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;
  return cachedToken;
}

export interface CreateKeycloakUserPayload {
  email: string;
  name: string;
  password: string;
}

function extractUserIdFromLocationHeader(location: string | null): string | null {
  if (!location) return null;
  const trimmed = location.trim();
  const userId = trimmed.split('/').pop();
  return userId || null;
}

async function getRealmRole(token: string, roleName: string): Promise<KeycloakRole> {
  const roleUrl = `${env.keycloak.url}/admin/realms/${env.keycloak.realm}/roles/${encodeURIComponent(roleName)}`;
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

  return (await roleRes.json()) as KeycloakRole;
}

async function assignRealmRoleToUser(token: string, userId: string, role: KeycloakRole): Promise<void> {
  const mappingUrl = `${env.keycloak.url}/admin/realms/${env.keycloak.realm}/users/${userId}/role-mappings/realm`;
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

export async function createKeycloakUser(payload: CreateKeycloakUserPayload): Promise<void> {
  const token = await getAdminToken();
  const url = `${env.keycloak.url}/admin/realms/${env.keycloak.realm}/users`;

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
    const err = new Error('Email already in use.') as Error & { status: number };
    err.status = 409;
    throw err;
  }

  if (!res.ok) {
    const text = await res.text();
    logger.error(`Keycloak user creation failed: ${res.status} ${text}`);
    throw new Error(`Failed to create user in Keycloak: ${res.status}`);
  }

  if (!createdUserId) {
    throw new Error('Keycloak user was created but no user ID was returned in Location header.');
  }

  const studentRole = await getRealmRole(token, 'student');
  await assignRealmRoleToUser(token, createdUserId, studentRole);
}
