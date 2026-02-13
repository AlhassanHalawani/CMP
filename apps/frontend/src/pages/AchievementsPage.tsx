import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function AchievementsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black">{t('achievements.title')}</h1>
        <Button variant="outline" onClick={() => window.open(`/api/achievements/user/1/report`, '_blank')}>
          {t('achievements.downloadReport')}
        </Button>
      </div>

      <Card>
        <CardContent>
          <p className="text-sm">{t('common.noData')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
