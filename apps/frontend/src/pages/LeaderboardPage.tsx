import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { kpiApi } from '@/api/kpi';

export function LeaderboardPage() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['kpi', 'leaderboard'],
    queryFn: () => kpiApi.getLeaderboard(),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">{t('kpi.leaderboard')}</h1>

      {data?.data.length === 0 ? (
        <p>{t('common.noData')}</p>
      ) : (
        <div className="space-y-3">
          {data?.data.map((entry, i) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
