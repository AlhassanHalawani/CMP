import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  publishQuestion,
  listStudentFeed,
  listManagedQuestions,
  submitAnswer,
  getStreak,
  getAppDate,
} from '../services/daily-question.service';
import { DailyQuestionModel } from '../models/dailyQuestion.model';
import { notify } from '../services/notifications.service';
import { evaluateStudentBadges } from '../services/badge-engine.service';

// ─── Student routes ───────────────────────────────────────────────────────────

export async function getStudentFeed(req: AuthRequest, res: Response) {
  const date = (req.query.date as string) || getAppDate();
  const feed = listStudentFeed(req.user!.id, date);
  res.json({ data: feed, date });
}

export async function answerQuestion(req: AuthRequest, res: Response) {
  const questionId = parseInt(req.params.id);
  const { selected_option_id } = req.body;

  if (!selected_option_id || typeof selected_option_id !== 'number') {
    res.status(400).json({ error: 'selected_option_id is required and must be a number' });
    return;
  }

  try {
    const result = submitAnswer(req.user!.id, questionId, selected_option_id);

    // Best-effort: evaluate badges after a correct answer
    if (result.is_correct) {
      try { evaluateStudentBadges(req.user!.id); } catch { /* ignore */ }
    }

    res.status(201).json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export function getMyStreak(req: AuthRequest, res: Response) {
  const streak = getStreak(req.user!.id);
  res.json(streak);
}

export function getMyHistory(req: AuthRequest, res: Response) {
  const limit = Math.min(parseInt((req.query.limit as string) || '20'), 100);
  const history = DailyQuestionModel.listUserHistory(req.user!.id, limit);
  res.json({ data: history, total: history.length });
}

// ─── Club leader / admin management routes ────────────────────────────────────

export function createDailyQuestion(req: AuthRequest, res: Response) {
  try {
    const question = createQuestion(req.user!, req.body);
    res.status(201).json(question);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export function updateDailyQuestion(req: AuthRequest, res: Response) {
  const questionId = parseInt(req.params.id);
  try {
    const question = updateQuestion(req.user!, questionId, req.body);
    res.json(question);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export function deleteDailyQuestion(req: AuthRequest, res: Response) {
  const questionId = parseInt(req.params.id);
  try {
    deleteQuestion(req.user!, questionId);
    res.status(204).send();
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export function publishDailyQuestion(req: AuthRequest, res: Response) {
  const questionId = parseInt(req.params.id);
  try {
    const question = publishQuestion(req.user!, questionId);
    res.json(question);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export function getManagedQuestions(req: AuthRequest, res: Response) {
  const clubId = req.query.club_id ? parseInt(req.query.club_id as string) : undefined;
  const date = req.query.date as string | undefined;
  const status = req.query.status as string | undefined;

  try {
    const questions = listManagedQuestions(req.user!, { clubId, date, status });
    res.json({ data: questions, total: questions.length });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}
