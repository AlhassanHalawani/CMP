import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { kpiApi } from '@/api/kpi';

const chartConfig: ChartConfig = {
  total_score: {
    label: 'Score',
    color: 'var(--color-main, #facc15)',
  },
};

export function LeaderboardPage() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['kpi', 'leaderboard'],
    queryFn: () => kpiApi.getLeaderboard(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  const entries = data?.data ?? [];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">{t('kpi.leaderboard')}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart view */}
        <Card>
          <CardHeader>
            <CardTitle>{t('kpi.leaderboardChart')}</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-sm opacity-50">{t('kpi.noClubsYet', 'No clubs yet')}</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={entries} layout="vertical" margin={{ left: 80 }}>
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

        {/* Ranked list */}
        <div className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm opacity-50">{t('kpi.noActivityRecorded', 'No activity recorded yet')}</p>
          ) : (
            entries.map((entry, i) => (
              <Card key={entry.club_id} className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center border-r-2 border-[var(--border)] text-2xl font-black">
                  {i + 1}
                </div>
                <CardContent className="flex-1 py-3">
                  <span className="font-black text-lg">{entry.club_name}</span>
                </CardContent>
                <div className="px-4">
                  <Badge variant="accent" className="text-lg px-3 py-1">{entry.total_score}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
