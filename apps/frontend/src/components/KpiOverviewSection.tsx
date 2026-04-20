import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { kpiApi, type TopClubEntry } from '@/api/kpi';

const eventsChartConfig: ChartConfig = {
  value: { label: 'Events', color: 'var(--color-main, #facc15)' },
};

const attendanceChartConfig: ChartConfig = {
  value: { label: 'Attendance', color: 'var(--color-chart-2, #60a5fa)' },
};

interface Props {
  clubId?: number;
  showRankings?: boolean;
}

export function KpiOverviewSection({ clubId, showRankings = false }: Props) {
  const { t } = useTranslation();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['kpi', 'overview', clubId ?? 'platform'],
    queryFn: () => kpiApi.getOverview(clubId ? { club_id: clubId } : undefined),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
  }

  if (!overview) return null;

  const { summary, series, rankings } = overview;

  const summaryCards = clubId
    ? [
        { label: t('kpi.eventsLast6Months'), value: summary.events_count },
        { label: t('kpi.attendanceLast6Months'), value: summary.attendance_count },
        { label: t('kpi.uniqueAttendees'), value: summary.unique_attendees },
        { label: t('kpi.avgAttendancePerEvent'), value: summary.avg_attendance_per_event.toFixed(1) },
      ]
    : [
        { label: t('kpi.eventsLast6Months'), value: summary.events_count },
        { label: t('kpi.attendanceLast6Months'), value: summary.attendance_count },
        { label: t('kpi.uniqueAttendees'), value: summary.unique_attendees },
        { label: t('kpi.attendanceRate'), value: `${summary.attendance_rate}%` },
        { label: t('kpi.activeClubs'), value: summary.active_clubs },
      ];

  return (
    <div className="mb-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs opacity-60">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{card.value}</p>
              <p className="text-xs opacity-40">{t('kpi.last6Months')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle>{t('kpi.eventsOverview')}</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={eventsChartConfig} className="h-[200px] w-full">
              <BarChart data={series.events_by_month}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('kpi.attendanceTrend')}</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={attendanceChartConfig} className="h-[200px] w-full">
              <AreaChart data={series.attendance_by_month}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  fill="var(--color-value)"
                  fillOpacity={0.25}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rankings — admin/platform view only */}
      {showRankings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RankingCard
            title={t('kpi.topClubsByEvents')}
            entries={rankings.top_clubs_by_events}
            unit={t('kpi.events', 'events')}
          />
          <RankingCard
            title={t('kpi.topClubsByAttendance')}
            entries={rankings.top_clubs_by_attendance}
            unit={t('kpi.attendance')}
          />
        </div>
      )}
    </div>
  );
}

function RankingCard({ title, entries, unit }: { title: string; entries: TopClubEntry[]; unit: string }) {
  const { t } = useTranslation();
  const max = entries[0]?.value ?? 0;

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm opacity-50">{t('kpi.noActivityRecorded', 'No activity recorded yet')}</p>
        ) : (
          entries.map((entry, i) => (
            <div key={entry.club_id} className="flex items-center gap-3">
              <span className="w-5 text-center text-sm font-black opacity-50">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold truncate">{entry.club_name}</span>
                  <Badge variant="accent" className="shrink-0 text-xs">{entry.value} {unit}</Badge>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[var(--bg)] border border-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--main)]"
                    style={{ width: max > 0 ? `${(entry.value / max) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
