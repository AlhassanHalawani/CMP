import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppToast } from '@/contexts/ToastContext';
import { usersApi } from '@/api/users';
import { useQueryClient } from '@tanstack/react-query';

export function LoginActivityTracker() {
  const { user } = useAuth();
  const { currentUser } = useCurrentUser();
  const { showToast } = useAppToast();
  const queryClient = useQueryClient();
  const fired = useRef(false);

  useEffect(() => {
    if (!user || !currentUser || fired.current) return;

    const todayKey = `cmp_login_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(todayKey)) return;

    fired.current = true;

    usersApi.recordLoginActivity()
      .then((result: any) => {
        localStorage.setItem(todayKey, '1');
        // Invalidate gamification cache so the profile/dashboard reflect new XP
        queryClient.invalidateQueries({ queryKey: ['gamification', 'me'] });

        if (result?.level_up && result?.new_level) {
          showToast('Level Up!', `You reached Level ${result.new_level}. Keep it up!`);
        }
      })
      .catch(() => { /* best-effort */ });
  }, [user, currentUser, showToast, queryClient]);

  return null;
}
