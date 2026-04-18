import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { eventsApi } from '@/api/events';
import { clubsApi } from '@/api/clubs';
import { kpiApi } from '@/api/kpi';
import { analyticsApi } from '@/api/analytics';
import { gamificationApi } from '@/api/gamification';

// ─── Visitors Chart (admin only) ─────────────────────────────────────────────

type TrafficRange = '7d' | '30d' | '90d';

const visitorsChartConfig: ChartConfig = {
  desktop: { label: 'Desktop', color: 'var(--color-chart-1)' },
  mobile:  { label: 'Mobile',  color: 'var(--color-chart-2)' },
};

function VisitorsChart() {
  const [range, setRange] = useState<TrafficRange>('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'traffic', range],
    queryFn: () => analyticsApi.getTraffic(range),
    refetchInterval: 60_000,
  });

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Website Visitors</CardTitle>
            <CardDescription className="mt-1">
              Showing visitors for the selected time range
              {data && (
                <span className="ml-2 font-bold">
                  — {data.totals.visitors} visitors · {data.totals.page_views} page views
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {(['7d', '30d', '90d'] as TrafficRange[]).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? 'default' : 'outline'}
                onClick={() => setRange(r)}
              >
                {r}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center h-[200px] items-center"><Spinner /></div>
        ) : (
          <ChartContainer config={visitorsChartConfig} className="h-[200px] w-full">
            <AreaChart data={data?.series ?? []}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => {
                  const d = new Date(v + 'T00:00:00');
                  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                }}
                interval="preserveStartEnd"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="desktop" stackId="a" stroke="var(--color-desktop)" fill="var(--color-desktop)" fillOpacity={0.3} />
              <Area type="monotone" dataKey="mobile"  stackId="a" stroke="var(--color-mobile)"  fill="var(--color-mobile)"  fillOpacity={0.3} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

const statsChartConfig: ChartConfig = {
  value: {
    label: 'Count',
    color: 'var(--color-main, #facc15)',
  },
};

const leaderboardChartConfig: ChartConfig = {
  total_score: {
    label: 'Score',
    color: 'var(--color-main, #facc15)',
  },
};

// ─── Club Leader Dashboard ────────────────────────────────────────────────────

function ClubLeaderDashboard({ clubId }: { clubId: number }) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data: dash, isLoading } = useQuery({
    queryKey: ['clubs', clubId, 'dashboard'],
    queryFn: () => clubsApi.getDashboard(clubId),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['kpi', 'leaderboard', 'dashboard'],
    queryFn: () => kpiApi.getLeaderboard(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => eventsApi.list({ status: 'published', limit: 5 }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  const statsData = dash
    ? [
        { name: t('clubs.publishedEvents', 'Published Events'), value: dash.published_events },
        { name: t('clubs.totalAttendance', 'Total Attendance'), value: dash.total_attendance },
        { name: t('clubs.activeMembers', 'Members'), value: dash.active_members },
        { name: t('clubs.totalPoints', 'Points'), value: dash.total_points },
      ]
    : [];

  const leaderboardEntries = leaderboard?.data ?? [];

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">{t('clubs.publishedEvents', 'Published Events')}</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-black">{dash?.published_events ?? '…'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">{t('clubs.activeMembers', 'Members')}</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-black">{dash?.active_members ?? '…'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">{t('clubs.totalAttendance', 'Attendance')}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-black">{dash?.total_attendance ?? '…'}</p>
            {dash && <p className="text-xs opacity-60 mt-1">{dash.attendance_rate}% rate</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">{t('clubs.totalPoints', 'Points')}</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-black">{dash?.total_points ?? '…'}</p></CardContent>
        </Card>
      </div>

      {/* Stats chart + leaderboard */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <Card>
          <CardHeader><CardTitle>{t('dashboard.quickStats')}</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={statsChartConfig} className="h-[200px] w-full">
              <BarChart data={statsData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('kpi.leaderboard')}</CardTitle>
              <Link to="/leaderboard" className="text-sm font-bold underline">{t('common.viewAll')}</Link>
            </div>
          </CardHeader>
          <CardContent>
            {leaderboardEntries.length === 0 ? (
              <p className="text-sm opacity-50">{t('kpi.noActivityRecorded', 'No activity recorded yet')}</p>
            ) : (
              <ChartContainer config={leaderboardChartConfig} className="h-[200px] w-full">
                <BarChart data={leaderboardEntries.slice(0, 5)} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="club_name" width={75} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total_score" fill="var(--color-total_score)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming events */}
      <h2 className="mb-4 text-xl font-black">{t('dashboard.upcomingEvents')}</h2>
      {eventsLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {eventsData?.data.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`}>
              <Card className="hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer">
                <CardHeader>
                  <CardTitle>{language === 'ar' ? event.title_ar : event.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{language === 'ar' ? event.description_ar : event.description}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="accent">{event.location}</Badge>
                    <Badge variant="secondary">{new Date(event.starts_at).toLocaleDateString()}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {eventsData?.data.length === 0 && <p className="text-sm">{t('common.noData')}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Admin / Student Dashboard ────────────────────────────────────────────────

function GlobalDashboard() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { hasRole } = useAuth();
  const { currentUser } = useCurrentUser();
  const canViewKpi = hasRole('admin') || hasRole('club_leader');
  const isStudent = !hasRole('admin') && !hasRole('club_leader');

  const { data: gamification } = useQuery({
    queryKey: ['gamification', 'me'],
    queryFn: () => gamificationApi.getMyGamification(),
    enabled: isStudent && !!currentUser,
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => eventsApi.list({ status: 'published', limit: 5 }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: clubsData } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => clubsApi.list({ limit: 10 }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['kpi', 'leaderboard', 'dashboard'],
    queryFn: () => kpiApi.getLeaderboard(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    enabled: canViewKpi,
  });

  const statsData = [
    { name: t('nav.clubs'), value: clubsData?.total ?? 0 },
    { name: t('nav.events'), value: eventsData?.total ?? 0 },
    { name: t('dashboard.upcomingEvents'), value: eventsData?.data.length ?? 0 },
  ];

  const leaderboardEntries = leaderboard?.data ?? [];

  return (
    <div>
      {hasRole('admin') && <VisitorsChart />}

      {/* Gamification summary — students only */}
      {isStudent && gamification && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-bold opacity-70">Level </span>
                <span className="text-2xl font-black text-[var(--main)]">{gamification.current_level}</span>
                <span className="text-sm opacity-50 ml-2">· {gamification.current_xp} XP</span>
              </div>
              <span className="text-xs opacity-50">
                {gamification.xp_to_next_level > 0
                  ? `${gamification.xp_to_next_level} XP to Lv.${gamification.current_level + 1}`
                  : 'Max level'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--bg)] border border-border overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--main)] transition-all"
                style={{ width: `${gamification.progress_percent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>{t('dashboard.quickStats')}</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={statsChartConfig} className="h-[200px] w-full">
                <BarChart data={statsData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t('nav.clubs')}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-4xl font-black">{clubsData?.total ?? '…'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('nav.events')}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-4xl font-black">{eventsData?.total ?? '…'}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {canViewKpi && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">{t('kpi.leaderboard')}</h2>
            <Link to="/leaderboard" className="text-sm font-bold underline">{t('common.viewAll')}</Link>
          </div>
          {leaderboardEntries.length === 0 ? (
            <p className="text-sm opacity-50">{t('kpi.noActivityRecorded', 'No activity recorded yet')}</p>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <ChartContainer config={leaderboardChartConfig} className="h-[180px] w-full">
                  <BarChart data={leaderboardEntries.slice(0, 5)} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="club_name" width={75} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total_score" fill="var(--color-total_score)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <h2 className="mb-4 text-xl font-black">{t('dashboard.upcomingEvents')}</h2>
      {eventsLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {eventsData?.data.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`}>
              <Card className="hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer">
                <CardHeader>
                  <CardTitle>{language === 'ar' ? event.title_ar : event.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{language === 'ar' ? event.description_ar : event.description}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="accent">{event.location}</Badge>
                    <Badge variant="secondary">{new Date(event.starts_at).toLocaleDateString()}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {eventsData?.data.length === 0 && <p className="text-sm">{t('common.noData')}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Role formatter ──────────────────────────────────────────────────────────

function formatRole(role: string): string {
  switch (role) {
    case 'admin': return 'Admin';
    case 'club_leader': return 'Club Leader';
    case 'student': return 'Student';
    default: return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

// ─── Page root ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const { currentUser } = useCurrentUser();
  const { data: clubsData } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => clubsApi.list({ limit: 200 }),
    enabled: hasRole('club_leader'),
  });

  const isLeader = hasRole('club_leader') && !hasRole('admin');
  const ownedClub = isLeader && currentUser
    ? (clubsData?.data ?? []).find((c) => c.leader_id === currentUser.id)
    : undefined;

  return (
    <div>
      <h1 className="mb-1 text-3xl font-black">
        {t('dashboard.welcome')}, {user?.name || 'User'}
      </h1>
      {currentUser?.role && (
        <p className="mb-6 text-sm font-bold text-[var(--main)]">
          {t('dashboard.role', 'Role')}: {formatRole(currentUser.role)}
        </p>
      )}
      {ownedClub ? (
        <>
          <p className="mb-6 text-sm opacity-60">{ownedClub.name}</p>
          <ClubLeaderDashboard clubId={ownedClub.id} />
        </>
      ) : (
        <GlobalDashboard />
      )}
    </div>
  );
}
