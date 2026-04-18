"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppDate = getAppDate;
exports.validateQuestionInput = validateQuestionInput;
exports.createQuestion = createQuestion;
exports.updateQuestion = updateQuestion;
exports.deleteQuestion = deleteQuestion;
exports.publishQuestion = publishQuestion;
exports.listStudentFeed = listStudentFeed;
exports.listManagedQuestions = listManagedQuestions;
exports.submitAnswer = submitAnswer;
exports.updateStreak = updateStreak;
exports.getStreak = getStreak;
const dailyQuestion_model_1 = require("../models/dailyQuestion.model");
const gamification_service_1 = require("./gamification.service");
const ownership_service_1 = require("./ownership.service");
const database_1 = require("../config/database");
// ─── App date helper ──────────────────────────────────────────────────────────
// Single source of truth for "today" — stored as ISO date YYYY-MM-DD in UTC
// so question availability, streaks, and FR012 login XP all use the same calendar.
function getAppDate(date) {
    if (date)
        return date;
    return new Date().toISOString().slice(0, 10);
}
function validateQuestionInput(input) {
    if (!input.question_text?.trim())
        return 'question_text is required';
    if (!input.active_date?.match(/^\d{4}-\d{2}-\d{2}$/))
        return 'active_date must be YYYY-MM-DD';
    if (!input.options || input.options.length !== 4)
        return 'exactly 4 options required';
    const correct = input.options.filter((o) => o.is_correct);
    if (correct.length !== 1)
        return 'exactly 1 correct option required';
    for (const opt of input.options) {
        if (!opt.option_key?.trim() || !opt.option_text?.trim())
            return 'each option requires option_key and option_text';
    }
    const pxp = input.participation_xp ?? 5;
    const cxp = input.correct_bonus_xp ?? 10;
    if (pxp < 0 || pxp > 10)
        return 'participation_xp must be between 0 and 10';
    if (cxp < 0 || cxp > 20)
        return 'correct_bonus_xp must be between 0 and 20';
    return null;
}
// ─── Create / Update ─────────────────────────────────────────────────────────
function createQuestion(user, input) {
    const validationError = validateQuestionInput(input);
    if (validationError)
        throw Object.assign(new Error(validationError), { status: 400 });
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsClub)(user.id, input.club_id)) {
        throw Object.assign(new Error('You can only create questions for clubs you lead'), { status: 403 });
    }
    const question = dailyQuestion_model_1.DailyQuestionModel.create({
        club_id: input.club_id,
        question_text: input.question_text.trim(),
        explanation: input.explanation?.trim() ?? null,
        active_date: input.active_date,
        participation_xp: input.participation_xp ?? 5,
        correct_bonus_xp: input.correct_bonus_xp ?? 10,
        created_by: user.id,
    });
    dailyQuestion_model_1.DailyQuestionModel.replaceOptions(question.id, input.options.map((opt, i) => ({
        option_key: opt.option_key.trim(),
        option_text: opt.option_text.trim(),
        sort_order: i,
        is_correct: opt.is_correct ? 1 : 0,
    })));
    return question;
}
function updateQuestion(user, questionId, input) {
    const question = dailyQuestion_model_1.DailyQuestionModel.findById(questionId);
    if (!question)
        throw Object.assign(new Error('Question not found'), { status: 404 });
    if (question.status === 'published' && dailyQuestion_model_1.DailyQuestionModel.hasAnswers(questionId)) {
        // Allow only explanation edits after answers exist
        if (input.options || input.participation_xp !== undefined || input.correct_bonus_xp !== undefined) {
            throw Object.assign(new Error('Cannot edit answer options or XP amounts after students have already answered'), { status: 409 });
        }
    }
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsClub)(user.id, question.club_id)) {
        throw Object.assign(new Error('You can only manage questions for clubs you lead'), { status: 403 });
    }
    if (question.status === 'published' && input.active_date) {
        throw Object.assign(new Error('Cannot change active_date after publishing'), { status: 409 });
    }
    const updates = {};
    if (input.question_text !== undefined)
        updates.question_text = input.question_text.trim();
    if (input.explanation !== undefined)
        updates.explanation = input.explanation?.trim() ?? null;
    if (input.active_date !== undefined)
        updates.active_date = input.active_date;
    if (input.participation_xp !== undefined)
        updates.participation_xp = input.participation_xp;
    if (input.correct_bonus_xp !== undefined)
        updates.correct_bonus_xp = input.correct_bonus_xp;
    if (Object.keys(updates).length > 0) {
        dailyQuestion_model_1.DailyQuestionModel.update(questionId, updates);
    }
    if (input.options) {
        dailyQuestion_model_1.DailyQuestionModel.replaceOptions(questionId, input.options.map((opt, i) => ({
            option_key: opt.option_key.trim(),
            option_text: opt.option_text.trim(),
            sort_order: i,
            is_correct: opt.is_correct ? 1 : 0,
        })));
    }
    return dailyQuestion_model_1.DailyQuestionModel.findById(questionId);
}
function deleteQuestion(user, questionId) {
    const question = dailyQuestion_model_1.DailyQuestionModel.findById(questionId);
    if (!question)
        throw Object.assign(new Error('Question not found'), { status: 404 });
    if (question.status === 'published') {
        throw Object.assign(new Error('Cannot delete a published question'), { status: 409 });
    }
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsClub)(user.id, question.club_id)) {
        throw Object.assign(new Error('You can only manage questions for clubs you lead'), { status: 403 });
    }
    dailyQuestion_model_1.DailyQuestionModel.delete(questionId);
}
function publishQuestion(user, questionId) {
    const question = dailyQuestion_model_1.DailyQuestionModel.findById(questionId);
    if (!question)
        throw Object.assign(new Error('Question not found'), { status: 404 });
    if (question.status === 'published') {
        throw Object.assign(new Error('Question is already published'), { status: 409 });
    }
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsClub)(user.id, question.club_id)) {
        throw Object.assign(new Error('You can only manage questions for clubs you lead'), { status: 403 });
    }
    const options = dailyQuestion_model_1.DailyQuestionModel.getOptions(questionId);
    if (options.length !== 4) {
        throw Object.assign(new Error('Question must have exactly 4 options before publishing'), { status: 400 });
    }
    if (!options.some((o) => o.is_correct)) {
        throw Object.assign(new Error('Question must have exactly 1 correct option before publishing'), { status: 400 });
    }
    return dailyQuestion_model_1.DailyQuestionModel.update(questionId, {
        status: 'published',
        published_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });
}
function listStudentFeed(userId, date) {
    const targetDate = getAppDate(date);
    const questions = dailyQuestion_model_1.DailyQuestionModel.listStudentFeed(targetDate);
    return questions.map((q) => {
        const club = database_1.db
            .prepare('SELECT name FROM clubs WHERE id = ?')
            .get(q.club_id);
        const allOptions = dailyQuestion_model_1.DailyQuestionModel.getOptions(q.id);
        const answer = dailyQuestion_model_1.DailyQuestionModel.findAnswer(q.id, userId);
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
function listManagedQuestions(user, params) {
    let questions;
    if ((0, ownership_service_1.isAdmin)(user)) {
        questions = dailyQuestion_model_1.DailyQuestionModel.listAllManaged({
            clubId: params.clubId,
            date: params.date,
            status: params.status,
        });
    }
    else {
        // Find clubs this leader owns
        const ownedClubs = database_1.db
            .prepare('SELECT id FROM clubs WHERE leader_id = ?')
            .all(user.id);
        const clubIds = ownedClubs.map((c) => c.id);
        if (params.clubId && !clubIds.includes(params.clubId)) {
            throw Object.assign(new Error('You can only manage questions for clubs you lead'), { status: 403 });
        }
        questions = dailyQuestion_model_1.DailyQuestionModel.listManaged({
            clubIds,
            clubId: params.clubId,
            date: params.date,
            status: params.status,
        });
    }
    return questions.map((q) => {
        const options = dailyQuestion_model_1.DailyQuestionModel.getOptions(q.id);
        const stats = dailyQuestion_model_1.DailyQuestionModel.getAnswerStats(q.id);
        return {
            ...q,
            options,
            total_responses: stats.total_responses,
            correct_responses: stats.correct_responses ?? 0,
        };
    });
}
function submitAnswer(userId, questionId, selectedOptionId) {
    const question = dailyQuestion_model_1.DailyQuestionModel.findById(questionId);
    if (!question)
        throw Object.assign(new Error('Question not found'), { status: 404 });
    if (question.status !== 'published') {
        throw Object.assign(new Error('Question is not available'), { status: 404 });
    }
    const existing = dailyQuestion_model_1.DailyQuestionModel.findAnswer(questionId, userId);
    if (existing)
        throw Object.assign(new Error('You have already answered this question'), { status: 409 });
    const option = dailyQuestion_model_1.DailyQuestionModel.findOptionById(selectedOptionId);
    if (!option || option.question_id !== questionId) {
        throw Object.assign(new Error('Invalid option'), { status: 400 });
    }
    const isCorrect = option.is_correct === 1;
    const answeredOn = getAppDate();
    // Participation XP
    const participationResult = (0, gamification_service_1.awardXp)({
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
        const correctResult = (0, gamification_service_1.awardXp)({
            userId,
            actionKey: 'daily_question_correct_bonus',
            referenceKey: `daily-question:${questionId}:${userId}:correct`,
            xpOverride: question.correct_bonus_xp,
            sourceType: 'daily_question',
            sourceId: questionId,
        });
        correctXpAwarded = correctResult?.xp_awarded ?? 0;
    }
    dailyQuestion_model_1.DailyQuestionModel.insertAnswer({
        question_id: questionId,
        user_id: userId,
        selected_option_id: selectedOptionId,
        is_correct: isCorrect ? 1 : 0,
        participation_xp_awarded: participationXpAwarded,
        correct_bonus_xp_awarded: correctXpAwarded,
        answered_on: answeredOn,
    });
    const streak = updateStreak(userId, answeredOn);
    const options = dailyQuestion_model_1.DailyQuestionModel.getOptions(questionId);
    const correctOption = options.find((o) => o.is_correct === 1);
    const userRow = database_1.db
        .prepare('SELECT xp_total FROM users WHERE id = ?')
        .get(userId);
    return {
        is_correct: isCorrect,
        explanation: question.explanation,
        correct_option_id: correctOption.id,
        participation_xp_awarded: participationXpAwarded,
        correct_bonus_xp_awarded: correctXpAwarded,
        streak,
        xp_summary: (0, gamification_service_1.getLevelProgress)(userRow.xp_total),
    };
}
// ─── Streak ───────────────────────────────────────────────────────────────────
function updateStreak(userId, answeredOn) {
    const existing = dailyQuestion_model_1.DailyQuestionModel.getStreak(userId);
    let current = 1;
    let best = 1;
    if (existing) {
        if (existing.last_answered_on === answeredOn) {
            // Already counted today
            return {
                current_streak: existing.current_streak,
                best_streak: existing.best_streak,
                last_answered_on: existing.last_answered_on,
            };
        }
        const last = new Date(existing.last_answered_on);
        const now = new Date(answeredOn);
        const diffDays = Math.round((now.getTime() - last.getTime()) / 86400000);
        current = diffDays === 1 ? existing.current_streak + 1 : 1;
        best = Math.max(existing.best_streak, current);
    }
    dailyQuestion_model_1.DailyQuestionModel.upsertStreak(userId, current, best, answeredOn);
    return { current_streak: current, best_streak: best, last_answered_on: answeredOn };
}
function getStreak(userId) {
    const s = dailyQuestion_model_1.DailyQuestionModel.getStreak(userId);
    return {
        current_streak: s?.current_streak ?? 0,
        best_streak: s?.best_streak ?? 0,
        last_answered_on: s?.last_answered_on ?? null,
    };
}
//# sourceMappingURL=daily-question.service.js.map