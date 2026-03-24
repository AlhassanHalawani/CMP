import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useAuth } from '@/contexts/AuthContext';

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

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function KpiPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const queryClient = useQueryClient();

  const [selectedSemester, setSelectedSemester] = useState<number | undefined>();
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>();
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
    queryKey: ['kpi', 'leaderboard', selectedSemester, selectedDepartment],
    queryFn: () => kpiApi.getLeaderboard(selectedSemester, selectedDepartment),
  });

  const { data: clubSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['kpi', 'club', selectedClub, selectedSemester],
    queryFn: () => kpiApi.getClubSummary(selectedClub!, selectedSemester),
    enabled: !!selectedClub,
  });

  const computeMutation = useMutation({
    mutationFn: () => kpiApi.computeKpi(selectedSemester!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi', 'leaderboard'] });
    },
  });

  const leaderboardData = leaderboard?.data ?? [];
  const summaryData = clubSummary?.data ?? [];
  const maxScore = leaderboardData[0]?.total_score ?? 1;

  // Unique departments from clubs list
  const departments = Array.from(
    new Set((clubs?.data ?? []).map((c: any) => c.department).filter(Boolean)),
  ) as string[];

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

  // Active semester name for compute button context
  const activeSemesterName = semesters?.data.find((s) => s.id === selectedSemester)?.name;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">{t('kpi.title')}</h1>

      {/* Filters row */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Semester filter */}
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

        {/* Department filter */}
        {departments.length > 0 && (
          <div className="ml-4 flex items-center gap-2">
            <span className="text-sm font-bold">{t('kpi.filterByDepartment', 'Department')}:</span>
            <Select
              value={selectedDepartment ?? '__all__'}
              onValueChange={(v) => setSelectedDepartment(v === '__all__' ? undefined : v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t('kpi.allDepartments', 'All departments')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('kpi.allDepartments', 'All departments')}</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            disabled={!selectedSemester || computeMutation.isPending}
            onClick={() => computeMutation.mutate()}
            className="px-4 py-2 text-sm font-bold border-2 border-[var(--border)] rounded-base bg-[var(--main)] text-[var(--main-foreground)] shadow-shadow disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {computeMutation.isPending ? t('kpi.computing', 'Computing…') : t('kpi.computeKpis', 'Compute KPIs')}
          </button>
          {activeSemesterName && (
            <span className="text-sm text-[var(--foreground)] opacity-60">
              {t('kpi.computingFor', 'Computing for')}: {activeSemesterName}
            </span>
          )}
          {!selectedSemester && (
            <span className="text-sm opacity-50">{t('kpi.selectSemesterFirst', 'Select a semester first')}</span>
          )}
          {computeMutation.isSuccess && (
            <span className="text-sm font-bold text-green-600">
              ✓ {t('kpi.computeSuccess', 'KPIs updated')} ({computeMutation.data?.clubs_updated} clubs)
            </span>
          )}

          <div className="ml-auto flex gap-2">
            <a
              href={kpiApi.leaderboardExportUrl('csv', selectedSemester, selectedDepartment)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 text-sm font-bold border-2 border-[var(--border)] rounded-base bg-[var(--background)] hover:bg-[var(--overlay)] transition-all"
            >
              {t('kpi.exportCsv', 'Export CSV')}
            </a>
            <a
              href={kpiApi.leaderboardExportUrl('pdf', selectedSemester, selectedDepartment)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 text-sm font-bold border-2 border-[var(--border)] rounded-base bg-[var(--background)] hover:bg-[var(--overlay)] transition-all"
            >
              {t('kpi.exportPdf', 'Export PDF')}
            </a>
          </div>
        </div>
      )}

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

              {/* Ranked table */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('kpi.rankings')}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">{t('kpi.rank', 'Rank')}</TableHead>
                        <TableHead>{t('kpi.club', 'Club')}</TableHead>
                        <TableHead className="text-right">{t('kpi.attendance', 'Attend.')}</TableHead>
                        <TableHead className="text-right">{t('kpi.achievements', 'Achiev.')}</TableHead>
                        <TableHead className="text-right">{t('kpi.score', 'Score')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboardData.map((entry) => (
                        <TableRow key={entry.club_id}>
                          <TableCell className="font-black text-center">
                            {MEDAL[entry.rank] ?? (
                              <Badge variant="neutral" className="text-xs">{entry.rank}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold">{entry.club_name}</div>
                            {entry.department && (
                              <div className="text-xs opacity-50">{entry.department}</div>
                            )}
                            <Progress
                              value={maxScore > 0 ? (entry.total_score / maxScore) * 100 : 0}
                              className="mt-1 h-1.5"
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm">{entry.attendance_count}</TableCell>
                          <TableCell className="text-right text-sm">{entry.achievement_count}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="accent" className="text-sm px-2 py-0.5">
                              {entry.total_score}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Club breakdown tab */}
        <TabsContent value="club">
          <div className="mt-4 mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold">{t('kpi.selectClub')}:</span>
            {clubs?.data.map((c: any) => (
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
