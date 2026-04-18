export interface BadgeDefinition {
    id: number;
    code: string;
    entity_type: string;
    name: string;
    name_ar: string;
    description: string;
    description_ar: string;
    icon_key: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    metric_key: string;
    threshold: number;
    is_active: number;
    sort_order: number;
}
export interface BadgeUnlock {
    id: number;
    badge_definition_id: number;
    user_id: number;
    unlocked_at: string;
    source_type: string | null;
    source_id: number | null;
}
export declare const BadgeModel: {
    listCatalog(): BadgeDefinition[];
    findDefinitionById(id: number): BadgeDefinition | undefined;
    findDefinitionByCode(code: string): BadgeDefinition | undefined;
    listUnlockedByUser(userId: number): BadgeUnlock[];
    unlock(badgeDefinitionId: number, userId: number, sourceType?: string | null, sourceId?: number | null): BadgeUnlock | null;
    getFeaturedBadgeId(userId: number): number | null;
    setFeaturedBadge(userId: number, badgeDefinitionId: number | null): void;
};
