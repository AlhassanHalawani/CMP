export interface KpiMetric {
    id: number;
    club_id: number;
    semester_id: number | null;
    metric_key: string;
    metric_value: number;
    recorded_at: string;
}
export interface ClubKpiSummary {
    club_id: number;
    metric_key: string;
    total: number;
}
export interface LeaderboardEntry {
    club_id: number;
    club_name: string;
    total_score: number;
}
export declare const KpiModel: {
    recordMetric(data: {
        club_id: number;
        semester_id?: number;
        metric_key: string;
        metric_value: number;
    }): KpiMetric;
    getClubSummary(clubId: number, semesterId?: number): ClubKpiSummary[];
    getLeaderboard(semesterId?: number): LeaderboardEntry[];
};
