"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentFeed = getStudentFeed;
exports.answerQuestion = answerQuestion;
exports.getMyStreak = getMyStreak;
exports.getMyHistory = getMyHistory;
exports.createDailyQuestion = createDailyQuestion;
exports.updateDailyQuestion = updateDailyQuestion;
exports.deleteDailyQuestion = deleteDailyQuestion;
exports.publishDailyQuestion = publishDailyQuestion;
exports.getManagedQuestions = getManagedQuestions;
const daily_question_service_1 = require("../services/daily-question.service");
const dailyQuestion_model_1 = require("../models/dailyQuestion.model");
const badge_engine_service_1 = require("../services/badge-engine.service");
// ─── Student routes ───────────────────────────────────────────────────────────
async function getStudentFeed(req, res) {
    const date = req.query.date || (0, daily_question_service_1.getAppDate)();
    const feed = (0, daily_question_service_1.listStudentFeed)(req.user.id, date);
    res.json({ data: feed, date });
}
async function answerQuestion(req, res) {
    const questionId = parseInt(req.params.id);
    const { selected_option_id } = req.body;
    if (!selected_option_id || typeof selected_option_id !== 'number') {
        res.status(400).json({ error: 'selected_option_id is required and must be a number' });
        return;
    }
    try {
        const result = (0, daily_question_service_1.submitAnswer)(req.user.id, questionId, selected_option_id);
        // Best-effort: evaluate badges after a correct answer
        if (result.is_correct) {
            try {
                (0, badge_engine_service_1.evaluateStudentBadges)(req.user.id);
            }
            catch { /* ignore */ }
        }
        res.status(201).json(result);
    }
    catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
}
function getMyStreak(req, res) {
    const streak = (0, daily_question_service_1.getStreak)(req.user.id);
    res.json(streak);
}
function getMyHistory(req, res) {
    const limit = Math.min(parseInt(req.query.limit || '20'), 100);
    const history = dailyQuestion_model_1.DailyQuestionModel.listUserHistory(req.user.id, limit);
    res.json({ data: history, total: history.length });
}
// ─── Club leader / admin management routes ────────────────────────────────────
function createDailyQuestion(req, res) {
    try {
        const question = (0, daily_question_service_1.createQuestion)(req.user, req.body);
        res.status(201).json(question);
    }
    catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
}
function updateDailyQuestion(req, res) {
    const questionId = parseInt(req.params.id);
    try {
        const question = (0, daily_question_service_1.updateQuestion)(req.user, questionId, req.body);
        res.json(question);
    }
    catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
}
function deleteDailyQuestion(req, res) {
    const questionId = parseInt(req.params.id);
    try {
        (0, daily_question_service_1.deleteQuestion)(req.user, questionId);
        res.status(204).send();
    }
    catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
}
function publishDailyQuestion(req, res) {
    const questionId = parseInt(req.params.id);
    try {
        const question = (0, daily_question_service_1.publishQuestion)(req.user, questionId);
        res.json(question);
    }
    catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
}
function getManagedQuestions(req, res) {
    const clubId = req.query.club_id ? parseInt(req.query.club_id) : undefined;
    const date = req.query.date;
    const status = req.query.status;
    try {
        const questions = (0, daily_question_service_1.listManagedQuestions)(req.user, { clubId, date, status });
        res.json({ data: questions, total: questions.length });
    }
    catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
}
//# sourceMappingURL=dailyQuestions.controller.js.map