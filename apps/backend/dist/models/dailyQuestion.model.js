"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyQuestionModel = void 0;
const database_1 = require("../config/database");
exports.DailyQuestionModel = {
    findById(id) {
        return database_1.db.prepare('SELECT * FROM daily_questions WHERE id = ?').get(id);
    },
    create(data) {
        const result = database_1.db
            .prepare(`INSERT INTO daily_questions
           (club_id, question_text, explanation, active_date, participation_xp, correct_bonus_xp, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(data.club_id, data.question_text, data.explanation ?? null, data.active_date, data.participation_xp, data.correct_bonus_xp, data.created_by);
        return exports.DailyQuestionModel.findById(result.lastInsertRowid);
    },
    update(id, data) {
        const fields = ['updated_at = datetime(\'now\')'];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        values.push(id);
        database_1.db.prepare(`UPDATE daily_questions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return exports.DailyQuestionModel.findById(id);
    },
    delete(id) {
        return database_1.db.prepare('DELETE FROM daily_questions WHERE id = ?').run(id).changes > 0;
    },
    listManaged(params) {
        const conditions = [];
        const values = [];
        if (params.clubId) {
            conditions.push('club_id = ?');
            values.push(params.clubId);
        }
        else if (params.clubIds.length > 0) {
            conditions.push(`club_id IN (${params.clubIds.map(() => '?').join(',')})`);
            values.push(...params.clubIds);
        }
        else {
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
        return database_1.db
            .prepare(`SELECT * FROM daily_questions ${where} ORDER BY active_date DESC, created_at DESC`)
            .all(...values);
    },
    listAllManaged(params) {
        const conditions = [];
        const values = [];
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
        return database_1.db
            .prepare(`SELECT * FROM daily_questions ${where} ORDER BY active_date DESC, created_at DESC`)
            .all(...values);
    },
    listStudentFeed(date) {
        return database_1.db
            .prepare(`SELECT * FROM daily_questions WHERE status = 'published' AND active_date = ? ORDER BY created_at ASC`)
            .all(date);
    },
    hasAnswers(questionId) {
        const row = database_1.db
            .prepare('SELECT COUNT(*) as cnt FROM daily_question_answers WHERE question_id = ?')
            .get(questionId);
        return row.cnt > 0;
    },
    // ─── Options ───────────────────────────────────────────────────────────────
    getOptions(questionId) {
        return database_1.db
            .prepare('SELECT * FROM daily_question_options WHERE question_id = ? ORDER BY sort_order ASC')
            .all(questionId);
    },
    replaceOptions(questionId, options) {
        database_1.db.prepare('DELETE FROM daily_question_options WHERE question_id = ?').run(questionId);
        const stmt = database_1.db.prepare('INSERT INTO daily_question_options (question_id, option_key, option_text, sort_order, is_correct) VALUES (?, ?, ?, ?, ?)');
        for (const opt of options) {
            stmt.run(questionId, opt.option_key, opt.option_text, opt.sort_order, opt.is_correct);
        }
    },
    findOptionById(optionId) {
        return database_1.db
            .prepare('SELECT * FROM daily_question_options WHERE id = ?')
            .get(optionId);
    },
    // ─── Answers ───────────────────────────────────────────────────────────────
    findAnswer(questionId, userId) {
        return database_1.db
            .prepare('SELECT * FROM daily_question_answers WHERE question_id = ? AND user_id = ?')
            .get(questionId, userId);
    },
    insertAnswer(data) {
        const result = database_1.db
            .prepare(`INSERT INTO daily_question_answers
           (question_id, user_id, selected_option_id, is_correct, participation_xp_awarded, correct_bonus_xp_awarded, answered_on)
         VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(data.question_id, data.user_id, data.selected_option_id, data.is_correct, data.participation_xp_awarded, data.correct_bonus_xp_awarded, data.answered_on);
        return database_1.db
            .prepare('SELECT * FROM daily_question_answers WHERE id = ?')
            .get(result.lastInsertRowid);
    },
    listUserHistory(userId, limit) {
        return database_1.db
            .prepare('SELECT * FROM daily_question_answers WHERE user_id = ? ORDER BY answered_at DESC LIMIT ?')
            .all(userId, limit);
    },
    getAnswerStats(questionId) {
        return database_1.db
            .prepare(`SELECT COUNT(*) as total_responses, SUM(is_correct) as correct_responses
         FROM daily_question_answers WHERE question_id = ?`)
            .get(questionId);
    },
    // ─── Streaks ───────────────────────────────────────────────────────────────
    getStreak(userId) {
        return database_1.db
            .prepare('SELECT * FROM daily_question_streaks WHERE user_id = ?')
            .get(userId);
    },
    upsertStreak(userId, current_streak, best_streak, last_answered_on) {
        database_1.db.prepare(`INSERT INTO daily_question_streaks (user_id, current_streak, best_streak, last_answered_on, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         current_streak = excluded.current_streak,
         best_streak = excluded.best_streak,
         last_answered_on = excluded.last_answered_on,
         updated_at = datetime('now')`).run(userId, current_streak, best_streak, last_answered_on);
    },
};
//# sourceMappingURL=dailyQuestion.model.js.map