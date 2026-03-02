import { useState } from 'react';
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
import { Spinner } from '@/components/ui/spinner';
import { clubsApi } from '@/api/clubs';
import { eventsApi } from '@/api/events';
import { membershipsApi, type MembershipWithUser } from '@/api/memberships';
import { ClubFormDialog } from '@/components/clubs/ClubFormDialog';
import { useAppToast } from '@/contexts/ToastContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'active') return 'default';
  if (status === 'pending') return 'secondary';
  return 'outline';
}

function MembersTab({ clubId, canManage }: { clubId: number; canManage: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useAppToast();

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['clubs', clubId, 'members'],
    queryFn: () => membershipsApi.listMembers(clubId),
    enabled: canManage,
  });

  const approveMutation = useMutation({
    mutationFn: (userId: number) => membershipsApi.updateMembership(clubId, userId, 'active'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs', clubId, 'members'] });
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

  if (!canManage) return null;
  if (isLoading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;

  const members = membersData?.data ?? [];

  return (
    <div>
      {members.length === 0 ? (
        <p className="text-sm py-4">No members yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m: MembershipWithUser) => (
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
                <TableCell className="text-sm">{new Date(m.requested_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {m.status === 'pending' && (
                    <div className="flex gap-2">
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
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

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
  const { currentUser } = useCurrentUser();
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

  const { data: myMembership, isLoading: membershipLoading } = useQuery({
    queryKey: ['clubs', clubId, 'membership', 'me'],
    queryFn: () => membershipsApi.getMyMembership(clubId),
    enabled: !isAdmin && !isLeader,
  });

  const isClubOwner = isLeader && club?.leader_id === currentUser?.id;
  const canEdit = isAdmin || isClubOwner;
  const canManageMembers = isAdmin || isClubOwner;
  const showJoinLeave = !isAdmin && !isClubOwner;

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

  return (
    <div>
      <Link to="/clubs" className="text-sm font-bold underline mb-4 inline-block">{t('common.back')}</Link>
      <h1 className="mb-2 text-3xl font-black">{clubName}</h1>
      <p className="mb-6 text-lg">{language === 'ar' ? club.description_ar : club.description}</p>

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
      </div>

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
      </Tabs>
    </div>
  );
}
