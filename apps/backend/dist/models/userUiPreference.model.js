"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUiPreferenceModel = void 0;
const database_1 = require("../config/database");
exports.UserUiPreferenceModel = {
    findByUserId(userId) {
        return database_1.db.prepare('SELECT * FROM user_ui_preferences WHERE user_id = ?').get(userId);
    },
    upsert(userId, data) {
        const existing = exports.UserUiPreferenceModel.findByUserId(userId);
        if (!existing) {
            database_1.db.prepare(`
        INSERT INTO user_ui_preferences (user_id, theme, color_preset, radius_base, box_shadow_x, box_shadow_y, font_weight_heading, font_weight_base)
        VALUES (@user_id, @theme, @color_preset, @radius_base, @box_shadow_x, @box_shadow_y, @font_weight_heading, @font_weight_base)
      `).run({
                user_id: userId,
                theme: data.theme ?? null,
                color_preset: data.color_preset ?? 'indigo',
                radius_base: data.radius_base ?? '0px',
                box_shadow_x: data.box_shadow_x ?? '4px',
                box_shadow_y: data.box_shadow_y ?? '4px',
                font_weight_heading: data.font_weight_heading ?? '700',
                font_weight_base: data.font_weight_base ?? '500',
            });
        }
        else {
            const fields = Object.entries(data)
                .filter(([, v]) => v !== undefined)
                .map(([k]) => `${k} = @${k}`)
                .join(', ');
            if (fields) {
                database_1.db.prepare(`
          UPDATE user_ui_preferences SET ${fields}, updated_at = datetime('now') WHERE user_id = @user_id
        `).run({ ...data, user_id: userId });
            }
        }
        return exports.UserUiPreferenceModel.findByUserId(userId);
    },
};
//# sourceMappingURL=userUiPreference.model.js.map