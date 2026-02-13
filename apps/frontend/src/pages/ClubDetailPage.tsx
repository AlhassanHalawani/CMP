import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { clubsApi } from '@/api/clubs';
import { eventsApi } from '@/api/events';

export function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const clubId = parseInt(id!);

  const { data: club, isLoading } = useQuery({
    queryKey: ['clubs', clubId],
    queryFn: () => clubsApi.get(clubId),
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'club', clubId],
    queryFn: () => eventsApi.list({ club_id: clubId }),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (!club) return <p>{t('common.noData')}</p>;

  return (
    <div>
      <Link to="/clubs" className="text-sm font-bold underline mb-4 inline-block">{t('common.back')}</Link>
      <h1 className="mb-2 text-3xl font-black">{language === 'ar' ? club.name_ar : club.name}</h1>
      <p className="mb-6 text-lg">{language === 'ar' ? club.description_ar : club.description}</p>

      <h2 className="mb-4 text-xl font-black">{t('clubs.events')}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {eventsData?.data.map((event) => (
          <Link key={event.id} to={`/events/${event.id}`}>
            <Card className="cursor-pointer hover:-translate-y-0.5 transition-transform">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{language === 'ar' ? event.title_ar : event.title}</CardTitle>
                  <Badge variant={event.status === 'published' ? 'secondary' : 'outline'}>{event.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{event.location} &middot; {new Date(event.starts_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {eventsData?.data.length === 0 && <p className="text-sm">{t('common.noData')}</p>}
      </div>
    </div>
  );
}
