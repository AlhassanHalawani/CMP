"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAction = logAction;
const auditLog_model_1 = require("../models/auditLog.model");
function logAction(data) {
    auditLog_model_1.AuditLogModel.log({
        actor_id: data.actorId,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        payload: data.payload,
    });
}
//# sourceMappingURL=audit.service.js.map