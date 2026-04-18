import api from './client';

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

export interface UnlockedBadge {
  badge_definition_id: number;
  code: string;
  name: string;
  name_ar: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon_key: string;
  unlocked_at: string;
}

export interface MyBadgesResponse {
  featured_badge_definition_id: number | null;
  unlocked: UnlockedBadge[];
}

export interface BadgeProgress extends BadgeDefinition {
  unlocked: boolean;
  unlocked_at: string | null;
  current_value: number;
  is_featured: boolean;
}

export interface MyBadgeProgressResponse {
  badges: BadgeProgress[];
  metrics: Record<string, number>;
  featured_badge_definition_id: number | null;
}

export const badgesApi = {
  getCatalog: () =>
    api.get<{ data: BadgeDefinition[] }>('/badges/catalog').then((r) => r.data),

  getMyBadges: () =>
    api.get<MyBadgesResponse>('/badges/me').then((r) => r.data),

  getMyProgress: () =>
    api.get<MyBadgeProgressResponse>('/badges/me/progress').then((r) => r.data),

  setFeaturedBadge: (badgeDefinitionId: number | null) =>
    api.patch<{ featured_badge_definition_id: number | null }>('/badges/me/featured', { badge_definition_id: badgeDefinitionId }).then((r) => r.data),
};
