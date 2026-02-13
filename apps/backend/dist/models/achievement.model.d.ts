export interface Achievement {
    id: number;
    user_id: number;
    club_id: number;
    title: string;
    title_ar: string;
    description: string | null;
    description_ar: string | null;
    awarded_at: string;
    semester_id: number | null;
}
export declare const AchievementModel: {
    findById(id: number): Achievement | undefined;
    findByUser(userId: number): Achievement[];
    findByClub(clubId: number): Achievement[];
    create(data: Omit<Achievement, "id" | "awarded_at">): Achievement;
    delete(id: number): boolean;
};
