export interface AuditLog {
    id: number;
    actor_id: number | null;
    action: string;
    entity_type: string;
    entity_id: number | null;
    payload: string | null;
    created_at: string;
}
export declare const AuditLogModel: {
    log(data: {
        actor_id: number | null;
        action: string;
        entity_type: string;
        entity_id?: number;
        payload?: Record<string, any>;
    }): void;
    list(params?: {
        limit?: number;
        offset?: number;
        entity_type?: string;
    }): AuditLog[];
};
