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
};
