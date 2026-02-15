export interface CreateKeycloakUserPayload {
    email: string;
    name: string;
    password: string;
}
export declare function createKeycloakUser(payload: CreateKeycloakUserPayload): Promise<void>;
