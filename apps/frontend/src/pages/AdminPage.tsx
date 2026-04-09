import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { adminApi, leaderRequestsApi } from '@/api/admin';
import { VisitorsChart } from '@/components/admin/VisitorsChart';
import { usersApi, type User } from '@/api/users';
import { clubsApi, type Club } from '@/api/clubs';
import { useAppToast } from '@/contexts/ToastContext';

// ─── Users tab ───────────────────────────────────────────────────────────────

function UsersTab() {
  const { showToast } = useAppToast();
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => usersApi.list({ limit: 200 }),
  });

  const { data: clubsData } = useQuery({
    queryKey: ['clubs', 'all'],
    queryFn: () => clubsApi.list({ limit: 200 }),
  });

  const [assignDialog, setAssignDialog] = useState<{ user: User } | null>(null);
  const [selectedClubId, setSelectedClubId] = useState('');

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => usersApi.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      showToast('Role updated', 'User role has been updated.');
    },
    onError: (err: unknown) => {
      const msg = isAxiosError(err) ? err.response?.data?.error : 'Failed to update role';
      showToast('Error', msg ?? 'Failed to update role');
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ clubId, userId }: { clubId: number; userId: number }) =>
      clubsApi.assignLeader(clubId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      setAssignDialog(null);
      setSelectedClubId('');
      showToast('Leader assigned', 'The user is now the club leader.');
    },
    onError: (err: unknown) => {
      const msg = isAxiosError(err) ? err.response?.data?.error : 'Failed to assign leader';
      showToast('Error', msg ?? 'Failed to assign leader');
    },
  });

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  const users = usersData?.data ?? [];
  const clubs: Club[] = clubsData?.data ?? [];

  const roleVariant: Record<string, 'default' | 'secondary' | 'outline' | 'neutral'> = {
    admin: 'default',
    club_leader: 'secondary',
    student: 'neutral',
  };

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <Card key={u.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-bold">{u.name}</p>
              <p className="text-xs opacity-60">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={roleVariant[u.role] ?? 'default'}>{u.role}</Badge>

              {/* Role selector */}
              <Select
                value={u.role}
                onValueChange={(role) => roleMutation.mutate({ id: u.id, role })}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="club_leader">Club Leader</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              {/* Assign as club leader */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setAssignDialog({ user: u }); setSelectedClubId(''); }}
              >
                Assign to Club
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {users.length === 0 && <p className="text-sm">No users found.</p>}

      {/* Assign leader dialog */}
      <Dialog open={!!assignDialog} onOpenChange={(o) => { if (!o) setAssignDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Club Leader</DialogTitle>
          </DialogHeader>
          <p className="text-sm mb-2">
            Assign <strong>{assignDialog?.user.name}</strong> as leader of:
          </p>
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a club…" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
            <Button
              disabled={!selectedClubId || assignMutation.isPending}
              onClick={() =>
                assignMutation.mutate({
                  clubId: parseInt(selectedClubId),
                  userId: assignDialog!.user.id,
                })
              }
            >
              {assignMutation.isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Leader Requests tab ──────────────────────────────────────────────────────

function LeaderRequestsTab() {
  const { showToast } = useAppToast();
  const queryClient = useQueryClient();
  const [reviewDialog, setReviewDialog] = useState<{ id: number; action: 'approve' | 'reject' } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'leader-requests'],
    queryFn: () => leaderRequestsApi.list(),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, notes }: { id: number; action: 'approve' | 'reject'; notes: string }) =>
      action === 'approve'
        ? leaderRequestsApi.approve(id, notes)
        : leaderRequestsApi.reject(id, notes),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'leader-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      setReviewDialog(null);
      setAdminNotes('');
      showToast(
        vars.action === 'approve' ? 'Request approved' : 'Request rejected',
        vars.action === 'approve'
          ? 'The user is now the club leader.'
          : 'The request has been rejected.'
      );
    },
    onError: (err: unknown) => {
      const msg = isAxiosError(err) ? err.response?.data?.error : 'Action failed';
      showToast('Error', msg ?? 'Action failed');
    },
  });

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  const requests = data?.data ?? [];
  const pending = requests.filter((r) => r.status === 'pending');
  const reviewed = requests.filter((r) => r.status !== 'pending');

  const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'neutral'> = {
    pending: 'secondary',
    approved: 'default',
    rejected: 'outline',
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-sm">Pending ({pending.length})</h3>
      {pending.length === 0 && <p className="text-sm opacity-60">No pending requests.</p>}
      {pending.map((req) => (
        <Card key={req.id}>
          <CardContent className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div>
              <p className="font-bold">{req.user_name}</p>
              <p className="text-xs opacity-60">{req.user_email}</p>
              <p className="text-sm mt-1">Requesting to lead: <strong>{req.club_name}</strong></p>
              {req.message && <p className="text-xs mt-1 italic">"{req.message}"</p>}
              <p className="text-xs opacity-50 mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => { setReviewDialog({ id: req.id, action: 'approve' }); setAdminNotes(''); }}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setReviewDialog({ id: req.id, action: 'reject' }); setAdminNotes(''); }}
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {reviewed.length > 0 && (
        <>
          <h3 className="font-bold text-sm mt-6">Reviewed ({reviewed.length})</h3>
          {reviewed.map((req) => (
            <Card key={req.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-bold">{req.user_name}</p>
                  <p className="text-sm">{req.club_name}</p>
                  {req.admin_notes && <p className="text-xs opacity-60 italic mt-1">{req.admin_notes}</p>}
                </div>
                <Badge variant={statusVariant[req.status] ?? 'default'}>{req.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* Review dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={(o) => { if (!o) setReviewDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.action === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Admin notes (optional)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button
              disabled={reviewMutation.isPending}
              onClick={() =>
                reviewMutation.mutate({
                  id: reviewDialog!.id,
                  action: reviewDialog!.action,
                  notes: adminNotes,
                })
              }
            >
              {reviewMutation.isPending
                ? 'Saving…'
                : reviewDialog?.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

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

      <div className="mb-8">
        <VisitorsChart />
      </div>

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

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">{t('admin.users')}</TabsTrigger>
          <TabsTrigger value="leader-requests">Club Leader Requests</TabsTrigger>
          <TabsTrigger value="audit">{t('admin.auditLog')}</TabsTrigger>
          <TabsTrigger value="semesters">{t('admin.semesters')}</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="leader-requests">
          <LeaderRequestsTab />
        </TabsContent>

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
