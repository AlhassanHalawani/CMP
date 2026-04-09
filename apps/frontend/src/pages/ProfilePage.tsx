import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { usersApi } from '@/api/users';
import { clubsApi } from '@/api/clubs';
import { leaderRequestsApi } from '@/api/admin';
import { useAppToast } from '@/contexts/ToastContext';

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, role }: { name: string; role: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const colorMap: Record<string, string> = {
    admin: 'bg-red-500',
    club_leader: 'bg-blue-500',
    student: 'bg-green-500',
  };
  const bg = colorMap[role] ?? 'bg-gray-500';

  return (
    <div
      className={`${bg} flex items-center justify-center rounded-full text-white font-black text-2xl`}
      style={{ width: 80, height: 80 }}
    >
      {initials || '?'}
    </div>
  );
}

// ─── Club Leader Request section ──────────────────────────────────────────────

function LeaderRequestSection() {
  const { showToast } = useAppToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [message, setMessage] = useState('');

  const { data: clubsData } = useQuery({
    queryKey: ['clubs', 'for-leader-request'],
    queryFn: () => clubsApi.list({ limit: 200 }),
  });

  const { data: myRequestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['leader-requests', 'mine'],
    queryFn: leaderRequestsApi.mine,
  });

  const createMutation = useMutation({
    mutationFn: leaderRequestsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leader-requests', 'mine'] });
      setOpen(false);
      setSelectedClubId('');
      setMessage('');
      showToast('Request submitted', 'Your request has been sent to the admin for review.');
    },
    onError: (err: unknown) => {
      const msg = isAxiosError(err) ? err.response?.data?.error : 'Failed to submit request';
      showToast('Error', msg ?? 'Failed to submit request');
    },
  });

  const clubs = clubsData?.data ?? [];
  const myRequests = myRequestsData?.data ?? [];

  const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'neutral'> = {
    pending: 'secondary',
    approved: 'default',
    rejected: 'outline',
  };

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Club Leader Request</CardTitle>
          <Button size="sm" onClick={() => setOpen(true)}>Request Leadership</Button>
        </div>
      </CardHeader>
      <CardContent>
        {requestsLoading && <Spinner />}
        {!requestsLoading && myRequests.length === 0 && (
          <p className="text-sm opacity-60">You have no leadership requests yet.</p>
        )}
        <div className="space-y-2 mt-2">
          {myRequests.map((req) => (
            <div key={req.id} className="border-2 border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold">{req.club_name}</span>
                <Badge variant={statusVariant[req.status] ?? 'default'}>{req.status}</Badge>
              </div>
              {req.message && <p className="opacity-60 italic mt-1">"{req.message}"</p>}
              {req.admin_notes && (
                <p className="mt-1 text-xs">
                  <span className="font-bold">Admin notes: </span>{req.admin_notes}
                </p>
              )}
              <p className="text-xs opacity-40 mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Club Leadership</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
            <Textarea
              placeholder="Why do you want to lead this club? (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedClubId || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({ club_id: parseInt(selectedClubId), message: message || undefined })
              }
            >
              {createMutation.isPending ? 'Submitting…' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const { showToast } = useAppToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name || '');

  const isStudent = !hasRole('admin') && !hasRole('club_leader');
  const primaryRole = hasRole('admin') ? 'admin' : hasRole('club_leader') ? 'club_leader' : 'student';

  const updateMutation = useMutation({
    mutationFn: (data: { name: string }) => usersApi.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      showToast('Profile updated', 'Your name has been saved.');
    },
    onError: () => showToast('Error', 'Failed to update profile.'),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="mb-6 text-3xl font-black">{t('nav.profile')}</h1>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar name={user?.name ?? ''} role={primaryRole} />
            <div>
              <CardTitle className="text-xl">{user?.name}</CardTitle>
              <p className="text-sm opacity-60">{user?.email}</p>
              <div className="flex gap-1 mt-1">
                {user?.roles?.map((r) => (
                  <Badge key={r} variant="accent">{r}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Email</label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Display Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <Button
              disabled={updateMutation.isPending || name === user?.name || !name.trim()}
              onClick={() => updateMutation.mutate({ name })}
            >
              {updateMutation.isPending ? 'Saving…' : t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">Dark Mode</p>
              <p className="text-xs opacity-60">Switch between light and dark theme</p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">Language</p>
              <p className="text-xs opacity-60">Interface language and text direction</p>
            </div>
            <Button size="sm" variant="outline" onClick={toggleLanguage}>
              {language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="opacity-60">Role</span>
            <span className="font-bold capitalize">{primaryRole.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="opacity-60">User ID</span>
            <span className="font-mono opacity-80">{user?.id}</span>
          </div>
        </CardContent>
      </Card>

      {/* Students can request club leadership */}
      {isStudent && <LeaderRequestSection />}
    </div>
  );
}
