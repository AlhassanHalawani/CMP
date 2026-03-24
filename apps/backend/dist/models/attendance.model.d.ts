export interface Attendance {
    id: number;
    event_id: number;
    user_id: number;
    checked_in_at: string;
    method: 'qr' | 'manual';
    qr_token: string | null;
}
export declare const AttendanceModel: {
    findByEvent(eventId: number): Attendance[];
    findByEventAndUser(eventId: number, userId: number): Attendance | undefined;
    checkIn(data: {
        event_id: number;
        user_id: number;
        method: "qr" | "manual";
        qr_token?: string;
    }): Attendance;
    generateQrToken(eventId: number): string;
    verifyQrToken(token: string): {
        eventId: number;
        token: string;
    } | null;
    countByEvent(eventId: number): number;
    findPresentWithUsers(eventId: number): Array<{
        name: string;
        email: string;
        checked_in_at: string;
        method: "qr" | "manual";
    }>;
    findNoShowsWithUsers(eventId: number): Array<{
        name: string;
        email: string;
        registered_at: string;
    }>;
    findClubReport(clubId: number, startsAfter: string, endsBefore: string): Array<{
        event_title: string;
        event_starts_at: string;
        name: string;
        email: string;
        status: "Present" | "No-show";
        checked_in_at: string | null;
        method: string | null;
    }>;
    findByUserWithEvents(userId: number, opts: {
        semesterStartsAt?: string;
        semesterEndsAt?: string;
    }): Array<{
        event_title: string;
        event_date: string;
        checked_in_at: string;
        method: "qr" | "manual";
    }>;
};
