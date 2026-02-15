import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { env } from '../config/env';
import { UserModel, User } from '../models/user.model';

export interface AuthRequest extends Request {
  user?: User;
  tokenPayload?: any;
}

function extractRoles(payload: any): string[] {
  const realmRoles: string[] = payload?.realm_access?.roles ?? [];
  const resourceAccess = payload?.resource_access ?? {};
  const clientRoles: string[] = Object.values(resourceAccess)
    .flatMap((client: any) => client?.roles ?? []);

  return Array.from(new Set([...realmRoles, ...clientRoles]));
}

const jwksClient = jwksRsa({
  jwksUri: `${env.keycloak.url}/realms/${env.keycloak.realm}/protocol/openid-connect/certs`,
  cache: true,
  rateLimit: true,
});

function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      resolve(key!.getPublicKey());
    });
  });
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    let payload: any;
    if (env.isDev && decoded.payload && typeof decoded.payload === 'object' && 'dev' in decoded.payload) {
      // In dev mode, allow tokens signed with JWT_SECRET for testing without Keycloak
      payload = jwt.verify(token, env.jwt.secret);
    } else {
      const signingKey = await getSigningKey(decoded.header);
      payload = jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
        issuer: `${env.keycloak.url}/realms/${env.keycloak.realm}`,
      });
    }

    req.tokenPayload = payload;

    // Sync user from Keycloak claims to local DB
    const keycloakId = payload.sub as string;
    const email = payload.email || `${keycloakId}@placeholder`;
    const name = payload.name || payload.preferred_username || 'Unknown';
    const roles = extractRoles(payload);

    let role: User['role'] = 'student';
    if (roles.includes('admin')) role = 'admin';
    else if (roles.includes('club_leader')) role = 'club_leader';

    const user = UserModel.upsert({ keycloak_id: keycloakId, email, name, role });
    req.user = user;

    next();
  } catch (err) {
    res.status(401).json({ error: 'Token verification failed' });
  }
}
