import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const statsChartConfig: ChartConfig = {
  value: {
    label: 'Count',
    color: 'var(--color-main, #facc15)',
  },
};

export function DashboardPage() {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const { language } = useLanguage();

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
  });

  const canViewKpi = hasRole('admin') || hasRole('club_leader');

  const statsData = [
    { name: t('nav.clubs'), value: clubsData?.total ?? 0 },
    { name: t('nav.events'), value: eventsData?.total ?? 0 },
    { name: t('dashboard.upcomingEvents'), value: eventsData?.data.length ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">
        {t('dashboard.welcome')}, {user?.name || 'User'}
      </h1>

      {/* Stats overview with chart */}
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

        {/* Stat cards */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t('nav.clubs')}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-4xl font-black">{clubsData?.total ?? '...'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('nav.events')}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-4xl font-black">{eventsData?.total ?? '...'}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top clubs (mini leaderboard) — always visible for kpi-capable roles */}
      {canViewKpi && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">{t('kpi.leaderboard')}</h2>
            <Link to="/kpi" className="text-sm font-bold underline">{t('common.viewAll')}</Link>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {leaderboard?.data && leaderboard.data.length > 0 ? (
              leaderboard.data.slice(0, 3).map((entry, i) => (
                <Card key={entry.club_id}>
                  <CardContent className="flex items-center gap-3 py-4">
                    <span className="text-2xl font-black">{i + 1}</span>
                    <span className="flex-1 font-bold">{entry.club_name}</span>
                    <Badge variant="accent">{entry.total_score}</Badge>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm opacity-50 col-span-3">
                {t('kpi.noActivityRecorded', 'No activity recorded yet')}
              </p>
            )}
          </div>
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
