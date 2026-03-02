type NotifType = 'info' | 'success' | 'warning' | 'error';
interface NotifyOptions {
    userId: number;
    eventType: string;
    title: string;
    body: string;
    type?: NotifType;
}
export declare function notify(opts: NotifyOptions): Promise<void>;
export declare function notifyRole(role: string, opts: Omit<NotifyOptions, 'userId'>): Promise<void>;
export {};
