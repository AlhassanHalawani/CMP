import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi } from '@/api/admin';

export function AdminPage() {
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });

  const { data: auditData } = useQuery({
    queryKey: ['admin', 'audit-log'],
    queryFn: () => adminApi.getAuditLog({ limit: 20 }),
  });

  const { data: semesterData } = useQuery({
    queryKey: ['admin', 'semesters'],
    queryFn: () => adminApi.listSemesters(),
  });

  if (statsLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">{t('admin.title')}</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader><CardTitle>{t('admin.users')}</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-black">{stats?.users}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('nav.clubs')}</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-black">{stats?.clubs}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('nav.events')}</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-black">{stats?.events}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">{t('admin.auditLog')}</TabsTrigger>
          <TabsTrigger value="semesters">{t('admin.semesters')}</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <div className="space-y-2">
            {auditData?.data.map((log) => (
              <Card key={log.id}>
                <CardContent className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-bold">{log.action}</span>
                    <span className="mx-2">&middot;</span>
                    <span>{log.entity_type} #{log.entity_id}</span>
                  </div>
                  <span className="text-xs opacity-60">{new Date(log.created_at).toLocaleString()}</span>
                </CardContent>
              </Card>
            ))}
            {auditData?.data.length === 0 && <p>{t('common.noData')}</p>}
          </div>
        </TabsContent>

        <TabsContent value="semesters">
          <div className="space-y-2">
            {semesterData?.data.map((sem) => (
              <Card key={sem.id}>
                <CardContent className="flex items-center justify-between py-2">
                  <span className="font-bold">{sem.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{sem.starts_at} — {sem.ends_at}</span>
                    {sem.is_active ? <Badge variant="secondary">Active</Badge> : null}
                  </div>
                </CardContent>
              </Card>
            ))}
            {semesterData?.data.length === 0 && <p>{t('common.noData')}</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
