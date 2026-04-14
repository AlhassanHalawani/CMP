export interface Notification {
    id: number;
    user_id: number;
    title: string;
    body: string | null;
    type: 'info' | 'success' | 'warning' | 'error';
    is_read: number;
    target_url: string | null;
    created_at: string;
}
export declare const NotificationModel: {
    create(data: {
        user_id: number;
        title: string;
        body?: string;
        type?: string;
        target_url?: string | null;
    }): Notification;
    listForUser(userId: number, params?: {
        limit?: number;
        offset?: number;
    }): Notification[];
    markRead(id: number, userId: number): void;
    markAllRead(userId: number): void;
    countUnread(userId: number): number;
};
