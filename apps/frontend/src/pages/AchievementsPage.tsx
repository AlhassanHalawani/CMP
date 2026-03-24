import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/api/admin';
import { clubsApi } from '@/api/clubs';
import { achievementsApi } from '@/api/achievements';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function AchievementsPage() {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();

  const [semesterId, setSemesterId] = useState<string>('');
  const [clubId, setClubId] = useState<string>('');
  const [downloading, setDownloading] = useState(false);

  const { data: semestersData } = useQuery({
    queryKey: ['semesters'],
    queryFn: () => adminApi.listSemesters(),
  });

  const { data: clubsData } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => clubsApi.list(),
  });

  const { data: achievementsData } = useQuery({
    queryKey: ['achievements', 'user', currentUser?.id],
    queryFn: () => achievementsApi.listForUser(currentUser!.id),
    enabled: !!currentUser,
  });

  const semesters = semestersData?.data ?? [];
  const clubs = clubsData?.data ?? [];
  const achievements = achievementsData?.data ?? [];

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black">{t('achievements.title')}</h1>
      </div>

      {/* Report download card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('achievements.reportTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="text-sm font-medium mb-1 block">{t('achievements.semester')}</label>
              <Select value={semesterId} onValueChange={setSemesterId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('achievements.allTerms')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('achievements.allTerms')}</SelectItem>
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[160px]">
              <label className="text-sm font-medium mb-1 block">{t('achievements.club')}</label>
              <Select value={clubId} onValueChange={setClubId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('achievements.allClubs')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('achievements.allClubs')}</SelectItem>
                  {clubs.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
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

      {/* Achievement cards */}
      {achievements.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  <Badge variant="neutral">Club #{a.club_id}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {a.description && (
                  <p className="text-sm text-muted-foreground mb-2">{a.description}</p>
                )}
                <p className="text-xs text-muted-foreground">{a.awarded_at.slice(0, 10)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
