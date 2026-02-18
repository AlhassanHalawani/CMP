import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { kpiApi } from '@/api/kpi';
import { adminApi } from '@/api/admin';
import { clubsApi } from '@/api/clubs';

const BAR_COLORS = [
  'var(--color-main, #facc15)',
  'var(--color-secondary-background, #e0e0e0)',
  '#60a5fa',
  '#f472b6',
  '#34d399',
];

const leaderboardChartConfig: ChartConfig = {
  total_score: {
    label: 'Score',
    color: 'var(--color-main, #facc15)',
  },
};

export function KpiPage() {
  const { t } = useTranslation();
  const [selectedSemester, setSelectedSemester] = useState<number | undefined>();
  const [selectedClub, setSelectedClub] = useState<number | undefined>();

  const { data: semesters } = useQuery({
    queryKey: ['admin', 'semesters'],
    queryFn: () => adminApi.listSemesters(),
  });

  const { data: clubs } = useQuery({
    queryKey: ['clubs', 'kpi-selector'],
    queryFn: () => clubsApi.list({ limit: 200 }),
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['kpi', 'leaderboard', selectedSemester],
    queryFn: () => kpiApi.getLeaderboard(selectedSemester),
  });

  const { data: clubSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['kpi', 'club', selectedClub, selectedSemester],
    queryFn: () => kpiApi.getClubSummary(selectedClub!, selectedSemester),
    enabled: !!selectedClub,
  });

  const leaderboardData = leaderboard?.data ?? [];
  const summaryData = clubSummary?.data ?? [];

  const summaryChartConfig: ChartConfig = summaryData.reduce<ChartConfig>(
    (acc, item, i) => {
      acc[item.metric_key] = {
        label: item.metric_key,
        color: BAR_COLORS[i % BAR_COLORS.length],
      };
      return acc;
    },
    {},
  );

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">{t('kpi.title')}</h1>

      {/* Semester filter */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold">{t('kpi.filterBySemester')}:</span>
        <button
          className={`px-3 py-1 text-sm font-bold border-2 border-[var(--border)] rounded-base transition-all ${
            !selectedSemester
              ? 'bg-[var(--main)] text-[var(--main-foreground)] shadow-shadow'
              : 'bg-[var(--background)] hover:bg-[var(--overlay)]'
          }`}
          onClick={() => setSelectedSemester(undefined)}
        >
          {t('kpi.allTime')}
        </button>
        {semesters?.data.map((s) => (
          <button
            key={s.id}
            className={`px-3 py-1 text-sm font-bold border-2 border-[var(--border)] rounded-base transition-all ${
              selectedSemester === s.id
                ? 'bg-[var(--main)] text-[var(--main-foreground)] shadow-shadow'
                : 'bg-[var(--background)] hover:bg-[var(--overlay)]'
            }`}
            onClick={() => setSelectedSemester(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <Tabs defaultValue="leaderboard">
        <TabsList>
          <TabsTrigger value="leaderboard">{t('kpi.leaderboard')}</TabsTrigger>
          <TabsTrigger value="club">{t('kpi.clubBreakdown')}</TabsTrigger>
        </TabsList>

        {/* Leaderboard tab */}
        <TabsContent value="leaderboard">
          {leaderboardLoading ? (
            <div className="flex justify-center p-12"><Spinner size="lg" /></div>
          ) : leaderboardData.length === 0 ? (
            <p className="mt-4">{t('common.noData')}</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Bar chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('kpi.leaderboardChart')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={leaderboardChartConfig} className="h-[300px] w-full">
                    <BarChart data={leaderboardData} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="club_name" width={75} tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="total_score" fill="var(--color-total_score)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Ranked list */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('kpi.rankings')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leaderboardData.map((entry, i) => (
                      <div
                        key={entry.club_id}
                        className="flex items-center gap-3 border-2 border-[var(--border)] rounded-base p-3"
                      >
                        <span className="text-2xl font-black w-8 text-center">{i + 1}</span>
                        <span className="flex-1 font-bold">{entry.club_name}</span>
                        <Badge variant="accent" className="text-lg px-3 py-1">
                          {entry.total_score}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Club breakdown tab */}
        <TabsContent value="club">
          <div className="mt-4 mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold">{t('kpi.selectClub')}:</span>
            {clubs?.data.map((c) => (
              <button
                key={c.id}
                className={`px-3 py-1 text-sm font-bold border-2 border-[var(--border)] rounded-base transition-all ${
                  selectedClub === c.id
                    ? 'bg-[var(--main)] text-[var(--main-foreground)] shadow-shadow'
                    : 'bg-[var(--background)] hover:bg-[var(--overlay)]'
                }`}
                onClick={() => setSelectedClub(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>

          {!selectedClub ? (
            <p>{t('kpi.selectClubPrompt')}</p>
          ) : summaryLoading ? (
            <div className="flex justify-center p-12"><Spinner size="lg" /></div>
          ) : summaryData.length === 0 ? (
            <p>{t('common.noData')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Pie chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('kpi.metricsBreakdown')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={summaryChartConfig} className="h-[300px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={summaryData.map((s) => ({ name: s.metric_key, value: s.total }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        strokeWidth={2}
                      >
                        {summaryData.map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Metric cards */}
              <div className="space-y-3">
                {summaryData.map((metric) => (
                  <Card key={metric.metric_key}>
                    <CardContent className="flex items-center justify-between py-4">
                      <span className="font-bold">{metric.metric_key}</span>
                      <Badge variant="accent" className="text-lg px-3 py-1">
                        {metric.total}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
