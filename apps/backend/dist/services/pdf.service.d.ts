import { LeaderboardEntry } from '../models/kpi.model';
export declare function generateAchievementReport(userId: number, opts?: {
    semesterId?: number;
    clubId?: number;
    reportDate?: string;
}): Promise<Buffer>;
export declare function generateKpiReport(leaderboard: LeaderboardEntry[], semesterName: string): Promise<Buffer>;
