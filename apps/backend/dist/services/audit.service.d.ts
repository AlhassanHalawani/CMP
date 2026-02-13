export declare function logAction(data: {
    actorId: number | null;
    action: string;
    entityType: string;
    entityId?: number;
    payload?: Record<string, any>;
}): void;
