import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { achievementsApi, Achievement, AchievementDefinition, EngineProgress } from '@/api/achievements';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/contexts/AuthContext';

const ALL_TERMS = '__all_terms__';
const ALL_CLUBS = '__all_clubs__';

const TIER_VARIANT: Record<string, 'accent' | 'neutral' | 'secondary'> = {
  Gold: 'accent',
  Silver: 'secondary',
  Bronze: 'neutral',
};

// ─── Badge progress card ──────────────────────────────────────────────────────

function BadgeCard({
  definition,
  currentValue,
  unlocked,
}: {
  definition: AchievementDefinition;
  currentValue: number;
  unlocked: boolean;
}) {
  const pct = Math.min(100, Math.round((currentValue / definition.threshold) * 100));

  return (
    <Card className={unlocked ? 'ring-2 ring-offset-1 ring-main' : 'opacity-80'}>
      <CardContent className="py-4 flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <Badge variant={TIER_VARIANT[definition.tier] ?? 'neutral'}>{definition.tier}</Badge>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-sm">{definition.title}</p>
            {unlocked && <span className="text-xs text-green-600 font-bold">✓ Earned</span>}
          </div>
          <p className="text-xs opacity-60 mb-2">{definition.description}</p>
          {!unlocked && (
            <div className="space-y-1">
              <Progress value={pct} className="h-1.5" />
              <p className="text-xs opacity-50">
                {currentValue} / {definition.threshold}
              </p>
            </div>
          )}
        </div>
        <Badge variant="neutral" className="shrink-0 text-xs">{definition.points} pts</Badge>
      </CardContent>
    </Card>
  );
}

// ─── Engine progress panel ────────────────────────────────────────────────────

