import { useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ImageCard } from '@/components/ui/image-card';
import { clubsApi } from '@/api/clubs';
import { eventsApi } from '@/api/events';
import { membershipsApi, type MembershipWithUser } from '@/api/memberships';
import { clubFollowersApi } from '@/api/clubFollowers';
import { clubTasksApi, type ClubTask, type CreateTaskPayload, TaskStatus } from '@/api/clubTasks';
import { ClubFormDialog } from '@/components/clubs/ClubFormDialog';
import { useAppToast } from '@/contexts/ToastContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'active') return 'default';
  if (status === 'pending') return 'secondary';
  return 'outline';
}

function taskStatusBadgeVariant(status: TaskStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'done') return 'default';
  if (status === 'in_progress') return 'secondary';
  return 'outline';
}

// ── Members tab ──────────────────────────────────────────────────────────────

function MembersTab({ clubId, canManage }: { clubId: number; canManage: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useAppToast();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigningRoleFor, setAssigningRoleFor] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['clubs', clubId, 'members'],
    queryFn: () => membershipsApi.listMembers(clubId),
    enabled: canManage,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['member-roles'],
    queryFn: () => membershipsApi.getMemberRoles(),
  });

  const approveMutation = useMutation({
    mutationFn: (userId: number) => membershipsApi.updateMembership(clubId, userId, 'active'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'stats'] });
      showToast('Membership approved', 'The member has been approved.');
    },
    onError: () => showToast('Error', 'Failed to approve membership.'),
  });

  const declineMutation = useMutation({
    mutationFn: (userId: number) => membershipsApi.updateMembership(clubId, userId, 'inactive'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'members'] });
      showToast('Membership declined', 'The request has been declined.');
    },
    onError: () => showToast('Error', 'Failed to decline membership.'),
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string | null }) =>
      membershipsApi.assignRole(clubId, userId, { primary_role: role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'members'] });
      setAssigningRoleFor(null);
      setSelectedRole('');
      showToast('Role assigned', 'Member role updated.');
    },
    onError: () => showToast('Error', 'Failed to assign role.'),
  });

  if (!canManage) return null;
  if (isLoading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;

  const roles = rolesData?.data ?? [];
  let members = membersData?.data ?? [];

  if (statusFilter !== 'all') members = members.filter((m) => m.status === statusFilter);
  if (roleFilter !== 'all') members = members.filter((m) => m.primary_role === roleFilter);

  const pending = members.filter((m) => m.status === 'pending');
  const rest = members.filter((m) => m.status !== 'pending');
  const sorted = [...pending, ...rest];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm py-4 text-muted-foreground">No members match the current filters.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((m: MembershipWithUser) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarImage src={m.avatar_url ?? undefined} alt={m.name} />
                      <AvatarFallback>{m.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{m.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{m.email}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(m.status)}>{m.status}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {m.status === 'active' && assigningRoleFor === m.user_id ? (
                    <div className="flex items-center gap-2">
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="w-44 h-8">
                          <SelectValue placeholder="Pick role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No role</SelectItem>
                          {roles.map((r) => (
                            <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => assignRoleMutation.mutate({ userId: m.user_id, role: selectedRole === '__none__' ? null : selectedRole || null })}
                        disabled={assignRoleMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAssigningRoleFor(null); setSelectedRole(''); }}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <span>{roles.find((r) => r.key === m.primary_role)?.label ?? <span className="text-muted-foreground">—</span>}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{new Date(m.requested_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {m.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(m.user_id)}
                          disabled={approveMutation.isPending || declineMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => declineMutation.mutate(m.user_id)}
                          disabled={approveMutation.isPending || declineMutation.isPending}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                    {m.status === 'active' && assigningRoleFor !== m.user_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setAssigningRoleFor(m.user_id); setSelectedRole(m.primary_role ?? ''); }}
                      >
                        Assign Role
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ── Tasks tab ────────────────────────────────────────────────────────────────

function TasksTab({ clubId }: { clubId: number }) {
  const queryClient = useQueryClient();
  const { showToast } = useAppToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateTaskPayload>({ title: '' });

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['clubs', clubId, 'tasks', statusFilter],
    queryFn: () => clubTasksApi.listClubTasks(clubId, statusFilter !== 'all' ? { status: statusFilter } : {}),
  });

  const { data: assignableData } = useQuery({
    queryKey: ['clubs', clubId, 'members', 'assignable'],
    queryFn: () => membershipsApi.listAssignableMembers(clubId),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['member-roles'],
    queryFn: () => membershipsApi.getMemberRoles(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateTaskPayload) => clubTasksApi.createClubTask(clubId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'tasks'] });
      setCreateOpen(false);
      setForm({ title: '' });
      showToast('Task created', 'The task has been created.');
    },
    onError: () => showToast('Error', 'Failed to create task.'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      clubTasksApi.updateClubTask(clubId, taskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'tasks'] });
    },
    onError: () => showToast('Error', 'Failed to update task.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: number) => clubTasksApi.deleteClubTask(clubId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'tasks'] });
      showToast('Task deleted', 'The task has been removed.');
    },
    onError: () => showToast('Error', 'Failed to delete task.'),
  });

  const assignable = assignableData?.data ?? [];
  const roles = rolesData?.data ?? [];
  const tasks = tasksData?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateOpen(true)}>+ New Task</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Spinner size="lg" /></div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No tasks found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t: ClubTask) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.title}</TableCell>
                <TableCell className="text-sm">{t.assignee_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-sm">{roles.find((r) => r.key === t.role_key)?.label ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <Badge variant={t.priority === 'high' ? 'default' : 'outline'}>{t.priority}</Badge>
                </TableCell>
                <TableCell className="text-sm">{t.due_at ? new Date(t.due_at).toLocaleDateString() : '—'}</TableCell>
                <TableCell>
                  <Badge variant={taskStatusBadgeVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-wrap">
                    {t.status !== 'done' && t.status !== 'cancelled' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ taskId: t.id, status: 'done' })}>
                        Done
                      </Button>
                    )}
                    {t.status !== 'cancelled' && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatusMutation.mutate({ taskId: t.id, status: 'cancelled' })}>
                        Cancel
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(t.id)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Assign a task to an active club member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title *"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Input
              placeholder="Description"
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || undefined }))}
            />
            <Select value={String(form.assigned_to ?? '')} onValueChange={(v) => setForm((f) => ({ ...f, assigned_to: v ? parseInt(v) : undefined }))}>
              <SelectTrigger>
                <SelectValue placeholder="Assign to member" />
              </SelectTrigger>
              <SelectContent>
                {assignable.map((m) => (
                  <SelectItem key={m.user_id} value={String(m.user_id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.role_key ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, role_key: v || undefined }))}>
              <SelectTrigger>
                <SelectValue placeholder="Suggested role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.priority ?? 'normal'} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as any }))}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={form.due_at ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, due_at: e.target.value || undefined }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.title || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { hasRole } = useAuth();
  const { showToast } = useAppToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clubId = parseInt(id!);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { currentUser, isLoading: currentUserLoading } = useCurrentUser();
  const isAdmin = hasRole('admin');
  const isLeader = hasRole('club_leader');

  const { data: club, isLoading } = useQuery({
    queryKey: ['clubs', clubId],
    queryFn: () => clubsApi.get(clubId),
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'club', clubId],
    queryFn: () => eventsApi.list({ club_id: clubId }),
  });

  const { data: stats } = useQuery({
    queryKey: ['clubs', clubId, 'stats'],
    queryFn: () => clubsApi.getStats(clubId),
  });

  const { data: recentEventsData } = useQuery({
    queryKey: ['events', 'club', clubId, 'recent'],
    queryFn: () => eventsApi.list({ club_id: clubId, status: 'published', limit: 3 }),
  });

  const { data: myMembership, isLoading: membershipLoading } = useQuery({
    queryKey: ['clubs', clubId, 'membership', 'me'],
    queryFn: () => membershipsApi.getMyMembership(clubId),
    enabled: !isAdmin && !isLeader,
  });

  const { data: myFollow } = useQuery({
    queryKey: ['clubs', clubId, 'follow', 'me'],
    queryFn: () => clubFollowersApi.getMyFollow(clubId),
    enabled: !isAdmin,
  });

  const isClubOwner = isLeader && club?.leader_id === currentUser?.id;
  const canEdit = isAdmin || isClubOwner;
  const canManageMembers = isAdmin || isClubOwner;
  const showJoinLeave = !isAdmin && !isClubOwner && !currentUserLoading;
  const showFollowToggle = !isAdmin && !currentUserLoading;
  const isFollowing = !!myFollow;

  const logoUploadMutation = useMutation({
    mutationFn: (file: File) => clubsApi.uploadLogo(clubId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId] });
      showToast('Logo updated', 'Club logo has been saved.');
    },
    onError: () => showToast('Error', 'Failed to upload logo.'),
  });

  const joinMutation = useMutation({
    mutationFn: () => membershipsApi.join(clubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'membership', 'me'] });
      showToast('Request sent', 'Your membership request has been submitted.');
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error) ? (error.response?.data?.error ?? 'Failed to join.') : 'Failed to join.';
      showToast('Error', message);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => membershipsApi.leave(clubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'membership', 'me'] });
      showToast('Left club', 'You have left the club.');
    },
    onError: () => showToast('Error', 'Failed to leave the club.'),
  });

  const followMutation = useMutation({
    mutationFn: () => clubFollowersApi.follow(clubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'follow', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'stats'] });
      showToast('Following', `You are now following ${clubName}.`);
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error) ? (error.response?.data?.error ?? 'Failed to follow.') : 'Failed to follow.';
      showToast('Error', message);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => clubFollowersApi.unfollow(clubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'follow', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'stats'] });
      showToast('Unfollowed', `You unfollowed ${clubName}.`);
    },
    onError: () => showToast('Error', 'Failed to unfollow.'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof clubsApi.update>[1]) => clubsApi.update(clubId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      await queryClient.invalidateQueries({ queryKey: ['clubs', clubId] });
      setEditOpen(false);
      setEditError('');
      showToast('Club updated', 'Club details were saved.');
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error) ? (error.response?.data?.error ?? 'Failed to update club.') : 'Failed to update club.';
      setEditError(message);
      showToast('Update failed', message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => clubsApi.delete(clubId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      showToast('Club deleted', 'The club has been removed.');
      navigate('/clubs');
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error) ? (error.response?.data?.error ?? 'Failed to delete club.') : 'Failed to delete club.';
      setDeleteError(message);
      showToast('Delete failed', message);
    },
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (!club) return <p>{t('common.noData')}</p>;

  const memberStatus = myMembership?.status;
  const clubName = language === 'ar' ? club.name_ar : club.name;
  const initials = club.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const recentEvents = recentEventsData?.data ?? [];

  return (
    <div>
      <Link to="/clubs" className="text-sm font-bold underline mb-4 inline-block">{t('common.back')}</Link>

      {/* Club header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="relative group">
          <Avatar className="size-20">
            <AvatarImage src={club.logo_url ?? undefined} alt={clubName} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          {canEdit && (
            <>
              <button
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploadMutation.isPending}
                title="Change logo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) logoUploadMutation.mutate(file);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </div>
        <div className="flex-1">
          <h1 className="mb-1 text-3xl font-black">{clubName}</h1>
          <p className="text-lg">{language === 'ar' ? club.description_ar : club.description}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        {canEdit && (
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              {t('common.edit')}
            </Button>
            {isAdmin && (
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                {t('common.delete')}
              </Button>
            )}
          </>
        )}

        {showJoinLeave && !membershipLoading && (
          <>
            {(!myMembership || memberStatus === 'inactive') && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={joinMutation.isPending}>Join Club</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Join {clubName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your request will be sent to the club manager for approval.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => joinMutation.mutate()}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {memberStatus === 'pending' && (
              <Badge variant="secondary">Request Pending</Badge>
            )}
            {memberStatus === 'active' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={leaveMutation.isPending}>Leave Club</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave {clubName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your membership will be set to inactive.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => leaveMutation.mutate()}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}

        {showFollowToggle && (
          isFollowing ? (
            <Button
              variant="ghost"
              onClick={() => unfollowMutation.mutate()}
              disabled={unfollowMutation.isPending}
            >
              Following ✓ — Unfollow
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
            >
              Follow
            </Button>
          )
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-8 md:grid-cols-4 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Published Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{stats.published_events}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{stats.total_attendance}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Members</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{stats.active_members}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Followers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{stats.followers_count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">New Followers (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{stats.new_followers_last_30_days}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Follower→Member %</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{stats.follower_to_member_conversion_rate}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent events showcase */}
      {recentEvents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-3">Recent Events</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {recentEvents.map((event) => (
              <Link key={event.id} to={`/events/${event.id}`}>
                <ImageCard
                  imageUrl={club.logo_url ?? `https://placehold.co/400x300?text=${encodeURIComponent(club.name)}`}
                  caption={language === 'ar' ? event.title_ar : event.title}
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      <ClubFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialValues={club}
        onSubmit={async (payload) => { await updateMutation.mutateAsync(payload); }}
        isSubmitting={updateMutation.isPending}
        errorMessage={editError}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.delete')} {clubName}</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm font-bold text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('common.loading') : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="events">
        <TabsList className="mb-4">
          <TabsTrigger value="events">{t('clubs.events')}</TabsTrigger>
          {canManageMembers && <TabsTrigger value="members">Members</TabsTrigger>}
          {canManageMembers && <TabsTrigger value="tasks">Tasks</TabsTrigger>}
        </TabsList>

        <TabsContent value="events">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {eventsData?.data.map((event) => (
              <Link key={event.id} to={`/events/${event.id}`}>
                <Card className="cursor-pointer hover:-translate-y-0.5 transition-transform">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>{language === 'ar' ? event.title_ar : event.title}</CardTitle>
                      <div className="flex gap-1 flex-shrink-0">
                        {event.members_only ? <Badge variant="outline">Members Only</Badge> : null}
                        <Badge variant={event.status === 'published' ? 'secondary' : 'outline'}>{event.status}</Badge>
                      </div>
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
        </TabsContent>

        {canManageMembers && (
          <TabsContent value="members">
            <MembersTab clubId={clubId} canManage={canManageMembers} />
          </TabsContent>
        )}

        {canManageMembers && (
          <TabsContent value="tasks">
            <TasksTab clubId={clubId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
