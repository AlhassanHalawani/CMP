export interface Event {
    id: number;
    club_id: number;
    title: string;
    title_ar: string;
    description: string | null;
    description_ar: string | null;
    location: string | null;
    starts_at: string;
    ends_at: string;
    capacity: number | null;
    status: 'draft' | 'submitted' | 'published' | 'rejected' | 'cancelled' | 'completed';
    rejection_notes: string | null;
    members_only: number;
    created_by: number | null;
    created_at: string;
    checkin_open: number;
    checkin_finalized: number;
    category: string | null;
    registration_count?: number;
}
export declare const EventModel: {
    findById(id: number): Event | undefined;
    listByClub(clubId: number): Event[];
    listUpcoming(limit?: number): Event[];
    list(params?: {
        status?: string;
        clubId?: number;
        limit?: number;
        offset?: number;
        category?: string;
        location?: string;
        startsAfter?: string;
        endsBefore?: string;
        /** When set, returns published events PLUS any event belonging to these clubs (leader visibility) */
        leaderClubIds?: number[];
    }): Event[];
    create(data: Omit<Event, "id" | "created_at" | "registration_count">): Event;
    update(id: number, data: Partial<Omit<Event, "id" | "created_at" | "registration_count">>): Event | undefined;
    delete(id: number): boolean;
    count(params?: {
        clubId?: number;
        status?: string;
        category?: string;
        location?: string;
        startsAfter?: string;
        endsBefore?: string;
        /** When set, counts published events PLUS any event belonging to these clubs (leader visibility) */
        leaderClubIds?: number[];
    }): number;
    listDistinctCategories(): string[];
};
