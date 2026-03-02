import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { notificationsApi, type NotificationPreference } from '@/api/notifications';

const PREF_TYPES: { key: string; label: string }[] = [
  { key: 'event_approved', label: 'Event Approved / Rejected' },
  { key: 'registration_confirmed', label: 'Registration Confirmed' },
  { key: 'membership_approved', label: 'Membership Approved / Declined' },
  { key: 'event_reminder', label: 'Event Reminder (24h before)' },
  { key: 'membership_requested', label: 'New Membership Request (leaders)' },
];

function getPrefEnabled(prefs: NotificationPreference[], eventType: string, channel: 'in_app' | 'email'): boolean {
  const row = prefs.find((p) => p.event_type === eventType && p.channel === channel);
  // Default: in_app enabled, email disabled
  if (!row) return channel === 'in_app';
  return row.enabled === 1;
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
            Notifications {data?.unread ? `(${data.unread} unread)` : ''}
          </TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <div className="mt-4 mb-4 flex justify-end">
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
        </TabsContent>

        <TabsContent value="preferences">
          {prefsLoading ? (
            <div className="flex justify-center p-8"><Spinner size="lg" /></div>
          ) : (
            <div className="mt-4">
              <p className="text-sm mb-4 opacity-70">
                Toggle which notification types you receive and through which channels.
                Email is disabled by default.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left py-2 pr-4 font-heading">Event</th>
                      <th className="py-2 px-4 font-heading text-center">In-App</th>
                      <th className="py-2 px-4 font-heading text-center">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PREF_TYPES.map(({ key, label }) => (
                      <tr key={key} className="border-b border-border">
                        <td className="py-3 pr-4">{label}</td>
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
