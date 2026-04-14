export interface PageView {
    id: number;
    session_id: string;
    user_id: number | null;
    path: string;
    device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    referrer: string | null;
    created_at: string;
}
export interface TrafficSeries {
    date: string;
    desktop: number;
    mobile: number;
}
export interface TrafficData {
    range: string;
    totals: {
        visitors: number;
        page_views: number;
    };
    series: TrafficSeries[];
}
export declare const PageViewModel: {
    create(data: {
        session_id: string;
        user_id?: number | null;
        path: string;
        device_type: string;
        referrer?: string | null;
    }): PageView;
    getTraffic(range: "7d" | "30d" | "90d"): TrafficData;
};
