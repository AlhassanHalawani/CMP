import { DailyQuestion, DailyQuestionOption } from '../models/dailyQuestion.model';
import { getLevelProgress } from './gamification.service';
import { User } from '../models/user.model';
export declare function getAppDate(date?: string): string;
export interface QuestionInput {
    club_id: number;
    question_text: string;
    explanation?: string | null;
    active_date: string;
    participation_xp?: number;
    correct_bonus_xp?: number;
    options: Array<{
        option_key: string;
        option_text: string;
        is_correct: boolean;
    }>;
}
export declare function validateQuestionInput(input: QuestionInput): string | null;
export declare function createQuestion(user: User, input: QuestionInput): DailyQuestion;
export declare function updateQuestion(user: User, questionId: number, input: Partial<QuestionInput>): DailyQuestion;
export declare function deleteQuestion(user: User, questionId: number): void;
export declare function publishQuestion(user: User, questionId: number): DailyQuestion;
export interface FeedQuestion {
    id: number;
    club_id: number;
    club_name: string;
    question_text: string;
    active_date: string;
    participation_xp: number;
    correct_bonus_xp: number;
    options: Array<{
        id: number;
        option_key: string;
        option_text: string;
        sort_order: number;
    }>;
    answered: boolean;
    answer?: {
        selected_option_id: number;
        is_correct: boolean;
        explanation: string | null;
        participation_xp_awarded: number;
        correct_bonus_xp_awarded: number;
    };
}
export declare function listStudentFeed(userId: number, date?: string): FeedQuestion[];
export declare function listManagedQuestions(user: User, params: {
    clubId?: number;
    date?: string;
    status?: string;
}): {
    options: DailyQuestionOption[];
    total_responses: number;
    correct_responses: number;
    id: number;
    club_id: number;
    question_text: string;
    explanation: string | null;
    active_date: string;
    participation_xp: number;
    correct_bonus_xp: number;
    status: "draft" | "published";
    created_by: number;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}[];
export interface SubmitAnswerResult {
    is_correct: boolean;
    explanation: string | null;
    correct_option_id: number;
    participation_xp_awarded: number;
    correct_bonus_xp_awarded: number;
    streak: {
        current_streak: number;
        best_streak: number;
        last_answered_on: string;
    };
    xp_summary: ReturnType<typeof getLevelProgress>;
}
export declare function submitAnswer(userId: number, questionId: number, selectedOptionId: number): SubmitAnswerResult;
export declare function updateStreak(userId: number, answeredOn: string): {
    current_streak: number;
    best_streak: number;
    last_answered_on: string;
};
export declare function getStreak(userId: number): {
    current_streak: number;
    best_streak: number;
    last_answered_on: string | null;
};
