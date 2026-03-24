export interface LeaderRequest {
    id: number;
    user_id: number;
    club_id: number;
    status: 'pending' | 'approved' | 'rejected';
    message: string | null;
    admin_notes: string | null;
    reviewed_by: number | null;
    reviewed_at: string | null;
    created_at: string;
}
export interface LeaderRequestWithDetails extends LeaderRequest {
    user_name: string;
    user_email: string;
    club_name: string;
}
export declare const LeaderRequestModel: {
    findById(id: number): LeaderRequest | undefined;
    findPendingByUserAndClub(userId: number, clubId: number): LeaderRequest | undefined;
    listAll(params?: {
        status?: string;
        limit?: number;
        offset?: number;
    }): LeaderRequestWithDetails[];
    listByUser(userId: number): LeaderRequestWithDetails[];
    create(data: {
        user_id: number;
        club_id: number;
        message?: string;
    }): LeaderRequest;
    updateStatus(id: number, status: "approved" | "rejected", reviewedBy: number, adminNotes?: string): LeaderRequest | undefined;
    countPending(): number;
};
