"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyPreferences = getMyPreferences;
exports.updateMyPreferences = updateMyPreferences;
const userUiPreference_model_1 = require("../models/userUiPreference.model");
function getMyPreferences(req, res) {
    const userId = req.user.id;
    const prefs = userUiPreference_model_1.UserUiPreferenceModel.findByUserId(userId);
    // Return defaults if none saved yet
    res.json(prefs ?? {
        user_id: userId,
        theme: null,
        color_preset: 'indigo',
        radius_base: '0px',
        box_shadow_x: '4px',
        box_shadow_y: '4px',
        font_weight_heading: '700',
        font_weight_base: '500',
    });
}
function updateMyPreferences(req, res) {
    const userId = req.user.id;
    const allowed = ['theme', 'color_preset', 'radius_base', 'box_shadow_x', 'box_shadow_y', 'font_weight_heading', 'font_weight_base'];
    const data = {};
    for (const key of allowed) {
        if (key in req.body)
            data[key] = req.body[key];
    }
    const prefs = userUiPreference_model_1.UserUiPreferenceModel.upsert(userId, data);
    res.json(prefs);
}
//# sourceMappingURL=userPreferences.controller.js.map