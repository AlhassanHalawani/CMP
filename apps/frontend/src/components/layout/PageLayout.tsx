import { type ReactNode } from 'react';
import { AppSidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

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
    </SidebarProvider>
  );
}
