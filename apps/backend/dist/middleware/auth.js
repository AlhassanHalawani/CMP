"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const env_1 = require("../config/env");
const user_model_1 = require("../models/user.model");
const jwksClient = (0, jwks_rsa_1.default)({
    jwksUri: `${env_1.env.keycloak.url}/realms/${env_1.env.keycloak.realm}/protocol/openid-connect/certs`,
    cache: true,
    rateLimit: true,
});
function getSigningKey(header) {
    return new Promise((resolve, reject) => {
        jwksClient.getSigningKey(header.kid, (err, key) => {
            if (err)
                return reject(err);
            resolve(key.getPublicKey());
        });
    });
}
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid authorization header' });
        return;
    }
    const token = authHeader.slice(7);
    try {
        const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
        if (!decoded) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        let payload;
        if (env_1.env.isDev && decoded.payload && typeof decoded.payload === 'object' && 'dev' in decoded.payload) {
            // In dev mode, allow tokens signed with JWT_SECRET for testing without Keycloak
            payload = jsonwebtoken_1.default.verify(token, env_1.env.jwt.secret);
        }
        else {
            const signingKey = await getSigningKey(decoded.header);
            payload = jsonwebtoken_1.default.verify(token, signingKey, {
                algorithms: ['RS256'],
                issuer: `${env_1.env.keycloak.url}/realms/${env_1.env.keycloak.realm}`,
            });
        }
        req.tokenPayload = payload;
        // Sync user from Keycloak claims to local DB
        const keycloakId = payload.sub;
        const email = payload.email || `${keycloakId}@placeholder`;
        const name = payload.name || payload.preferred_username || 'Unknown';
        const roles = payload.realm_access?.roles || [];
        let role = 'student';
        if (roles.includes('admin'))
            role = 'admin';
        else if (roles.includes('club_leader'))
            role = 'club_leader';
        const user = user_model_1.UserModel.upsert({ keycloak_id: keycloakId, email, name, role });
        req.user = user;
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Token verification failed' });
    }
}
//# sourceMappingURL=auth.js.map