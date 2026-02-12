import { AuditLogModel } from '../models/auditLog.model';

export function logAction(data: {
  actorId: number | null;
  action: string;
  entityType: string;
  entityId?: number;
  payload?: Record<string, any>;
}): void {
  AuditLogModel.log({
    actor_id: data.actorId,
    action: data.action,
    entity_type: data.entityType,
    entity_id: data.entityId,
    payload: data.payload,
  });
}
