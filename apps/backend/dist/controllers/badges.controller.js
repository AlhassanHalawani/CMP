"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCatalog = getCatalog;
exports.getMyBadges = getMyBadges;
exports.getMyProgress = getMyProgress;
exports.patchFeaturedBadge = patchFeaturedBadge;
const badge_model_1 = require("../models/badge.model");
const badge_engine_service_1 = require("../services/badge-engine.service");
function getCatalog(_req, res) {
    res.json({ data: (0, badge_engine_service_1.listBadgeCatalog)() });
}
function getMyBadges(req, res) {
    const userId = req.user.id;
    const unlocked = (0, badge_engine_service_1.listUnlockedBadges)(userId);
    res.json({
        featured_badge_definition_id: badge_model_1.BadgeModel.getFeaturedBadgeId(userId),
        unlocked: unlocked.map((u) => ({
            badge_definition_id: u.badge_definition_id,
            code: u.badge.code,
            name: u.badge.name,
            name_ar: u.badge.name_ar,
            rarity: u.badge.rarity,
            icon_key: u.badge.icon_key,
            unlocked_at: u.unlocked_at,
        })),
    });
}
function getMyProgress(req, res) {
    res.json((0, badge_engine_service_1.getStudentBadgeProgress)(req.user.id));
}
function patchFeaturedBadge(req, res) {
    const userId = req.user.id;
    const { badge_definition_id } = req.body;
    const id = badge_definition_id === null ? null : Number(badge_definition_id);
    if (id !== null && !Number.isInteger(id)) {
        res.status(400).json({ error: 'badge_definition_id must be an integer or null' });
        return;
    }
    try {
        (0, badge_engine_service_1.setFeaturedBadge)(userId, id);
        res.json({ featured_badge_definition_id: id });
    }
    catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
}
//# sourceMappingURL=badges.controller.js.map