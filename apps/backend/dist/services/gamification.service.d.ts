export declare const XP_RULES: Record<string, number>;
export declare function calculateLevel(xpTotal: number): number;
export interface LevelProgress {
    current_xp: number;
    current_level: number;
    current_level_floor: number;
    next_level_xp: number;
    xp_to_next_level: number;
    progress_percent: number;
}
export declare function getLevelProgress(xpTotal: number): LevelProgress;
export interface AwardXpOptions {
    userId: number;
    actionKey: string;
    referenceKey: string;
    xpOverride?: number;
    sourceType?: string;
    sourceId?: number;
    metadata?: Record<string, unknown>;
}
export interface AwardXpResult {
    xp_awarded: number;
    level_up: boolean;
    previous_level: number;
    new_level: number;
    progress: LevelProgress;
}
export declare function awardXp(opts: AwardXpOptions): AwardXpResult | null;
export declare function rebuildUserXp(userId: number): void;
