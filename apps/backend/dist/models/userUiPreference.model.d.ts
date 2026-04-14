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
export declare const UserUiPreferenceModel: {
    findByUserId(userId: number): UserUiPreference | undefined;
    upsert(userId: number, data: Partial<Omit<UserUiPreference, "id" | "user_id" | "updated_at">>): UserUiPreference;
};
