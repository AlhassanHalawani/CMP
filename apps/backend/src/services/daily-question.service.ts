import { DailyQuestionModel, DailyQuestion, DailyQuestionOption } from '../models/dailyQuestion.model';
import { awardXp, getLevelProgress } from './gamification.service';
import { leaderOwnsClub, isAdmin } from './ownership.service';
import { User } from '../models/user.model';
import { db } from '../config/database';

// ─── App date helper ──────────────────────────────────────────────────────────
// Single source of truth for "today" — stored as ISO date YYYY-MM-DD in UTC
// so question availability, streaks, and FR012 login XP all use the same calendar.

export function getAppDate(date?: string): string {
  if (date) return date;
  return new Date().toISOString().slice(0, 10);
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface QuestionInput {
  club_id: number;
  question_text: string;
  explanation?: string | null;
  active_date: string;
  participation_xp?: number;
  correct_bonus_xp?: number;
  options: Array<{ option_key: string; option_text: string; is_correct: boolean }>;
}

export function validateQuestionInput(input: QuestionInput): string | null {
  if (!input.question_text?.trim()) return 'question_text is required';
  if (!input.active_date?.match(/^\d{4}-\d{2}-\d{2}$/)) return 'active_date must be YYYY-MM-DD';
  if (!input.options || input.options.length !== 4) return 'exactly 4 options required';
  const correct = input.options.filter((o) => o.is_correct);
  if (correct.length !== 1) return 'exactly 1 correct option required';
  for (const opt of input.options) {
    if (!opt.option_key?.trim() || !opt.option_text?.trim()) return 'each option requires option_key and option_text';
  }
  const pxp = input.participation_xp ?? 5;
  const cxp = input.correct_bonus_xp ?? 10;
  if (pxp < 0 || pxp > 10) return 'participation_xp must be between 0 and 10';
  if (cxp < 0 || cxp > 20) return 'correct_bonus_xp must be between 0 and 20';
  return null;
}

// ─── Create / Update ─────────────────────────────────────────────────────────

export function createQuestion(user: User, input: QuestionInput): DailyQuestion {
  const validationError = validateQuestionInput(input);
  if (validationError) throw Object.assign(new Error(validationError), { status: 400 });

  if (!isAdmin(user) && !leaderOwnsClub(user.id, input.club_id)) {
    throw Object.assign(new Error('You can only create questions for clubs you lead'), { status: 403 });
  }

  const question = DailyQuestionModel.create({
    club_id: input.club_id,
    question_text: input.question_text.trim(),
    explanation: input.explanation?.trim() ?? null,
    active_date: input.active_date,
    participation_xp: input.participation_xp ?? 5,
    correct_bonus_xp: input.correct_bonus_xp ?? 10,
    created_by: user.id,
  });

  DailyQuestionModel.replaceOptions(
    question.id,
    input.options.map((opt, i) => ({
      option_key: opt.option_key.trim(),
      option_text: opt.option_text.trim(),
      sort_order: i,
      is_correct: opt.is_correct ? 1 : 0,
    }))
  );

  return question;
}

export function updateQuestion(user: User, questionId: number, input: Partial<QuestionInput>): DailyQuestion {
  const question = DailyQuestionModel.findById(questionId);
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });
  if (question.status === 'published' && DailyQuestionModel.hasAnswers(questionId)) {
    // Allow only explanation edits after answers exist
    if (input.options || input.participation_xp !== undefined || input.correct_bonus_xp !== undefined) {
      throw Object.assign(
        new Error('Cannot edit answer options or XP amounts after students have already answered'),
        { status: 409 }
      );
    }
  }

  if (!isAdmin(user) && !leaderOwnsClub(user.id, question.club_id)) {
    throw Object.assign(new Error('You can only manage questions for clubs you lead'), { status: 403 });
  }

  if (question.status === 'published' && input.active_date) {
    throw Object.assign(new Error('Cannot change active_date after publishing'), { status: 409 });
  }

  const updates: Partial<DailyQuestion> = {};
  if (input.question_text !== undefined) updates.question_text = input.question_text.trim();
  if (input.explanation !== undefined) updates.explanation = input.explanation?.trim() ?? null;
  if (input.active_date !== undefined) updates.active_date = input.active_date;
  if (input.participation_xp !== undefined) updates.participation_xp = input.participation_xp;
  if (input.correct_bonus_xp !== undefined) updates.correct_bonus_xp = input.correct_bonus_xp;

  if (Object.keys(updates).length > 0) {
    DailyQuestionModel.update(questionId, updates);
  }

  if (input.options) {
    DailyQuestionModel.replaceOptions(
      questionId,
      input.options.map((opt, i) => ({
        option_key: opt.option_key.trim(),
        option_text: opt.option_text.trim(),
        sort_order: i,
        is_correct: opt.is_correct ? 1 : 0,
      }))
    );
  }

  return DailyQuestionModel.findById(questionId)!;
}

