import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { notificationsApi, parseNotificationActions, type NotificationPreference, type Notification } from '@/api/notifications';
import { membershipsApi } from '@/api/memberships';
import { useAppToast } from '@/contexts/ToastContext';

const PREF_KEYS = [
  'event_approved',
  'registration_confirmed',
  'membership_approved',
  'event_reminder',
  'membership_requested',
] as const;

function getPrefEnabled(prefs: NotificationPreference[], eventType: string, channel: 'in_app' | 'email'): boolean {
  const row = prefs.find((p) => p.event_type === eventType && p.channel === channel);
  if (!row) return channel === 'in_app';
  return row.enabled === 1;
}

function MembershipActions({ n, onMarkRead }: { n: Notification; onMarkRead: (id: number) => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useAppToast();
  const actions = parseNotificationActions(n);
  if (!actions || actions.type !== 'membership_request') return null;

  const approveMutation = useMutation({
    mutationFn: () => membershipsApi.updateMembership(actions.club_id, actions.requester_id, 'active'),
    onSuccess: () => {
      onMarkRead(n.id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showToast('Approved', `${actions.requester_name} has been approved.`);
    },
    onError: (err: unknown) => {
      const msg = isAxiosError(err) ? err.response?.data?.error ?? 'Failed to approve.' : 'Failed to approve.';
      showToast('Error', msg);
    },
  });

  const denyMutation = useMutation({
    mutationFn: () => membershipsApi.updateMembership(actions.club_id, actions.requester_id, 'inactive'),
    onSuccess: () => {
      onMarkRead(n.id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showToast('Denied', `${actions.requester_name}'s request was denied.`);
    },
    onError: (err: unknown) => {
      const msg = isAxiosError(err) ? err.response?.data?.error ?? 'Failed to deny.' : 'Failed to deny.';
      showToast('Error', msg);
    },
  });

  const isPending = approveMutation.isPending || denyMutation.isPending;

  return (
    <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" onClick={() => approveMutation.mutate()} disabled={isPending}>
        {approveMutation.isPending ? 'Approving…' : 'Approve'}
      </Button>
      <Button size="sm" variant="destructive" onClick={() => denyMutation.mutate()} disabled={isPending}>
        {denyMutation.isPending ? 'Denying…' : 'Deny'}
      </Button>
    </div>
  );
}

function NotificationCard({ n, onMarkRead }: { n: Notification; onMarkRead: (id: number) => void }) {
  const navigate = useNavigate();
  const actions = parseNotificationActions(n);
  const hasActions = actions?.type === 'membership_request';

  const handleClick = () => {
    if (!n.is_read) onMarkRead(n.id);
    if (n.target_url && !hasActions) navigate(n.target_url);
  };

  const isClickable = !!n.target_url && !hasActions;

  return (
    <Card
      className={`${n.is_read ? 'opacity-60' : ''} ${isClickable ? 'cursor-pointer hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all' : ''}`}
      onClick={isClickable ? handleClick : undefined}
    >
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="font-bold">{n.title}</span>
          <Badge variant={n.is_read ? 'outline' : 'accent'}>{n.type}</Badge>
        </div>
        {n.body && <p className="mt-1 text-sm">{n.body}</p>}
        <p className="mt-1 text-xs opacity-60">{new Date(n.created_at).toLocaleString()}</p>
        {hasActions && <MembershipActions n={n} onMarkRead={onMarkRead} />}
        {n.target_url && hasActions && (
          <button
            className="mt-2 text-xs underline opacity-60 hover:opacity-100"
            onClick={() => { if (!n.is_read) onMarkRead(n.id); navigate(n.target_url!); }}
          >
            View club members
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export function NotificationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
  });

  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.getPreferences(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const prefMutation = useMutation({
    mutationFn: (payload: { event_type: string; channel: 'in_app' | 'email'; enabled: boolean }) =>
      notificationsApi.updatePreference(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-preferences'] }),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  return (
    <div>
      <h1 className="text-3xl font-black mb-6">
        {t('nav.notifications')}
        {data?.unread ? <Badge variant="default" className="ml-3">{data.unread}</Badge> : null}
      </h1>

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">
            {t('notifications.tab')}
            {data?.unread ? ` ${t('notifications.unreadCount', { count: data.unread })}` : ''}
          </TabsTrigger>
          <TabsTrigger value="preferences">{t('notifications.preferencesTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <div className="mt-4 mb-4 flex justify-end">
            {data?.unread ? (
              <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate()}>
                {t('notifications.markAllRead')}
              </Button>
            ) : null}
          </div>

          {data?.data.length === 0 ? (
            <p>{t('common.noData')}</p>
          ) : (
            <div className="space-y-3">
              {data?.data.map((n) => (
                <NotificationCard key={n.id} n={n} onMarkRead={(id) => markReadMutation.mutate(id)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preferences">
          {prefsLoading ? (
            <div className="flex justify-center p-8"><Spinner size="lg" /></div>
          ) : (
            <div className="mt-4">
              <p className="text-sm mb-4 opacity-70">
                {t('notifications.preferencesIntro')}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left py-2 pr-4 font-heading">{t('notifications.prefEvent')}</th>
                      <th className="py-2 px-4 font-heading text-center">{t('notifications.prefInApp')}</th>
                      <th className="py-2 px-4 font-heading text-center">{t('notifications.prefEmail')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PREF_KEYS.map((key) => (
                      <tr key={key} className="border-b border-border">
                        <td className="py-3 pr-4">{t(`notifications.types.${key}`)}</td>
                        <td className="py-3 px-4 text-center">
                          <Switch
                            checked={getPrefEnabled(prefs ?? [], key, 'in_app')}
                            onCheckedChange={(checked) =>
                              prefMutation.mutate({ event_type: key, channel: 'in_app', enabled: checked })
                            }
                            disabled={prefMutation.isPending}
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Switch
                            checked={getPrefEnabled(prefs ?? [], key, 'email')}
                            onCheckedChange={(checked) =>
                              prefMutation.mutate({ event_type: key, channel: 'email', enabled: checked })
                            }
                            disabled={prefMutation.isPending}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
