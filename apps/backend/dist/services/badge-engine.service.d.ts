import { BadgeDefinition, BadgeUnlock } from '../models/badge.model';
export interface StudentBadgeMetrics {
    joined_clubs_count: number;
    distinct_club_pages_visited: number;
    attendance_count: number;
    daily_questions_correct_count: number;
    weekly_missions_completed_count: number;
}
export declare function getStudentBadgeMetrics(userId: number): StudentBadgeMetrics;
export declare function evaluateStudentBadges(userId: number): BadgeUnlock[];
export declare function listUnlockedBadges(userId: number): Array<BadgeUnlock & {
    badge: BadgeDefinition;
}>;
export declare function listBadgeCatalog(): BadgeDefinition[];
export declare function setFeaturedBadge(userId: number, badgeDefinitionId: number | null): void;
export declare function getStudentBadgeProgress(userId: number): {
    badges: {
        unlocked: boolean;
        unlocked_at: string | null;
        current_value: number;
        is_featured: boolean;
        id: number;
        code: string;
        entity_type: string;
        name: string;
        name_ar: string;
        description: string;
        description_ar: string;
        icon_key: string;
        rarity: "common" | "rare" | "epic" | "legendary";
        metric_key: string;
        threshold: number;
        is_active: number;
        sort_order: number;
    }[];
    metrics: StudentBadgeMetrics;
    featured_badge_definition_id: number | null;
};
