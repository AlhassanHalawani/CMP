"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = getMe;
exports.updateMe = updateMe;
exports.listUsers = listUsers;
exports.updateUserRole = updateUserRole;
const user_model_1 = require("../models/user.model");
const audit_service_1 = require("../services/audit.service");
function getMe(req, res) {
    res.json(req.user);
}
function updateMe(req, res) {
    const { name, avatar_url } = req.body;
    user_model_1.UserModel.updateProfile(req.user.id, { name, avatar_url });
    const updated = user_model_1.UserModel.findById(req.user.id);
    res.json(updated);
}
function listUsers(req, res) {
    const role = req.query.role;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const users = user_model_1.UserModel.list({ role, limit, offset });
    const total = user_model_1.UserModel.count();
    res.json({ data: users, total });
}
function updateUserRole(req, res) {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    const user = user_model_1.UserModel.findById(id);
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    user_model_1.UserModel.updateRole(id, role);
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'update_role', entityType: 'user', entityId: id, payload: { role } });
    res.json(user_model_1.UserModel.findById(id));
}
//# sourceMappingURL=users.controller.js.map