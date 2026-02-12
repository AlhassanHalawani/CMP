import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import { PageLayout } from './PageLayout';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { authenticated, initialized, hasRole } = useAuth();

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !roles.some((r) => hasRole(r))) {
    return <Navigate to="/" replace />;
  }

  return <PageLayout>{children}</PageLayout>;
}
