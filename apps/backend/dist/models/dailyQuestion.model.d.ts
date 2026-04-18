export interface DailyQuestion {
    id: number;
    club_id: number;
    question_text: string;
    explanation: string | null;
    active_date: string;
    participation_xp: number;
    correct_bonus_xp: number;
    status: 'draft' | 'published';
    created_by: number;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}
export interface DailyQuestionOption {
    id: number;
    question_id: number;
    option_key: string;
    option_text: string;
    sort_order: number;
    is_correct: number;
}
export interface DailyQuestionAnswer {
    id: number;
    question_id: number;
    user_id: number;
    selected_option_id: number;
    is_correct: number;
    participation_xp_awarded: number;
    correct_bonus_xp_awarded: number;
    answered_on: string;
    answered_at: string;
}
export interface DailyQuestionStreak {
    user_id: number;
    current_streak: number;
    best_streak: number;
    last_answered_on: string | null;
    updated_at: string;
}
export declare const DailyQuestionModel: {
    findById(id: number): DailyQuestion | undefined;
    create(data: {
        club_id: number;
        question_text: string;
        explanation?: string | null;
        active_date: string;
        participation_xp: number;
        correct_bonus_xp: number;
        created_by: number;
    }): DailyQuestion;
    update(id: number, data: Partial<Pick<DailyQuestion, "question_text" | "explanation" | "active_date" | "participation_xp" | "correct_bonus_xp" | "status" | "published_at">>): DailyQuestion | undefined;
    delete(id: number): boolean;
    listManaged(params: {
        clubIds: number[];
        clubId?: number;
        date?: string;
        status?: string;
    }): DailyQuestion[];
    listAllManaged(params: {
        clubId?: number;
        date?: string;
        status?: string;
    }): DailyQuestion[];
    listStudentFeed(date: string): DailyQuestion[];
    hasAnswers(questionId: number): boolean;
    getOptions(questionId: number): DailyQuestionOption[];
    replaceOptions(questionId: number, options: Array<{
        option_key: string;
        option_text: string;
        sort_order: number;
        is_correct: number;
    }>): void;
    findOptionById(optionId: number): DailyQuestionOption | undefined;
    findAnswer(questionId: number, userId: number): DailyQuestionAnswer | undefined;
    insertAnswer(data: {
        question_id: number;
        user_id: number;
        selected_option_id: number;
        is_correct: number;
        participation_xp_awarded: number;
        correct_bonus_xp_awarded: number;
        answered_on: string;
    }): DailyQuestionAnswer;
    listUserHistory(userId: number, limit: number): DailyQuestionAnswer[];
    getAnswerStats(questionId: number): {
        total_responses: number;
        correct_responses: number;
    };
    getStreak(userId: number): DailyQuestionStreak | undefined;
    upsertStreak(userId: number, current_streak: number, best_streak: number, last_answered_on: string): void;
};
