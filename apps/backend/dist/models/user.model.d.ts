export interface User {
    id: number;
    keycloak_id: string;
    email: string;
    name: string;
    role: 'student' | 'club_leader' | 'admin';
    avatar_url: string | null;
    xp_total: number;
    current_level: number;
    profile_completed_at: string | null;
    created_at: string;
}
export declare const UserModel: {
    findById(id: number): User | undefined;
    findByKeycloakId(keycloakId: string): User | undefined;
    findByEmail(email: string): User | undefined;
    upsert(data: {
        keycloak_id: string;
        email: string;
        name: string;
        role?: string;
    }): User;
    updateRole(id: number, role: User["role"]): void;
    updateProfile(id: number, data: {
        name?: string;
        avatar_url?: string | null;
    }): void;
    list(params?: {
        role?: string;
        limit?: number;
        offset?: number;
    }): User[];
    count(): number;
    deleteById(id: number): void;
    countByRole(role: User["role"]): number;
};
