export interface AchievementDefinition {
    id: number;
    code: string;
    entity_type: 'student' | 'club';
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    tier: 'Bronze' | 'Silver' | 'Gold';
    points: number;
    metric: string;
    threshold: number;
    is_active: number;
}
export interface AchievementUnlock {
    id: number;
    definition_id: number;
    entity_type: string;
    entity_id: number;
    unlocked_at: string;
}
export interface StudentMetrics {
    attendance_count: number;
    login_streak: number;
}
export interface ClubMetrics {
    published_event_count: number;
    active_member_count: number;
    verified_attendance_total: number;
    max_single_event_participants: number;
}
export declare function getStudentMetrics(userId: number): StudentMetrics;
export declare function getClubMetrics(clubId: number): ClubMetrics;
export declare function evaluateStudentAchievements(userId: number): AchievementUnlock[];
export declare function evaluateClubAchievements(clubId: number): AchievementUnlock[];
export declare function getStudentProgress(userId: number): {
    definitions: AchievementDefinition[];
    unlocks: AchievementUnlock[];
    metrics: StudentMetrics;
};
export declare function getClubProgress(clubId: number): {
    definitions: AchievementDefinition[];
    unlocks: AchievementUnlock[];
    metrics: ClubMetrics;
};
