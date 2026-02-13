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
    status: 'draft' | 'published' | 'cancelled' | 'completed';
    created_by: number | null;
    created_at: string;
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
    }): Event[];
    create(data: Omit<Event, "id" | "created_at">): Event;
    update(id: number, data: Partial<Omit<Event, "id" | "created_at">>): Event | undefined;
    delete(id: number): boolean;
    count(params?: {
        clubId?: number;
        status?: string;
    }): number;
};
