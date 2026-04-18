import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAppToast } from '@/contexts/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  dailyQuestionsApi,
  FeedQuestion,
  ManagedQuestion,
  QuestionFormData,
} from '@/api/dailyQuestions';
import { clubsApi } from '@/api/clubs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Flame, Trophy, CheckCircle2, XCircle, PlusCircle, Pencil, Trash2, SendHorizonal } from 'lucide-react';

// ─── Streak banner ────────────────────────────────────────────────────────────

function StreakBanner() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ['dq-streak'],
    queryFn: () => dailyQuestionsApi.getMyStreak(),
  });

  if (!data) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-base border border-border bg-[var(--overlay)]">
      <Flame className="text-orange-500 shrink-0" size={22} />
      <div className="flex-1">
        <p className="text-sm font-bold">{t('dailyQuestions.streak.current', { count: data.current_streak })}</p>
        <p className="text-xs opacity-60">{t('dailyQuestions.streak.best', { count: data.best_streak })}</p>
      </div>
      <Badge variant="neutral">
        <Trophy size={12} className="me-1" />
        {data.best_streak}
      </Badge>
    </div>
  );
}

// ─── Single feed question card ────────────────────────────────────────────────

function QuestionCard({ question }: { question: FeedQuestion }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { showToast } = useAppToast();
  const [selected, setSelected] = useState<number | null>(null);

  const answerMutation = useMutation({
    mutationFn: (optionId: number) => dailyQuestionsApi.submitAnswer(question.id, optionId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['dq-feed'] });
      qc.invalidateQueries({ queryKey: ['dq-streak'] });
      if (result.is_correct) {
        showToast(
          t('dailyQuestions.correct'),
          `+${result.participation_xp_awarded + result.correct_bonus_xp_awarded} XP`
        );
      } else {
        showToast(t('dailyQuestions.incorrect'), t('dailyQuestions.betterLuck'));
      }
    },
    onError: (err: any) => {
      showToast(t('common.error'), err?.response?.data?.error ?? err.message);
    },
  });

  const answered = question.answered;

  const optionClass = (optId: number) => {
    if (!answered) {
      return selected === optId
        ? 'border-[var(--main)] bg-[var(--main)] text-[var(--main-foreground)]'
        : 'border-border hover:border-[var(--main)] cursor-pointer';
    }
    const opt = question.options.find((o) => o.id === optId);
    const isCorrect = (opt as any)?.is_correct;
    const wasSelected = question.answer?.selected_option_id === optId;
    if (isCorrect) return 'border-green-500 bg-green-50 dark:bg-green-950';
    if (wasSelected && !isCorrect) return 'border-red-500 bg-red-50 dark:bg-red-950';
    return 'border-border opacity-60';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="neutral" className="text-xs shrink-0">{question.club_name}</Badge>
          <div className="flex gap-1 shrink-0">
            <Badge variant="secondary" className="text-xs">+{question.participation_xp} XP</Badge>
            <Badge variant="accent" className="text-xs">+{question.correct_bonus_xp} bonus</Badge>
          </div>
        </div>
        <CardTitle className="text-base mt-1">{question.question_text}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {question.options.map((opt) => (
          <button
            key={opt.id}
            disabled={answered}
            onClick={() => !answered && setSelected(opt.id)}
            className={`w-full text-start px-3 py-2 rounded-base border text-sm transition-colors ${optionClass(opt.id)}`}
          >
            <span className="font-mono font-bold me-2 uppercase">{opt.option_key}.</span>
            {opt.option_text}
            {answered && (opt as any).is_correct && (
              <CheckCircle2 className="inline ms-2 text-green-600" size={14} />
            )}
            {answered && question.answer?.selected_option_id === opt.id && !(opt as any).is_correct && (
              <XCircle className="inline ms-2 text-red-500" size={14} />
            )}
          </button>
        ))}

        {!answered && (
          <Button
            className="w-full mt-2"
            disabled={selected === null || answerMutation.isPending}
            onClick={() => selected !== null && answerMutation.mutate(selected)}
          >
            {answerMutation.isPending ? <Spinner className="size-4" /> : <SendHorizonal size={14} className="me-2" />}
            {t('dailyQuestions.submit')}
          </Button>
        )}

        {answered && question.answer && (
          <div className={`mt-2 p-3 rounded-base text-sm ${question.answer.is_correct ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'}`}>
            <p className="font-bold mb-1">
              {question.answer.is_correct ? t('dailyQuestions.correct') : t('dailyQuestions.incorrect')}
              {' · '}
              <span className="font-mono">
                +{question.answer.participation_xp_awarded + question.answer.correct_bonus_xp_awarded} XP
              </span>
            </p>
            {question.answer.explanation && (
              <p className="opacity-80">{question.answer.explanation}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Student feed tab ─────────────────────────────────────────────────────────

function StudentFeed() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['dq-feed'],
    queryFn: () => dailyQuestionsApi.getFeed(),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;

  const questions = data?.data ?? [];

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-semibold">{t('dailyQuestions.noQuestionsToday')}</p>
        <p className="text-sm mt-1">{t('dailyQuestions.checkBackTomorrow')}</p>
      </div>
    );
  }

  const allAnswered = questions.every((q) => q.answered);

  return (
    <div className="space-y-4">
      <StreakBanner />
      {allAnswered && (
        <div className="text-center py-4 text-sm text-muted-foreground font-medium">
          {t('dailyQuestions.allAnswered')}
        </div>
      )}
      {questions.map((q) => (
        <QuestionCard key={q.id} question={q} />
      ))}
    </div>
  );
}

// ─── Question form dialog ─────────────────────────────────────────────────────

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

const emptyForm = (): Omit<QuestionFormData, 'club_id'> => ({
  question_text: '',
  explanation: '',
  active_date: new Date().toISOString().slice(0, 10),
  participation_xp: 5,
  correct_bonus_xp: 10,
  options: OPTION_KEYS.map((k) => ({ option_key: k, option_text: '', is_correct: k === 'A' })),
});

function QuestionFormDialog({
  open,
  onClose,
  clubId,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  clubId: number | null;
  editing: ManagedQuestion | null;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { showToast } = useAppToast();

  const [form, setForm] = useState<Omit<QuestionFormData, 'club_id'>>(() =>
    editing
      ? {
          question_text: editing.question_text,
          explanation: editing.explanation ?? '',
          active_date: editing.active_date,
          participation_xp: editing.participation_xp,
          correct_bonus_xp: editing.correct_bonus_xp,
          options: OPTION_KEYS.map((k) => {
            const existing = editing.options.find((o) => o.option_key === k);
            return {
              option_key: k,
              option_text: existing?.option_text ?? '',
              is_correct: Boolean(existing?.is_correct),
            };
          }),
        }
      : emptyForm()
  );

  const hasAnswers = editing ? editing.total_responses > 0 : false;
  const isPublished = editing?.status === 'published';
  const optionsLocked = isPublished && hasAnswers;

  const createMutation = useMutation({
    mutationFn: (data: QuestionFormData) => dailyQuestionsApi.createQuestion(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dq-manage'] });
      showToast(t('dailyQuestions.created'));
      onClose();
    },
    onError: (err: any) => showToast(t('common.error'), err?.response?.data?.error ?? err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<QuestionFormData>) => dailyQuestionsApi.updateQuestion(editing!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dq-manage'] });
      showToast(t('dailyQuestions.updated'));
      onClose();
    },
    onError: (err: any) => showToast(t('common.error'), err?.response?.data?.error ?? err.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit() {
    if (!clubId) return;
    const payload: QuestionFormData = { ...form, club_id: clubId };
    if (editing) {
      updateMutation.mutate(optionsLocked ? { explanation: form.explanation } : payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  function setOptionText(idx: number, text: string) {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === idx ? { ...o, option_text: text } : o)),
    }));
  }

  function setCorrect(idx: number) {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => ({ ...o, is_correct: i === idx })),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? t('dailyQuestions.editQuestion') : t('dailyQuestions.newQuestion')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">{t('dailyQuestions.questionText')} *</label>
            <Textarea
              value={form.question_text}
              onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
              disabled={optionsLocked}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{t('dailyQuestions.activeDate')} *</label>
            <Input
              type="date"
              value={form.active_date}
              onChange={(e) => setForm((f) => ({ ...f, active_date: e.target.value }))}
              disabled={isPublished}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium block">{t('dailyQuestions.options')} *</label>
            {form.options.map((opt, idx) => (
              <div key={opt.option_key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => !optionsLocked && setCorrect(idx)}
                  disabled={optionsLocked}
                  className={`w-7 h-7 shrink-0 rounded-full border-2 text-xs font-bold transition-colors ${opt.is_correct ? 'bg-[var(--main)] border-[var(--main)] text-[var(--main-foreground)]' : 'border-border'}`}
                  title={t('dailyQuestions.markCorrect')}
                >
                  {opt.option_key}
                </button>
                <Input
                  value={opt.option_text}
                  onChange={(e) => setOptionText(idx, e.target.value)}
                  placeholder={`${t('dailyQuestions.option')} ${opt.option_key}`}
                  disabled={optionsLocked}
                  className="flex-1"
                />
              </div>
            ))}
            <p className="text-xs opacity-50">{t('dailyQuestions.clickToMarkCorrect')}</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{t('dailyQuestions.explanation')}</label>
            <Textarea
              value={form.explanation ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('dailyQuestions.participationXp')} (0–10)</label>
              <Input
                type="number"
                min={0}
                max={10}
                value={form.participation_xp}
                onChange={(e) => setForm((f) => ({ ...f, participation_xp: parseInt(e.target.value) || 0 }))}
                disabled={optionsLocked}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('dailyQuestions.correctBonusXp')} (0–20)</label>
              <Input
                type="number"
                min={0}
                max={20}
                value={form.correct_bonus_xp}
                onChange={(e) => setForm((f) => ({ ...f, correct_bonus_xp: parseInt(e.target.value) || 0 }))}
                disabled={optionsLocked}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="neutral" onClick={onClose} disabled={isPending}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Spinner className="size-4" /> : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Management tab ───────────────────────────────────────────────────────────

function ManageTab() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const { currentUser } = useCurrentUser();
  const qc = useQueryClient();
  const { showToast } = useAppToast();

  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedQuestion | null>(null);

  const { data: clubsData } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => clubsApi.list(),
  });

  const myClubs = hasRole('admin')
    ? (clubsData?.data ?? [])
    : (clubsData?.data ?? []).filter((c: any) => c.leader_id === currentUser?.id);

  const { data: managedData, isLoading } = useQuery({
    queryKey: ['dq-manage', selectedClubId, statusFilter],
    queryFn: () =>
      dailyQuestionsApi.getManagedQuestions({
        club_id: selectedClubId ?? undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    enabled: true,
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => dailyQuestionsApi.publishQuestion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dq-manage'] });
      showToast(t('dailyQuestions.published'));
    },
    onError: (err: any) => showToast(t('common.error'), err?.response?.data?.error ?? err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => dailyQuestionsApi.deleteQuestion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dq-manage'] });
      showToast(t('dailyQuestions.deleted'));
    },
    onError: (err: any) => showToast(t('common.error'), err?.response?.data?.error ?? err.message),
  });

  const questions = managedData?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-40">
          <label className="text-xs font-medium mb-1 block opacity-60">{t('clubs.title')}</label>
          <Select
            value={selectedClubId?.toString() ?? 'all'}
            onValueChange={(v) => setSelectedClubId(v === 'all' ? null : parseInt(v))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t('dailyQuestions.allClubs')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dailyQuestions.allClubs')}</SelectItem>
              {myClubs.map((c: any) => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-36">
          <label className="text-xs font-medium mb-1 block opacity-60">{t('dailyQuestions.status')}</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dailyQuestions.statusAll')}</SelectItem>
              <SelectItem value="draft">{t('dailyQuestions.statusDraft')}</SelectItem>
              <SelectItem value="published">{t('dailyQuestions.statusPublished')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          className="shrink-0"
          onClick={() => { setEditing(null); setFormOpen(true); }}
          disabled={!selectedClubId}
        >
          <PlusCircle size={14} className="me-2" />
          {t('dailyQuestions.newQuestion')}
        </Button>
      </div>

      {!selectedClubId && (
        <p className="text-sm text-muted-foreground">{t('dailyQuestions.selectClubFirst')}</p>
      )}

      {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}

      {!isLoading && questions.length === 0 && selectedClubId && (
        <p className="text-center py-8 text-muted-foreground text-sm">{t('common.noData')}</p>
      )}

      <div className="space-y-3">
        {questions.map((q) => (
          <Card key={q.id}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1 mb-1">
                    <Badge variant={q.status === 'published' ? 'default' : 'neutral'} className="text-xs">
                      {q.status === 'published' ? t('dailyQuestions.statusPublished') : t('dailyQuestions.statusDraft')}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">{q.active_date}</Badge>
                    <Badge variant="neutral" className="text-xs">
                      {q.total_responses} {t('dailyQuestions.responses')}
                      {q.total_responses > 0 && ` · ${Math.round((q.correct_responses / q.total_responses) * 100)}% ✓`}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{q.question_text}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {q.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="neutral"
                      onClick={() => publishMutation.mutate(q.id)}
                      disabled={publishMutation.isPending}
                      title={t('dailyQuestions.publish')}
                    >
                      {t('dailyQuestions.publish')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="neutral"
                    onClick={() => { setEditing(q); setFormOpen(true); }}
                    title={t('common.edit')}
                  >
                    <Pencil size={12} />
                  </Button>
                  {q.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="neutral"
                      onClick={() => deleteMutation.mutate(q.id)}
                      disabled={deleteMutation.isPending}
                      title={t('common.delete')}
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {formOpen && (
        <QuestionFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          clubId={selectedClubId}
          editing={editing}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DailyQuestionsPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const isLeaderOrAdmin = hasRole('admin') || hasRole('club_leader');

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
      <h1 className="text-2xl font-black">{t('dailyQuestions.title')}</h1>

      {isLeaderOrAdmin ? (
        <Tabs defaultValue="feed">
          <TabsList>
            <TabsTrigger value="feed">{t('dailyQuestions.tabFeed')}</TabsTrigger>
            <TabsTrigger value="manage">{t('dailyQuestions.tabManage')}</TabsTrigger>
          </TabsList>
          <TabsContent value="feed" className="mt-4">
            <StudentFeed />
          </TabsContent>
          <TabsContent value="manage" className="mt-4">
            <ManageTab />
          </TabsContent>
        </Tabs>
      ) : (
        <StudentFeed />
      )}
    </div>
  );
}
