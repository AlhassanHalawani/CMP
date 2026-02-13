export interface Registration {
    id: number;
    event_id: number;
    user_id: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    registered_at: string;
}
export declare const RegistrationModel: {
    findById(id: number): Registration | undefined;
    findByEventAndUser(eventId: number, userId: number): Registration | undefined;
    findByEvent(eventId: number): Registration[];
    findByUser(userId: number): Registration[];
    create(data: {
        event_id: number;
        user_id: number;
        status?: string;
    }): Registration;
    updateStatus(id: number, status: Registration["status"]): void;
    countByEvent(eventId: number): number;
};
