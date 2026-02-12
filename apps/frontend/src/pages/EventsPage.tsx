import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { eventsApi } from '@/api/events';

export function EventsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data: allEvents, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.list({ limit: 50 }),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  const published = allEvents?.data.filter((e) => e.status === 'published') || [];
  const upcoming = published.filter((e) => new Date(e.starts_at) > new Date());
  const past = published.filter((e) => new Date(e.starts_at) <= new Date());

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">{t('events.title')}</h1>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">{t('events.upcoming')} ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">{t('events.past')} ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <EventGrid events={upcoming} language={language} />
        </TabsContent>
        <TabsContent value="past">
          <EventGrid events={past} language={language} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventGrid({ events, language }: { events: any[]; language: string }) {
  const { t } = useTranslation();

  if (events.length === 0) return <p className="mt-4 text-sm">{t('common.noData')}</p>;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <Link key={event.id} to={`/events/${event.id}`}>
          <Card className="h-full cursor-pointer hover:-translate-y-0.5 transition-transform">
            <CardHeader>
              <CardTitle>{language === 'ar' ? event.title_ar : event.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm line-clamp-2 mb-2">
                {language === 'ar' ? event.description_ar : event.description}
              </p>
              <div className="flex gap-2 flex-wrap">
                {event.location && <Badge variant="accent">{event.location}</Badge>}
                <Badge variant="secondary">{new Date(event.starts_at).toLocaleDateString()}</Badge>
                {event.capacity && <Badge variant="outline">{event.capacity} seats</Badge>}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
