export interface Semester {
    id: number;
    name: string;
    starts_at: string;
    ends_at: string;
    is_active: number;
}
export declare const SemesterModel: {
    findById(id: number): Semester | undefined;
    getActive(): Semester | undefined;
    list(): Semester[];
    create(data: {
        name: string;
        starts_at: string;
        ends_at: string;
    }): Semester;
    setActive(id: number): void;
    delete(id: number): boolean;
};
