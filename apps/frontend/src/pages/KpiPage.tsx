import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { KpiOverviewSection } from '@/components/KpiOverviewSection';

const leaderboardChartConfig: ChartConfig = {
  attendance_count: {
    label: 'Attendance',
    color: 'var(--color-main, #facc15)',
  },
};

const studentChartConfig: ChartConfig = {
  xp_total: {
    label: 'XP',
    color: 'var(--color-main, #facc15)',
  },
};

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function KpiPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const queryClient = useQueryClient();
  const { currentUser } = useCurrentUser();

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
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: clubSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['kpi', 'club', selectedClub, selectedSemester],
    queryFn: () => kpiApi.getClubSummary(selectedClub!, selectedSemester),
    enabled: !!selectedClub,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: studentKpi, isLoading: studentLoading } = useQuery({
    queryKey: ['kpi', 'students', selectedSemester],
    queryFn: () => kpiApi.getStudentKpi(selectedSemester),
    enabled: isAdmin,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const computeMutation = useMutation({
    mutationFn: () => kpiApi.computeKpi(selectedSemester!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi'] });
    },
  });

  const leaderboardData = leaderboard?.data ?? [];
  const summaryData = clubSummary?.data ?? [];
  const studentData = studentKpi?.data ?? [];
  const maxAttendance = leaderboardData[0]?.attendance_count ?? 0;
  const maxXp = studentData[0]?.xp_total ?? 0;

  const isLeader = !isAdmin && hasRole('club_leader');
  const ownedClub = isLeader && currentUser
    ? (clubs?.data ?? []).find((c: any) => c.leader_id === currentUser.id)
    : undefined;
  const overviewClubId = isAdmin ? undefined : ownedClub?.id;

  const departments = Array.from(
    new Set((clubs?.data ?? []).map((c: any) => c.department).filter(Boolean)),
  ) as string[];

  const METRIC_LABELS: Record<string, string> = {
    attendance_count: t('kpi.attendance', 'Attendance'),
    member_count: t('kpi.members', 'Members'),
  };

  const PRIMARY_METRICS = ['attendance_count', 'member_count'];

  const metricMap = new Map(summaryData.map((s) => [s.metric_key, s.total]));

  const barData = PRIMARY_METRICS.map((key) => ({
    name: METRIC_LABELS[key] ?? key,
    value: metricMap.get(key) ?? 0,
  }));

  const summaryChartConfig: ChartConfig = {
    value: { label: 'Count', color: 'var(--color-main, #facc15)' },
  };

  const activeSemesterName = semesters?.data.find((s) => s.id === selectedSemester)?.name;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">{t('kpi.title')}</h1>

      {/* Filters row */}
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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('kpi.overview')}</TabsTrigger>
          <TabsTrigger value="leaderboard">{t('kpi.leaderboard')}</TabsTrigger>
          <TabsTrigger value="club">{t('kpi.clubBreakdown')}</TabsTrigger>
          {isAdmin && <TabsTrigger value="students">{t('kpi.students', 'Students')}</TabsTrigger>}
        </TabsList>

        {/* Overview tab — rolling 6-month live analytics */}
        <TabsContent value="overview">
          <div className="mt-4">
            <KpiOverviewSection clubId={overviewClubId} showRankings={isAdmin} />
          </div>
        </TabsContent>

        {/* Leaderboard tab — clubs ranked by attendance */}
        <TabsContent value="leaderboard">
          {leaderboardLoading ? (
            <div className="flex justify-center p-12"><Spinner size="lg" /></div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('kpi.leaderboardChart')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {leaderboardData.length === 0 ? (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-sm opacity-50">{t('kpi.noClubsYet', 'No clubs yet')}</p>
                    </div>
                  ) : (
                    <ChartContainer config={leaderboardChartConfig} className="h-[300px] w-full">
                      <BarChart data={leaderboardData} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid horizontal={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="club_name" width={75} tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="attendance_count" fill="var(--color-attendance_count)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

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
                        <TableHead className="text-right">{t('kpi.members', 'Members')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboardData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-sm opacity-50">
                            {t('kpi.noClubsYet', 'No clubs yet')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        leaderboardData.map((entry) => (
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
                                value={maxAttendance > 0 ? (entry.attendance_count / maxAttendance) * 100 : 0}
                                className="mt-1 h-1.5"
                              />
                            </TableCell>
                            <TableCell className="text-right text-sm">{entry.attendance_count}</TableCell>
                            <TableCell className="text-right text-sm">{entry.member_count}</TableCell>
                          </TableRow>
                        ))
                      )}
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
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('kpi.metricsBreakdown')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {barData.every((d) => d.value === 0) ? (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-sm opacity-50">{t('kpi.noActivityRecorded', 'No activity recorded yet')}</p>
                    </div>
                  ) : (
                    <ChartContainer config={summaryChartConfig} className="h-[300px] w-full">
                      <BarChart data={barData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-3">
                {barData.map((metric) => (
                  <Card key={metric.name}>
                    <CardContent className="flex items-center justify-between py-4">
                      <span className="font-bold">{metric.name}</span>
                      <Badge variant={metric.value > 0 ? 'accent' : 'neutral'} className="text-lg px-3 py-1">
                        {metric.value}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Students tab — admin only, ranked by XP */}
        {isAdmin && (
          <TabsContent value="students">
            {studentLoading ? (
              <div className="flex justify-center p-12"><Spinner size="lg" /></div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('kpi.studentXp', 'Student XP')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {studentData.length === 0 ? (
                      <div className="flex h-[300px] items-center justify-center">
                        <p className="text-sm opacity-50">{t('kpi.noStudentsYet', 'No students yet')}</p>
                      </div>
                    ) : (
                      <ChartContainer config={studentChartConfig} className="h-[300px] w-full">
                        <BarChart data={studentData.slice(0, 15)} layout="vertical" margin={{ left: 110 }}>
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 11 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="xp_total" fill="var(--color-xp_total)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('kpi.studentRankings', 'Student Rankings')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">{t('kpi.rank', 'Rank')}</TableHead>
                          <TableHead>{t('kpi.student', 'Student')}</TableHead>
                          <TableHead className="text-right">{t('kpi.attendance', 'Attend.')}</TableHead>
                          <TableHead className="text-right">{t('kpi.xp', 'XP')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-sm opacity-50">
                              {t('kpi.noStudentsYet', 'No students yet')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          studentData.map((entry) => (
                            <TableRow key={entry.user_id}>
                              <TableCell className="font-black text-center">
                                {MEDAL[entry.rank] ?? (
                                  <Badge variant="neutral" className="text-xs">{entry.rank}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="font-bold">{entry.name}</div>
                                <div className="text-xs opacity-50">{entry.email}</div>
                                <Progress
                                  value={maxXp > 0 ? (entry.xp_total / maxXp) * 100 : 0}
                                  className="mt-1 h-1.5"
                                />
                              </TableCell>
                              <TableCell className="text-right text-sm">{entry.attendance_count}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="accent" className="text-sm px-2 py-0.5">
                                  {entry.xp_total}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
