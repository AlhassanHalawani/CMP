export interface Membership {
    id: number;
    club_id: number;
    user_id: number;
    status: 'pending' | 'active' | 'inactive';
    requested_at: string;
    updated_at: string;
}
export interface MembershipWithUser extends Membership {
    name: string;
    email: string;
    avatar_url: string | null;
}
export declare const MembershipModel: {
    findByClubAndUser(clubId: number, userId: number): Membership | undefined;
    findByClub(clubId: number, status?: string): MembershipWithUser[];
    findByUser(userId: number): Membership[];
    create(clubId: number, userId: number): Membership;
    updateStatus(id: number, status: string): Membership;
    countActive(clubId: number): number;
};