function EngineProgressPanel({
  progress,
  entityType,
}: {
  progress: EngineProgress;
  entityType: 'student' | 'club';
}) {
  const unlockedIds = new Set(progress.unlocks.map((u) => u.definition_id));
  const defs = progress.definitions.filter((d) => d.entity_type === entityType);
  const earnedPoints = defs
    .filter((d) => unlockedIds.has(d.id))
    .reduce((sum, d) => sum + d.points, 0);
  const earnedCount = defs.filter((d) => unlockedIds.has(d.id)).length;

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="text-sm font-bold">
          {earnedCount} / {defs.length} badges earned
        </div>
        <Badge variant="accent" className="text-sm">{earnedPoints} pts total</Badge>
      </div>
      <div className="flex flex-col gap-3">
        {defs.map((def) => (
          <BadgeCard
            key={def.id}
            definition={def}
            currentValue={(progress.metrics as Record<string, number>)[def.metric] ?? 0}
            unlocked={unlockedIds.has(def.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Reusable achievement card ────────────────────────────────────────────────

function AchievementCard({ achievement, clubName }: { achievement: Achievement; clubName?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{achievement.title}</CardTitle>
          {clubName && <Badge variant="neutral">{clubName}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {achievement.description && (
          <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
        )}
        <p className="text-xs text-muted-foreground">{achievement.awarded_at.slice(0, 10)}</p>
      </CardContent>
    </Card>
  );
}

function AchievementGrid({ achievements, clubMap }: { achievements: Achievement[]; clubMap: Map<number, string> }) {
  if (achievements.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {achievements.map((a) => (
        <AchievementCard key={a.id} achievement={a} clubName={clubMap.get(a.club_id)} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AchievementsPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const { currentUser } = useCurrentUser();
  const isAdmin = hasRole('admin');
  const isLeader = hasRole('club_leader') && !isAdmin;

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

  // Personal achievements (students + leaders)
  const { data: myAchievementsData } = useQuery({
    queryKey: ['achievements', 'user', currentUser?.id],
    queryFn: () => achievementsApi.listForUser(currentUser!.id),
    enabled: !!currentUser && !isAdmin,
  });

  // Engine progress (student badges)
  const { data: myProgress } = useQuery({
    queryKey: ['achievements', 'engine', 'me'],
    queryFn: () => achievementsApi.getMyProgress(),
    enabled: !!currentUser && !isAdmin,
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

  // Club engine progress (leader)
  const { data: clubProgress } = useQuery({
    queryKey: ['achievements', 'engine', 'club', ownedClub?.id],
    queryFn: () => achievementsApi.getClubProgress(ownedClub!.id),
    enabled: !!ownedClub,
  });

  // Admin: all student achievements
  const { data: allStudentAchievementsData } = useQuery({
    queryKey: ['achievements', 'all', 'students'],
    queryFn: () => achievementsApi.listAll(),
    enabled: isAdmin,
  });

  // Admin: all club achievements grouped by club
  const { data: allClubAchievementsData } = useQuery({
    queryKey: ['achievements', 'all', 'clubs'],
    queryFn: () => achievementsApi.listAll(),
    enabled: isAdmin,
  });

  const semesters = semestersData?.data ?? [];
  const clubs = clubsData?.data ?? [];
  const myAchievements = myAchievementsData?.data ?? [];
  const clubAchievements = clubAchievementsData?.data ?? [];
  const allAchievements = allStudentAchievementsData?.data ?? allClubAchievementsData?.data ?? [];

  const clubMap = new Map(clubs.map((c) => [c.id, c.name]));

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

  const defaultTab = isAdmin ? 'students' : 'my';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black">{t('achievements.title')}</h1>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {!isAdmin && (
            <TabsTrigger value="my">{t('achievements.myAchievements', 'My Achievements')}</TabsTrigger>
          )}
          {!isAdmin && (
            <TabsTrigger value="badges">Badges</TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="students">{t('achievements.studentAchievements', 'Student Achievements')}</TabsTrigger>
          )}
          {(isLeader && ownedClub) || isAdmin ? (
            <TabsTrigger value="club">{t('achievements.myClubAchievements', 'Club Achievements')}</TabsTrigger>
          ) : null}
          {(isLeader && ownedClub) && (
            <TabsTrigger value="club-badges">Club Badges</TabsTrigger>
          )}
        </TabsList>

        {/* ── My Achievements (student / leader) ── */}
        {!isAdmin && (
          <TabsContent value="my" className="mt-4">
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

            <AchievementGrid achievements={myAchievements} clubMap={clubMap} />
          </TabsContent>
        )}

        {/* ── Student Badges with progress ── */}
        {!isAdmin && (
          <TabsContent value="badges" className="mt-4">
            {myProgress ? (
              <EngineProgressPanel progress={myProgress} entityType="student" />
            ) : (
              <p className="text-sm opacity-60">Loading badges…</p>
            )}
          </TabsContent>
        )}

        {/* ── Student Achievements (admin) ── */}
        {isAdmin && (
          <TabsContent value="students" className="mt-4">
            <AchievementGrid achievements={allAchievements} clubMap={clubMap} />
          </TabsContent>
        )}

        {/* ── Club Achievements (leader or admin) ── */}
        {((isLeader && ownedClub) || isAdmin) && (
          <TabsContent value="club" className="mt-4">
            {isLeader && ownedClub && (
              <p className="mb-4 text-sm opacity-60">{ownedClub.name}</p>
            )}
            <AchievementGrid
              achievements={isAdmin ? allAchievements.filter((a) => clubMap.has(a.club_id)) : clubAchievements}
              clubMap={clubMap}
            />
          </TabsContent>
        )}

        {/* ── Club Badges with progress (leader) ── */}
        {isLeader && ownedClub && (
          <TabsContent value="club-badges" className="mt-4">
            <p className="mb-4 text-sm opacity-60">{ownedClub.name}</p>
            {clubProgress ? (
              <EngineProgressPanel progress={clubProgress} entityType="club" />
            ) : (
              <p className="text-sm opacity-60">Loading badges…</p>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
