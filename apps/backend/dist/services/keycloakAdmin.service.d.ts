export interface CreateKeycloakUserPayload {
    email: string;
    name: string;
    password: string;
}
/**
 * Syncs a user's Keycloak realm roles to match a new app role.
 * Grants the new role and revokes the previous one (if different).
 * keycloakUserId is the user's `sub` (UUID) from the JWT.
 */
export declare function syncUserRealmRole(keycloakUserId: string, newRole: string, previousRole: string | null): Promise<void>;
export declare function createKeycloakUser(payload: CreateKeycloakUserPayload): Promise<void>;
