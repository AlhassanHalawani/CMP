import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUiPreferences, COLOR_PRESETS } from '@/contexts/UiPreferencesContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { gamificationApi } from '@/api/gamification';
import { badgesApi } from '@/api/badges';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppToast } from '@/contexts/ToastContext';
import { Sun, Moon } from 'lucide-react';

const RARITY_VARIANT: Record<string, 'accent' | 'neutral' | 'secondary' | 'default'> = {
  legendary: 'accent',
  epic: 'default',
  rare: 'secondary',
  common: 'neutral',
};

// ─── Segmented button helper ──────────────────────────────────────────────────

function SegmentedButtons<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <Button
          key={opt}
          size="sm"
          variant={value === opt ? 'default' : 'outline'}
          className="min-w-[3rem] text-xs"
          onClick={() => onChange(opt)}
          type="button"
        >
          {opt}
        </Button>
      ))}
    </div>
  );
}

// ─── Customize Styling Dialog ─────────────────────────────────────────────────

function CustomizeStylingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { draft, setDraft, previewDraft, savePreferences, resetPreferences, isSaving } = useUiPreferences();
  const { showToast } = useAppToast();

  const handleSave = () => {
    savePreferences();
    showToast('Preferences saved', 'Your styling preferences have been applied.');
    onOpenChange(false);
  };

  const handleReset = () => {
    resetPreferences();
    showToast('Preferences reset', 'Styling has been reset to defaults.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize styling</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Color preset */}
          <div>
            <label className="block text-sm font-bold mb-2">Color preset</label>
            <Select value={draft.color_preset} onValueChange={(v) => { setDraft({ color_preset: v }); previewDraft(); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COLOR_PRESETS).map(([key, { label, main }]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block size-3 rounded-sm border border-border"
                        style={{ background: main }}
                      />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Border radius */}
          <div>
            <label className="block text-sm font-bold mb-2">Border radius</label>
            <SegmentedButtons
              options={['0px', '5px', '10px', '15px']}
              value={draft.radius_base as '0px' | '5px' | '10px' | '15px'}
              onChange={(v) => { setDraft({ radius_base: v }); previewDraft(); }}
            />
          </div>

          {/* Horizontal box shadow */}
          <div>
            <label className="block text-sm font-bold mb-2">Horizontal shadow</label>
            <SegmentedButtons
              options={['-4px', '-2px', '0px', '2px', '4px']}
              value={draft.box_shadow_x as '-4px' | '-2px' | '0px' | '2px' | '4px'}
              onChange={(v) => { setDraft({ box_shadow_x: v }); previewDraft(); }}
            />
          </div>

          {/* Vertical box shadow */}
          <div>
            <label className="block text-sm font-bold mb-2">Vertical shadow</label>
            <SegmentedButtons
              options={['-4px', '-2px', '0px', '2px', '4px']}
              value={draft.box_shadow_y as '-4px' | '-2px' | '0px' | '2px' | '4px'}
              onChange={(v) => { setDraft({ box_shadow_y: v }); previewDraft(); }}
            />
          </div>

          {/* Heading font weight */}
          <div>
            <label className="block text-sm font-bold mb-2">Heading font weight</label>
            <SegmentedButtons
              options={['700', '800', '900']}
              value={draft.font_weight_heading as '700' | '800' | '900'}
              onChange={(v) => { setDraft({ font_weight_heading: v }); previewDraft(); }}
            />
          </div>

          {/* Base font weight */}
          <div>
            <label className="block text-sm font-bold mb-2">Base font weight</label>
            <SegmentedButtons
              options={['500', '600', '700']}
              value={draft.font_weight_base as '500' | '600' | '700'}
              onChange={(v) => { setDraft({ font_weight_base: v }); previewDraft(); }}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 mt-4">
          <Button variant="outline" onClick={handleReset} type="button">
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving} type="button">
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Club Leader Requests</h2>
        <Button size="sm" onClick={() => setOpen(true)}>Request Leadership</Button>
      </div>

      {requestsLoading && <Spinner />}
      {!requestsLoading && myRequests.length === 0 && (
        <p className="text-sm opacity-60">You have no leadership requests yet.</p>
      )}
      <div className="space-y-2">
        {myRequests.map((req) => (
          <Card key={req.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="font-bold">{req.club_name}</span>
                <Badge variant={statusVariant[req.status] ?? 'default'}>{req.status}</Badge>
              </div>
              {req.message && <p className="opacity-60 italic mt-1 text-sm">"{req.message}"</p>}
              {req.admin_notes && (
                <p className="mt-1 text-xs">
                  <span className="font-bold">Admin notes: </span>{req.admin_notes}
                </p>
              )}
              <p className="text-xs opacity-40 mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
    </div>
  );
}

// ─── Preferences tab ──────────────────────────────────────────────────────────

function PreferencesTab() {
  const { theme, toggleTheme } = useTheme();
  const [stylingOpen, setStylingOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Theme</label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => theme !== 'light' && toggleTheme()}
              >
                <Sun className="size-4 mr-1" /> Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => theme !== 'dark' && toggleTheme()}
              >
                <Moon className="size-4 mr-1" /> Dark
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">UI Styling</label>
            <Button variant="outline" size="sm" onClick={() => setStylingOpen(true)}>
              Customize styling
            </Button>
          </div>
        </CardContent>
      </Card>

      <CustomizeStylingDialog open={stylingOpen} onOpenChange={setStylingOpen} />
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const { showToast } = useAppToast();
  const queryClient = useQueryClient();
  const { currentUser } = useCurrentUser();
  const [name, setName] = useState(user?.name || '');

  const isStudent = !hasRole('admin') && !hasRole('club_leader');

  // Badge progress summary
  const { data: badgeProgress } = useQuery({
    queryKey: ['badges', 'progress'],
    queryFn: badgesApi.getMyProgress,
    enabled: !!currentUser && !hasRole('admin'),
  });

  // XP / level progress
  const { data: gamification } = useQuery({
    queryKey: ['gamification', 'me'],
    queryFn: () => gamificationApi.getMyGamification(),
    enabled: !!currentUser && !hasRole('admin'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name: string }) => usersApi.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      showToast('Profile updated', 'Your name has been saved.');
    },
    onError: () => showToast('Error', 'Failed to update profile.'),
  });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">{t('nav.profile')}</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          {isStudent && <TabsTrigger value="requests">Requests</TabsTrigger>}
        </TabsList>

        {/* Profile tab */}
        <TabsContent value="profile" className="mt-6 space-y-6 max-w-lg">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{user?.name}</CardTitle>
                <Badge variant="accent">{user?.roles?.join(', ')}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Email</label>
                  <Input value={user?.email || ''} disabled />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <Button
                  disabled={updateMutation.isPending || name === user?.name}
                  onClick={() => updateMutation.mutate({ name })}
                >
                  {updateMutation.isPending ? 'Saving…' : t('common.save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* XP / Level card (non-admin only) */}
          {gamification && !hasRole('admin') && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">XP & Level</CardTitle>
                  <span className="text-2xl font-black text-[var(--main)]">
                    Lv.{gamification.current_level}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1 opacity-70">
                    <span>{gamification.current_xp} XP</span>
                    <span>
                      {gamification.xp_to_next_level > 0
                        ? `${gamification.xp_to_next_level} XP to Level ${gamification.current_level + 1}`
                        : 'Max level reached'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bg)] border border-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--main)] transition-all"
                      style={{ width: `${gamification.progress_percent}%` }}
                    />
                  </div>
                </div>
                {gamification.recent_actions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold opacity-60">Recent XP</p>
                    {gamification.recent_actions.slice(0, 5).map((a, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="opacity-70 capitalize">{a.action_key.replace(/_/g, ' ')}</span>
                        <span className="font-bold text-[var(--main)]">+{a.xp_delta}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Badge summary (non-admin only) */}
          {badgeProgress && !hasRole('admin') && (() => {
            const unlocked = badgeProgress.badges.filter((b) => b.unlocked);
            const featured = badgeProgress.featured_badge_definition_id
              ? badgeProgress.badges.find((b) => b.id === badgeProgress.featured_badge_definition_id)
              : null;
            return (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t('nav.badges')}</CardTitle>
                    <Link to="/badges" className="text-xs font-bold underline opacity-60">
                      {t('badges.viewAll')}
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {featured && (
                    <div className="flex items-center gap-2 p-2 rounded-base border border-[var(--main)] bg-[var(--bg)]">
                      <span className="size-6 rounded-full bg-[var(--main)] text-main-foreground flex items-center justify-center text-xs font-black shrink-0">★</span>
                      <div>
                        <p className="text-xs opacity-60">{t('badges.featured')}</p>
                        <p className="text-sm font-bold">{featured.name}</p>
                      </div>
                    </div>
                  )}
                  <p className="text-sm opacity-70">
                    {unlocked.length} / {badgeProgress.badges.length} {t('badges.earned')}
                  </p>
                  {unlocked.length === 0 ? (
                    <p className="text-xs opacity-50">Join clubs and attend events to earn badges.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {unlocked.slice(0, 6).map((b) => (
                        <Badge key={b.id} variant={RARITY_VARIANT[b.rarity] ?? 'neutral'} className="text-xs capitalize">
                          {b.name}
                        </Badge>
                      ))}
                      {unlocked.length > 6 && (
                        <Badge variant="neutral" className="text-xs">+{unlocked.length - 6}</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        {/* Preferences tab */}
        <TabsContent value="preferences" className="mt-6">
          <PreferencesTab />
        </TabsContent>

        {/* Requests tab (students only) */}
        {isStudent && (
          <TabsContent value="requests" className="mt-6">
            <div className="max-w-lg">
              <LeaderRequestSection />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
