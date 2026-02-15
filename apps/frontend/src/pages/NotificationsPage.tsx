import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { notificationsApi } from '@/api/notifications';

export function NotificationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black">
          {t('nav.notifications')}
          {data?.unread ? <Badge variant="default" className="ml-3">{data.unread}</Badge> : null}
        </h1>
        {data?.unread ? (
          <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate()}>
            Mark all read
          </Button>
        ) : null}
      </div>

      {data?.data.length === 0 ? (
        <p>{t('common.noData')}</p>
      ) : (
        <div className="space-y-3">
          {data?.data.map((n) => (
            <Card key={n.id} className={n.is_read ? 'opacity-60' : ''}>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="font-bold">{n.title}</span>
                  <Badge variant={n.is_read ? 'outline' : 'accent'}>{n.type}</Badge>
                </div>
                {n.body && <p className="mt-1 text-sm">{n.body}</p>}
                <p className="mt-1 text-xs opacity-60">{new Date(n.created_at).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
