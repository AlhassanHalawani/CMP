import { NavLink, Link, useMatch } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Trophy,
  Award,
  BarChart3,
  TrendingUp,
  FileText,
  Bell,
  Settings,
  BookOpenCheck,
  type LucideIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

const navItems = [
  { path: '/dashboard', labelKey: 'nav.dashboard', roles: [], icon: LayoutDashboard },
  { path: '/clubs', labelKey: 'nav.clubs', roles: [], icon: Users },
  { path: '/events', labelKey: 'nav.events', roles: [], icon: Calendar },
  { path: '/badges', labelKey: 'nav.badges', roles: [], icon: Award },
  { path: '/achievements', labelKey: 'nav.achievements', roles: ['admin', 'club_leader'], icon: Trophy },
  { path: '/leaderboard', labelKey: 'nav.leaderboard', roles: [], icon: BarChart3 },
  { path: '/daily-questions', labelKey: 'nav.dailyQuestions', roles: [], icon: BookOpenCheck },
  { path: '/kpi', labelKey: 'nav.kpi', roles: ['admin', 'club_leader'], icon: TrendingUp },
  { path: '/reports', labelKey: 'nav.reports', roles: ['admin', 'club_leader'], icon: FileText },
  { path: '/notifications', labelKey: 'nav.notifications', roles: [], icon: Bell },
  { path: '/admin', labelKey: 'nav.admin', roles: ['admin'], icon: Settings },
] as const;

type NavItem = { path: string; labelKey: string; roles: readonly string[]; icon: LucideIcon };

function NavItem({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const isActive = !!useMatch({ path: item.path, end: item.path === '/' });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={t(item.labelKey)}>
        <NavLink
          to={item.path}
          end={item.path === '/'}
          className={isActive
            ? 'bg-main text-main-foreground outline-border outline-2'
            : 'text-foreground dark:text-white'}
        >
          <item.icon />
          <span className="group-data-[collapsible=icon]:hidden">{t(item.labelKey)}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function AppSidebar() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const { isRtl } = useLanguage();
  const { currentUser } = useCurrentUser();

  const visibleItems = navItems.filter(
    (item) => item.roles.length === 0 || item.roles.some((r) => hasRole(r))
  );

  return (
    <Sidebar collapsible="icon" side={isRtl ? 'right' : 'left'}>
      <SidebarHeader>
        <div className="px-2 py-1">
          <p className="text-base font-black text-foreground dark:text-white group-data-[collapsible=icon]:hidden">
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
                <NavItem key={item.path} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Link
          to="/profile"
          className="flex items-center gap-3 px-2 py-2 rounded-base hover:bg-[var(--overlay)] transition-colors"
        >
          <Avatar className="size-8 shrink-0">
            {currentUser?.avatar_url ? (
              <AvatarImage src={currentUser.avatar_url} alt={currentUser.name} />
            ) : null}
            <AvatarFallback className="text-xs">
              {currentUser ? getInitials(currentUser.name) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold truncate">{currentUser?.name ?? '…'}</p>
            <p className="text-xs opacity-50 truncate">{currentUser?.email ?? ''}</p>
          </div>
        </Link>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
