import api from './client';

export interface FeedOption {
  id: number;
  option_key: string;
  option_text: string;
  sort_order: number;
  is_correct?: boolean;
}

export interface FeedQuestionAnswer {
  selected_option_id: number;
  is_correct: boolean;
  explanation: string | null;
  participation_xp_awarded: number;
  correct_bonus_xp_awarded: number;
}

export interface FeedQuestion {
  id: number;
  club_id: number;
  club_name: string;
  question_text: string;
  active_date: string;
  participation_xp: number;
  correct_bonus_xp: number;
  options: FeedOption[];
  answered: boolean;
  answer?: FeedQuestionAnswer;
}

export interface DailyStreak {
  current_streak: number;
  best_streak: number;
  last_answered_on: string | null;
}

export interface SubmitAnswerResult {
  is_correct: boolean;
  explanation: string | null;
  correct_option_id: number;
  participation_xp_awarded: number;
  correct_bonus_xp_awarded: number;
  streak: DailyStreak;
  xp_summary: {
    current_xp: number;
    current_level: number;
    progress_percent: number;
    xp_to_next_level: number;
    next_level_xp: number;
    current_level_floor: number;
  };
}

export interface ManagedQuestionOption {
  id: number;
  option_key: string;
  option_text: string;
  sort_order: number;
  is_correct: number;
}

export interface ManagedQuestion {
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
  options: ManagedQuestionOption[];
  total_responses: number;
  correct_responses: number;
}

export interface QuestionFormData {
  club_id: number;
  question_text: string;
  explanation?: string;
  active_date: string;
  participation_xp: number;
  correct_bonus_xp: number;
  options: Array<{ option_key: string; option_text: string; is_correct: boolean }>;
}

export const dailyQuestionsApi = {
  getFeed: (date?: string) =>
    api
      .get<{ data: FeedQuestion[]; date: string }>('/daily-questions', { params: date ? { date } : {} })
      .then((r) => r.data),

  submitAnswer: (questionId: number, selectedOptionId: number) =>
    api
      .post<SubmitAnswerResult>(`/daily-questions/${questionId}/answer`, { selected_option_id: selectedOptionId })
      .then((r) => r.data),

  getMyStreak: () =>
    api.get<DailyStreak>('/daily-questions/me/streak').then((r) => r.data),

  getMyHistory: (limit = 20) =>
    api
      .get<{ data: unknown[]; total: number }>('/daily-questions/me/history', { params: { limit } })
      .then((r) => r.data),

  // Management
  getManagedQuestions: (params?: { club_id?: number; date?: string; status?: string }) =>
    api
      .get<{ data: ManagedQuestion[]; total: number }>('/daily-questions/manage', { params })
      .then((r) => r.data),

  createQuestion: (data: QuestionFormData) =>
    api.post<ManagedQuestion>('/daily-questions', data).then((r) => r.data),

  updateQuestion: (id: number, data: Partial<QuestionFormData>) =>
    api.patch<ManagedQuestion>(`/daily-questions/${id}`, data).then((r) => r.data),

  deleteQuestion: (id: number) => api.delete(`/daily-questions/${id}`),

  publishQuestion: (id: number) =>
    api.post<ManagedQuestion>(`/daily-questions/${id}/publish`).then((r) => r.data),
};
