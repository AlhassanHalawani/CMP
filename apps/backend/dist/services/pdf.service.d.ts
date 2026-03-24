import { LeaderboardEntry } from '../models/kpi.model';
export declare function generateAttendanceReport(event: {
    title: string;
    starts_at: string;
}, clubName: string, present: Array<{
    name: string;
    email: string;
    checked_in_at: string;
    method: string;
}>, noShows: Array<{
    name: string;
    email: string;
    registered_at?: string;
}>): Promise<Buffer>;
export declare function generateAchievementReport(userId: number, opts?: {
    semesterId?: number;
    clubId?: number;
    reportDate?: string;
}): Promise<Buffer>;
export declare function generateKpiReport(leaderboard: LeaderboardEntry[], semesterName: string): Promise<Buffer>;
