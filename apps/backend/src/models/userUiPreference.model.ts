import { db } from '../config/database';

export interface UserUiPreference {
  id: number;
  user_id: number;
  theme: string | null;
  color_preset: string;
  radius_base: string;
  box_shadow_x: string;
  box_shadow_y: string;
  font_weight_heading: string;
  font_weight_base: string;
  updated_at: string;
}

export const UserUiPreferenceModel = {
  findByUserId(userId: number): UserUiPreference | undefined {
    return db.prepare('SELECT * FROM user_ui_preferences WHERE user_id = ?').get(userId) as UserUiPreference | undefined;
  },

  upsert(userId: number, data: Partial<Omit<UserUiPreference, 'id' | 'user_id' | 'updated_at'>>): UserUiPreference {
    const existing = UserUiPreferenceModel.findByUserId(userId);
    if (!existing) {
      db.prepare(`
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
    } else {
      const fields = Object.entries(data)
        .filter(([, v]) => v !== undefined)
        .map(([k]) => `${k} = @${k}`)
        .join(', ');
      if (fields) {
        db.prepare(`
          UPDATE user_ui_preferences SET ${fields}, updated_at = datetime('now') WHERE user_id = @user_id
        `).run({ ...data, user_id: userId });
      }
    }
    return UserUiPreferenceModel.findByUserId(userId)!;
  },
};