export function deleteQuestion(user: User, questionId: number): void {
  const question = DailyQuestionModel.findById(questionId);
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });
  if (question.status === 'published') {
    throw Object.assign(new Error('Cannot delete a published question'), { status: 409 });
  }
  if (!isAdmin(user) && !leaderOwnsClub(user.id, question.club_id)) {
    throw Object.assign(new Error('You can only manage questions for clubs you lead'), { status: 403 });
  }
  DailyQuestionModel.delete(questionId);
}

export function publishQuestion(user: User, questionId: number): DailyQuestion {
  const question = DailyQuestionModel.findById(questionId);
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });
  if (question.status === 'published') {
    throw Object.assign(new Error('Question is already published'), { status: 409 });
  }
  if (!isAdmin(user) && !leaderOwnsClub(user.id, question.club_id)) {
    throw Object.assign(new Error('You can only manage questions for clubs you lead'), { status: 403 });
  }
  const options = DailyQuestionModel.getOptions(questionId);
  if (options.length !== 4) {
    throw Object.assign(new Error('Question must have exactly 4 options before publishing'), { status: 400 });
  }
  if (!options.some((o) => o.is_correct)) {
    throw Object.assign(new Error('Question must have exactly 1 correct option before publishing'), { status: 400 });
  }
  return DailyQuestionModel.update(questionId, {
    status: 'published',
    published_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  })!;
}

// ─── Student feed ─────────────────────────────────────────────────────────────

export interface FeedQuestion {
  id: number;
  club_id: number;
  club_name: string;
  question_text: string;
  active_date: string;
  participation_xp: number;
  correct_bonus_xp: number;
  options: Array<{ id: number; option_key: string; option_text: string; sort_order: number }>;
  answered: boolean;
  answer?: {
    selected_option_id: number;
    is_correct: boolean;
    explanation: string | null;
    participation_xp_awarded: number;
    correct_bonus_xp_awarded: number;
  };
}

export function listStudentFeed(userId: number, date?: string): FeedQuestion[] {
  const targetDate = getAppDate(date);
  const questions = DailyQuestionModel.listStudentFeed(targetDate);

  return questions.map((q) => {
    const club = db
      .prepare('SELECT name FROM clubs WHERE id = ?')
      .get(q.club_id) as { name: string } | undefined;

    const allOptions = DailyQuestionModel.getOptions(q.id);
    const answer = DailyQuestionModel.findAnswer(q.id, userId);

    if (answer) {
      // After answering — reveal correct answer and explanation
      return {
        id: q.id,
        club_id: q.club_id,
        club_name: club?.name ?? '',
        question_text: q.question_text,
        active_date: q.active_date,
        participation_xp: q.participation_xp,
        correct_bonus_xp: q.correct_bonus_xp,
        options: allOptions.map((o) => ({
          id: o.id,
          option_key: o.option_key,
          option_text: o.option_text,
          sort_order: o.sort_order,
          is_correct: Boolean(o.is_correct),
        })),
        answered: true,
        answer: {
          selected_option_id: answer.selected_option_id,
          is_correct: Boolean(answer.is_correct),
          explanation: q.explanation,
          participation_xp_awarded: answer.participation_xp_awarded,
          correct_bonus_xp_awarded: answer.correct_bonus_xp_awarded,
        },
      };
    }

    // Before answering — hide is_correct
    return {
      id: q.id,
      club_id: q.club_id,
      club_name: club?.name ?? '',
      question_text: q.question_text,
      active_date: q.active_date,
      participation_xp: q.participation_xp,
      correct_bonus_xp: q.correct_bonus_xp,
      options: allOptions.map((o) => ({
        id: o.id,
        option_key: o.option_key,
        option_text: o.option_text,
        sort_order: o.sort_order,
      })),
      answered: false,
    };
  });
}

// ─── Managed question list ───────────────────────────────────────────────────

export function listManagedQuestions(
  user: User,
  params: { clubId?: number; date?: string; status?: string }
) {
  let questions: DailyQuestion[];

  if (isAdmin(user)) {
    questions = DailyQuestionModel.listAllManaged({
      clubId: params.clubId,
      date: params.date,
      status: params.status,
    });
  } else {
    // Find clubs this leader owns
    const ownedClubs = db
      .prepare('SELECT id FROM clubs WHERE leader_id = ?')
      .all(user.id) as { id: number }[];
    const clubIds = ownedClubs.map((c) => c.id);

    if (params.clubId && !clubIds.includes(params.clubId)) {
      throw Object.assign(new Error('You can only manage questions for clubs you lead'), { status: 403 });
    }

    questions = DailyQuestionModel.listManaged({
      clubIds,
      clubId: params.clubId,
      date: params.date,
      status: params.status,
    });
  }

  return questions.map((q) => {
    const options = DailyQuestionModel.getOptions(q.id);
    const stats = DailyQuestionModel.getAnswerStats(q.id);
    return {
      ...q,
      options,
      total_responses: stats.total_responses,
      correct_responses: stats.correct_responses ?? 0,
    };
  });
}

