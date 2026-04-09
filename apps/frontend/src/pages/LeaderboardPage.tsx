import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
import { kpiApi } from '@/api/kpi';
import { useAuth } from '@/contexts/AuthContext';

const clubChartConfig: ChartConfig = {
  total_score: {
    label: 'Score',
    color: 'var(--color-main, #facc15)',
  },
};

const studentChartConfig: ChartConfig = {
  engagement_score: {
    label: 'Engagement',
    color: 'var(--color-main, #facc15)',
  },
};

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function LeaderboardPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canViewStudents = hasRole('admin') || hasRole('club_leader');

  const { data: clubData, isLoading: clubLoading } = useQuery({
    queryKey: ['kpi', 'leaderboard'],
    queryFn: () => kpiApi.getLeaderboard(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: studentData, isLoading: studentLoading } = useQuery({
    queryKey: ['kpi', 'students'],
    queryFn: () => kpiApi.getStudentKpi(),
    enabled: canViewStudents,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const clubs = clubData?.data ?? [];
  const students = studentData?.data ?? [];
  const maxScore = clubs[0]?.total_score ?? 0;
  const maxEngagement = students[0]?.engagement_score ?? 0;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">{t('kpi.leaderboard')}</h1>

      <Tabs defaultValue="clubs">
        <TabsList>
          <TabsTrigger value="clubs">{t('kpi.clubs', 'Clubs')}</TabsTrigger>
          {canViewStudents && (
            <TabsTrigger value="students">{t('kpi.students', 'Students')}</TabsTrigger>
          )}
        </TabsList>

        {/* ── Clubs tab ── */}
        <TabsContent value="clubs">
          {clubLoading ? (
            <div className="flex justify-center p-12"><Spinner size="lg" /></div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>{t('kpi.leaderboardChart')}</CardTitle></CardHeader>
                <CardContent>
                  {clubs.length === 0 ? (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-sm opacity-50">{t('kpi.noClubsYet', 'No clubs yet')}</p>
                    </div>
                  ) : (
                    <ChartContainer config={clubChartConfig} className="h-[300px] w-full">
                      <BarChart data={clubs} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid horizontal={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="club_name" width={75} tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="total_score" fill="var(--color-total_score)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>{t('kpi.rankings')}</CardTitle></CardHeader>
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
                      {clubs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-sm opacity-50">
                            {t('kpi.noActivityRecorded', 'No activity recorded yet')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        clubs.map((entry) => (
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
                              <Badge variant="accent" className="text-sm px-2 py-0.5">{entry.total_score}</Badge>
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

        {/* ── Students tab ── */}
        {canViewStudents && (
          <TabsContent value="students">
            {studentLoading ? (
              <div className="flex justify-center p-12"><Spinner size="lg" /></div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>{t('kpi.studentEngagement', 'Student Engagement')}</CardTitle></CardHeader>
                  <CardContent>
                    {students.length === 0 ? (
                      <div className="flex h-[300px] items-center justify-center">
                        <p className="text-sm opacity-50">{t('kpi.noStudentsYet', 'No students yet')}</p>
                      </div>
                    ) : (
                      <ChartContainer config={studentChartConfig} className="h-[300px] w-full">
                        <BarChart data={students.slice(0, 15)} layout="vertical" margin={{ left: 110 }}>
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 11 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="engagement_score" fill="var(--color-engagement_score)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>{t('kpi.studentRankings', 'Student Rankings')}</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">{t('kpi.rank', 'Rank')}</TableHead>
                          <TableHead>{t('kpi.student', 'Student')}</TableHead>
                          <TableHead className="text-right">{t('kpi.attendance', 'Attend.')}</TableHead>
                          <TableHead className="text-right">{t('kpi.achievements', 'Achiev.')}</TableHead>
                          <TableHead className="text-right">{t('kpi.score', 'Score')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-8 text-center text-sm opacity-50">
                              {t('kpi.noStudentsYet', 'No students yet')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          students.map((entry) => (
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
                                  value={maxEngagement > 0 ? (entry.engagement_score / maxEngagement) * 100 : 0}
                                  className="mt-1 h-1.5"
                                />
                              </TableCell>
                              <TableCell className="text-right text-sm">{entry.attendance_count}</TableCell>
                              <TableCell className="text-right text-sm">{entry.achievement_count}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="accent" className="text-sm px-2 py-0.5">
                                  {entry.engagement_score}
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
