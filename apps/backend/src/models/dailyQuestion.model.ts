import { db } from '../config/database';

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

export const DailyQuestionModel = {
  findById(id: number): DailyQuestion | undefined {
    return db.prepare('SELECT * FROM daily_questions WHERE id = ?').get(id) as DailyQuestion | undefined;
  },

  create(data: {
    club_id: number;
    question_text: string;
    explanation?: string | null;
    active_date: string;
    participation_xp: number;
    correct_bonus_xp: number;
    created_by: number;
  }): DailyQuestion {
    const result = db
      .prepare(
        `INSERT INTO daily_questions
           (club_id, question_text, explanation, active_date, participation_xp, correct_bonus_xp, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.club_id,
        data.question_text,
        data.explanation ?? null,
        data.active_date,
        data.participation_xp,
        data.correct_bonus_xp,
        data.created_by
      );
    return DailyQuestionModel.findById(result.lastInsertRowid as number)!;
  },

  update(
    id: number,
    data: Partial<Pick<DailyQuestion, 'question_text' | 'explanation' | 'active_date' | 'participation_xp' | 'correct_bonus_xp' | 'status' | 'published_at'>>
  ): DailyQuestion | undefined {
    const fields: string[] = ['updated_at = datetime(\'now\')'];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(id);
    db.prepare(`UPDATE daily_questions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return DailyQuestionModel.findById(id);
  },

  delete(id: number): boolean {
    return db.prepare('DELETE FROM daily_questions WHERE id = ?').run(id).changes > 0;
  },

  listManaged(params: { clubIds: number[]; clubId?: number; date?: string; status?: string }): DailyQuestion[] {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.clubId) {
      conditions.push('club_id = ?');
      values.push(params.clubId);
    } else if (params.clubIds.length > 0) {
      conditions.push(`club_id IN (${params.clubIds.map(() => '?').join(',')})`);
      values.push(...params.clubIds);
    } else {
      return [];
    }

    if (params.date) {
      conditions.push('active_date = ?');
      values.push(params.date);
    }
    if (params.status && params.status !== 'all') {
      conditions.push('status = ?');
      values.push(params.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return db
      .prepare(`SELECT * FROM daily_questions ${where} ORDER BY active_date DESC, created_at DESC`)
      .all(...values) as DailyQuestion[];
  },

  listAllManaged(params: { clubId?: number; date?: string; status?: string }): DailyQuestion[] {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (params.clubId) {
      conditions.push('club_id = ?');
      values.push(params.clubId);
    }
    if (params.date) {
      conditions.push('active_date = ?');
      values.push(params.date);
    }
    if (params.status && params.status !== 'all') {
      conditions.push('status = ?');
      values.push(params.status);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return db
      .prepare(`SELECT * FROM daily_questions ${where} ORDER BY active_date DESC, created_at DESC`)
      .all(...values) as DailyQuestion[];
  },

  listStudentFeed(date: string): DailyQuestion[] {
    return db
      .prepare(`SELECT * FROM daily_questions WHERE status = 'published' AND active_date = ? ORDER BY created_at ASC`)
      .all(date) as DailyQuestion[];
  },

  hasAnswers(questionId: number): boolean {
    const row = db
      .prepare('SELECT COUNT(*) as cnt FROM daily_question_answers WHERE question_id = ?')
      .get(questionId) as { cnt: number };
    return row.cnt > 0;
  },

  // ─── Options ───────────────────────────────────────────────────────────────

  getOptions(questionId: number): DailyQuestionOption[] {
    return db
      .prepare('SELECT * FROM daily_question_options WHERE question_id = ? ORDER BY sort_order ASC')
      .all(questionId) as DailyQuestionOption[];
  },

  replaceOptions(
    questionId: number,
    options: Array<{ option_key: string; option_text: string; sort_order: number; is_correct: number }>
  ): void {
    db.prepare('DELETE FROM daily_question_options WHERE question_id = ?').run(questionId);
    const stmt = db.prepare(
      'INSERT INTO daily_question_options (question_id, option_key, option_text, sort_order, is_correct) VALUES (?, ?, ?, ?, ?)'
    );
    for (const opt of options) {
      stmt.run(questionId, opt.option_key, opt.option_text, opt.sort_order, opt.is_correct);
    }
  },

  findOptionById(optionId: number): DailyQuestionOption | undefined {
    return db
      .prepare('SELECT * FROM daily_question_options WHERE id = ?')
      .get(optionId) as DailyQuestionOption | undefined;
  },

  // ─── Answers ───────────────────────────────────────────────────────────────

  findAnswer(questionId: number, userId: number): DailyQuestionAnswer | undefined {
    return db
      .prepare('SELECT * FROM daily_question_answers WHERE question_id = ? AND user_id = ?')
      .get(questionId, userId) as DailyQuestionAnswer | undefined;
  },

  insertAnswer(data: {
    question_id: number;
    user_id: number;
    selected_option_id: number;
    is_correct: number;
    participation_xp_awarded: number;
    correct_bonus_xp_awarded: number;
    answered_on: string;
  }): DailyQuestionAnswer {
    const result = db
      .prepare(
        `INSERT INTO daily_question_answers
           (question_id, user_id, selected_option_id, is_correct, participation_xp_awarded, correct_bonus_xp_awarded, answered_on)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.question_id,
        data.user_id,
        data.selected_option_id,
        data.is_correct,
        data.participation_xp_awarded,
        data.correct_bonus_xp_awarded,
        data.answered_on
      );
    return db
      .prepare('SELECT * FROM daily_question_answers WHERE id = ?')
      .get(result.lastInsertRowid) as DailyQuestionAnswer;
  },

  listUserHistory(userId: number, limit: number): DailyQuestionAnswer[] {
    return db
      .prepare(
        'SELECT * FROM daily_question_answers WHERE user_id = ? ORDER BY answered_at DESC LIMIT ?'
      )
      .all(userId, limit) as DailyQuestionAnswer[];
  },

  getAnswerStats(questionId: number): { total_responses: number; correct_responses: number } {
    return db
      .prepare(
        `SELECT COUNT(*) as total_responses, SUM(is_correct) as correct_responses
         FROM daily_question_answers WHERE question_id = ?`
      )
      .get(questionId) as { total_responses: number; correct_responses: number };
  },

  // ─── Streaks ───────────────────────────────────────────────────────────────

  getStreak(userId: number): DailyQuestionStreak | undefined {
    return db
      .prepare('SELECT * FROM daily_question_streaks WHERE user_id = ?')
      .get(userId) as DailyQuestionStreak | undefined;
  },

  upsertStreak(userId: number, current_streak: number, best_streak: number, last_answered_on: string): void {
    db.prepare(
      `INSERT INTO daily_question_streaks (user_id, current_streak, best_streak, last_answered_on, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         current_streak = excluded.current_streak,
         best_streak = excluded.best_streak,
         last_answered_on = excluded.last_answered_on,
         updated_at = datetime('now')`
    ).run(userId, current_streak, best_streak, last_answered_on);
  },
};