// ─── Submit answer ────────────────────────────────────────────────────────────

export interface SubmitAnswerResult {
  is_correct: boolean;
  explanation: string | null;
  correct_option_id: number;
  participation_xp_awarded: number;
  correct_bonus_xp_awarded: number;
  streak: { current_streak: number; best_streak: number; last_answered_on: string };
  xp_summary: ReturnType<typeof getLevelProgress>;
}

export function submitAnswer(userId: number, questionId: number, selectedOptionId: number): SubmitAnswerResult {
  const question = DailyQuestionModel.findById(questionId);
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });
  if (question.status !== 'published') {
    throw Object.assign(new Error('Question is not available'), { status: 404 });
  }

  const existing = DailyQuestionModel.findAnswer(questionId, userId);
  if (existing) throw Object.assign(new Error('You have already answered this question'), { status: 409 });

  const option = DailyQuestionModel.findOptionById(selectedOptionId);
  if (!option || option.question_id !== questionId) {
    throw Object.assign(new Error('Invalid option'), { status: 400 });
  }

  const isCorrect = option.is_correct === 1;
  const answeredOn = getAppDate();

  // Participation XP
  const participationResult = awardXp({
    userId,
    actionKey: 'daily_question_participation',
    referenceKey: `daily-question:${questionId}:${userId}:participation`,
    xpOverride: question.participation_xp,
    sourceType: 'daily_question',
    sourceId: questionId,
  });
  const participationXpAwarded = participationResult?.xp_awarded ?? 0;

  // Correct bonus XP
  let correctXpAwarded = 0;
  if (isCorrect) {
    const correctResult = awardXp({
      userId,
      actionKey: 'daily_question_correct_bonus',
      referenceKey: `daily-question:${questionId}:${userId}:correct`,
      xpOverride: question.correct_bonus_xp,
      sourceType: 'daily_question',
      sourceId: questionId,
    });
    correctXpAwarded = correctResult?.xp_awarded ?? 0;
  }

  DailyQuestionModel.insertAnswer({
    question_id: questionId,
    user_id: userId,
    selected_option_id: selectedOptionId,
    is_correct: isCorrect ? 1 : 0,
    participation_xp_awarded: participationXpAwarded,
    correct_bonus_xp_awarded: correctXpAwarded,
    answered_on: answeredOn,
  });

  const streak = updateStreak(userId, answeredOn);

  const options = DailyQuestionModel.getOptions(questionId);
  const correctOption = options.find((o) => o.is_correct === 1)!;

  const userRow = db
    .prepare('SELECT xp_total FROM users WHERE id = ?')
    .get(userId) as { xp_total: number };

  return {
    is_correct: isCorrect,
    explanation: question.explanation,
    correct_option_id: correctOption.id,
    participation_xp_awarded: participationXpAwarded,
    correct_bonus_xp_awarded: correctXpAwarded,
    streak,
    xp_summary: getLevelProgress(userRow.xp_total),
  };
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export function updateStreak(userId: number, answeredOn: string): { current_streak: number; best_streak: number; last_answered_on: string } {
  const existing = DailyQuestionModel.getStreak(userId);

  let current = 1;
  let best = 1;

  if (existing) {
    if (existing.last_answered_on === answeredOn) {
      // Already counted today
      return {
        current_streak: existing.current_streak,
        best_streak: existing.best_streak,
        last_answered_on: existing.last_answered_on!,
      };
    }

    const last = new Date(existing.last_answered_on!);
    const now = new Date(answeredOn);
    const diffDays = Math.round((now.getTime() - last.getTime()) / 86400000);

    current = diffDays === 1 ? existing.current_streak + 1 : 1;
    best = Math.max(existing.best_streak, current);
  }

  DailyQuestionModel.upsertStreak(userId, current, best, answeredOn);
  return { current_streak: current, best_streak: best, last_answered_on: answeredOn };
}

export function getStreak(userId: number) {
  const s = DailyQuestionModel.getStreak(userId);
  return {
    current_streak: s?.current_streak ?? 0,
    best_streak: s?.best_streak ?? 0,
    last_answered_on: s?.last_answered_on ?? null,
  };
}
