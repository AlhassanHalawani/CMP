import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/api/admin';
import { clubsApi } from '@/api/clubs';
import { achievementsApi } from '@/api/achievements';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/contexts/AuthContext';

const ALL_TERMS = '__all_terms__';
const ALL_CLUBS = '__all_clubs__';

// ─── Static achievement rule catalog ─────────────────────────────────────────
// These rules describe how achievements are earned. A backend catalog table
// (achievement_definitions) can replace this in a future migration.

const STUDENT_RULES = [
  { code: 'attend_1', tier: 'Bronze', points: 5, title: 'First Steps', description: 'Attend your first event' },
  { code: 'attend_5', tier: 'Bronze', points: 10, title: 'Regular Attendee', description: 'Attend 5 events' },
  { code: 'attend_10', tier: 'Silver', points: 20, title: 'Dedicated Member', description: 'Attend 10 events' },
  { code: 'attend_25', tier: 'Gold', points: 50, title: 'Event Champion', description: 'Attend 25 events' },
];

const CLUB_RULES = [
  { code: 'host_1', tier: 'Bronze', points: 10, title: 'First Event', description: 'Host your first published event' },
  { code: 'participants_50', tier: 'Gold', points: 20, title: 'Popular Club', description: 'Reach 50 participants in a single event' },
  { code: 'attend_100', tier: 'Gold', points: 30, title: 'High Engagement', description: 'Accumulate 100 total attendances across all events' },
  { code: 'members_20', tier: 'Silver', points: 15, title: 'Growing Community', description: 'Reach 20 active members' },
];

const TIER_VARIANT: Record<string, 'accent' | 'neutral' | 'secondary'> = {
  Gold: 'accent',
  Silver: 'secondary',
  Bronze: 'neutral',
};

function RuleCard({ rule }: { rule: typeof STUDENT_RULES[number] }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <Badge variant={TIER_VARIANT[rule.tier] ?? 'neutral'} className="shrink-0 mt-0.5">
          {rule.tier}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{rule.title}</p>
          <p className="text-xs opacity-60 mt-0.5">{rule.description}</p>
        </div>
        <Badge variant="neutral" className="shrink-0 text-xs">{rule.points} pts</Badge>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AchievementsPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const { currentUser } = useCurrentUser();
  const isLeader = hasRole('club_leader');

  const [semesterId, setSemesterId] = useState<string>('');
  const [clubId, setClubId] = useState<string>('');
  const [downloading, setDownloading] = useState(false);

  const { data: semestersData } = useQuery({
    queryKey: ['semesters'],
    queryFn: () => adminApi.listSemesters(),
  });

  const { data: clubsData } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => clubsApi.list({ limit: 200 }),
  });

  const { data: achievementsData } = useQuery({
    queryKey: ['achievements', 'user', currentUser?.id],
    queryFn: () => achievementsApi.listForUser(currentUser!.id),
    enabled: !!currentUser,
  });

  // Determine which club this leader owns (first match)
  const ownedClub = isLeader && currentUser
    ? (clubsData?.data ?? []).find((c) => c.leader_id === currentUser.id)
    : undefined;

  const { data: clubAchievementsData } = useQuery({
    queryKey: ['achievements', 'club', ownedClub?.id],
    queryFn: () => achievementsApi.listForClub(ownedClub!.id),
    enabled: !!ownedClub,
  });

  const semesters = semestersData?.data ?? [];
  const clubs = clubsData?.data ?? [];
  const achievements = achievementsData?.data ?? [];
  const clubAchievements = clubAchievementsData?.data ?? [];

  async function handleDownload() {
    if (!currentUser) return;
    setDownloading(true);
    try {
      const blob = await achievementsApi.downloadReport(currentUser.id, {
        semester_id: semesterId ? parseInt(semesterId) : undefined,
        club_id: clubId ? parseInt(clubId) : undefined,
        report_date: new Date().toISOString().slice(0, 10),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `achievements-${currentUser.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black">{t('achievements.title')}</h1>
      </div>

      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">{t('achievements.myAchievements', 'My Achievements')}</TabsTrigger>
          {isLeader && ownedClub && (
            <TabsTrigger value="club">{t('achievements.myClubAchievements', 'Club Achievements')}</TabsTrigger>
          )}
          <TabsTrigger value="howto">{t('achievements.howToEarn', 'How to Earn')}</TabsTrigger>
        </TabsList>

        {/* ── My Achievements ── */}
        <TabsContent value="my" className="mt-4">
          {/* Report download */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('achievements.reportTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[160px]">
                  <label className="text-sm font-medium mb-1 block">{t('achievements.semester')}</label>
                  <Select
                    value={semesterId || ALL_TERMS}
                    onValueChange={(v) => setSemesterId(v === ALL_TERMS ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('achievements.allTerms')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_TERMS}>{t('achievements.allTerms')}</SelectItem>
                      {semesters.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[160px]">
                  <label className="text-sm font-medium mb-1 block">{t('achievements.club')}</label>
                  <Select
                    value={clubId || ALL_CLUBS}
                    onValueChange={(v) => setClubId(v === ALL_CLUBS ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('achievements.allClubs')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_CLUBS}>{t('achievements.allClubs')}</SelectItem>
                      {clubs.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleDownload} disabled={downloading || !currentUser}>
                  {downloading ? t('common.loading') : t('achievements.downloadReport')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {achievements.length === 0 ? (
            <Card>
              <CardContent className="py-6">
                <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map((a) => (
                <Card key={a.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{a.title}</CardTitle>
                      <Badge variant="neutral">Club #{a.club_id}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {a.description && (
                      <p className="text-sm text-muted-foreground mb-2">{a.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{a.awarded_at.slice(0, 10)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Club Achievements ── */}
        {isLeader && ownedClub && (
          <TabsContent value="club" className="mt-4">
            <p className="mb-4 text-sm opacity-60">{ownedClub.name}</p>
            {clubAchievements.length === 0 ? (
              <Card>
                <CardContent className="py-6">
                  <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {clubAchievements.map((a) => (
                  <Card key={a.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{a.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {a.description && (
                        <p className="text-sm text-muted-foreground mb-2">{a.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{a.awarded_at.slice(0, 10)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* ── How to Earn ── */}
        <TabsContent value="howto" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-lg font-black">
                {t('achievements.studentRules', 'Student Achievements')}
              </h2>
              <p className="mb-4 text-sm opacity-60">
                {t('achievements.studentRulesDesc', 'Earn these by attending events and engaging with clubs.')}
              </p>
              <div className="flex flex-col gap-3">
                {STUDENT_RULES.map((r) => <RuleCard key={r.code} rule={r} />)}
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-lg font-black">
                {t('achievements.clubRules', 'Club Achievements')}
              </h2>
              <p className="mb-4 text-sm opacity-60">
                {t('achievements.clubRulesDesc', 'Clubs earn these by hosting events and growing their community.')}
              </p>
              <div className="flex flex-col gap-3">
                {CLUB_RULES.map((r) => <RuleCard key={r.code} rule={r} />)}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
