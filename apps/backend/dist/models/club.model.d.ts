export interface Club {
    id: number;
    name: string;
    name_ar: string;
    description: string | null;
    description_ar: string | null;
    logo_url: string | null;
    leader_id: number | null;
    created_at: string;
}
export declare const ClubModel: {
    findById(id: number): Club | undefined;
    list(params?: {
        limit?: number;
        offset?: number;
    }): Club[];
    create(data: Omit<Club, "id" | "created_at">): Club;
    update(id: number, data: Partial<Omit<Club, "id" | "created_at">>): Club | undefined;
    delete(id: number): boolean;
    count(): number;
};
