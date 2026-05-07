import { type ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppSidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/contexts/AuthContext';

function MissingStudentIdPrompt() {
  const { currentUser } = useCurrentUser();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const shouldShow =
    !dismissed &&
    location.pathname !== '/profile' &&
    !!currentUser &&
    currentUser.role === 'student' &&
    !hasRole('admin') &&
    !hasRole('club_leader') &&
    !currentUser.student_id;

  return (
    <Dialog open={shouldShow} onOpenChange={(open) => { if (!open) setDismissed(true); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Add your Student ID to complete your profile and unlock all platform features.
        </p>
        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => setDismissed(true)}>Remind me later</Button>
          <Button onClick={() => { setDismissed(true); navigate('/profile'); }}>
            Go to Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex items-center gap-2 border-b-2 border-[var(--border)] px-4 py-3">
          <SidebarTrigger />
          <div className="flex-1">
            <Topbar />
          </div>
        </div>
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
      <MissingStudentIdPrompt />
    </SidebarProvider>
  );
}
