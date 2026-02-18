/**
 * Creates a minimal Express app for integration testing.
 * Assumes that jest module mocks for database, env, and keycloakAdmin
 * are already in place before importing routes.
 */
export declare function createTestApp(): import("express-serve-static-core").Express;
