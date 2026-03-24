import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Trophy,
  BarChart3,
  TrendingUp,
  FileText,
  Bell,
  Settings,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

const navItems = [
  { path: '/', labelKey: 'nav.dashboard', roles: [], icon: LayoutDashboard },
  { path: '/clubs', labelKey: 'nav.clubs', roles: [], icon: Users },
  { path: '/events', labelKey: 'nav.events', roles: [], icon: Calendar },
  { path: '/achievements', labelKey: 'nav.achievements', roles: [], icon: Trophy },
  { path: '/leaderboard', labelKey: 'nav.leaderboard', roles: [], icon: BarChart3 },
  { path: '/kpi', labelKey: 'nav.kpi', roles: ['admin', 'club_leader'], icon: TrendingUp },
  { path: '/reports', labelKey: 'nav.reports', roles: ['admin', 'club_leader'], icon: FileText },
  { path: '/notifications', labelKey: 'nav.notifications', roles: [], icon: Bell },
  { path: '/admin', labelKey: 'nav.admin', roles: ['admin'], icon: Settings },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();

  const visibleItems = navItems.filter(
    (item) => item.roles.length === 0 || item.roles.some((r) => hasRole(r))
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="px-2 py-1">
          <p className="text-base font-black text-foreground group-data-[collapsible=icon]:hidden">
            {t('app.shortTitle')}
          </p>
          <p className="text-xs font-bold text-[var(--main)] group-data-[collapsible=icon]:hidden">
            {t('app.title')}
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={t(item.labelKey)}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        isActive ? 'bg-main text-main-foreground outline-border outline-2' : 'text-foreground'
                      }
                    >
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{t(item.labelKey)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
