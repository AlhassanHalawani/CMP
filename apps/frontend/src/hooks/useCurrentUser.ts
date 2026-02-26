import { useQuery } from '@tanstack/react-query';
import { usersApi, User } from '@/api/users';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Fetches the current user's full profile from the backend (including their DB id).
 * This is needed to resolve ownership (e.g. clubs.leader_id === currentUser.id).
 */
export function useCurrentUser(): { currentUser: User | undefined; isLoading: boolean } {
  const { token } = useAuth();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => usersApi.getMe(),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  return { currentUser, isLoading };
}
