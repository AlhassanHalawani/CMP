import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { clubsApi } from '@/api/clubs';

export function ClubsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => clubsApi.list(),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">{t('clubs.title')}</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((club) => (
          <Link key={club.id} to={`/clubs/${club.id}`}>
            <Card className="h-full transition-transform hover:-translate-y-1 cursor-pointer">
              <CardHeader>
                <CardTitle>{language === 'ar' ? club.name_ar : club.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm line-clamp-3">
                  {language === 'ar' ? club.description_ar : club.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {data?.data.length === 0 && <p>{t('common.noData')}</p>}
      </div>
    </div>
  );
}
