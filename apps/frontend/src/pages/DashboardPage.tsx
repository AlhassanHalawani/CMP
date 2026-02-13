import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { eventsApi } from '@/api/events';
import { clubsApi } from '@/api/clubs';

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language } = useLanguage();

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => eventsApi.list({ status: 'published', limit: 5 }),
  });

  const { data: clubsData } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => clubsApi.list({ limit: 10 }),
  });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">
        {t('dashboard.welcome')}, {user?.name || 'User'}
      </h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
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
        <Card>
          <CardHeader><CardTitle>{t('dashboard.quickStats')}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm font-bold">{t('dashboard.upcomingEvents')}: {eventsData?.data.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-4 text-xl font-black">{t('dashboard.upcomingEvents')}</h2>
      {eventsLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {eventsData?.data.map((event) => (
            <Card key={event.id}>
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
          ))}
          {eventsData?.data.length === 0 && <p className="text-sm">{t('common.noData')}</p>}
        </div>
      )}
    </div>
  );
}
