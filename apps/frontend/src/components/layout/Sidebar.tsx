import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', labelKey: 'nav.dashboard', roles: [] },
  { path: '/clubs', labelKey: 'nav.clubs', roles: [] },
  { path: '/events', labelKey: 'nav.events', roles: [] },
  { path: '/achievements', labelKey: 'nav.achievements', roles: [] },
  { path: '/leaderboard', labelKey: 'nav.leaderboard', roles: [] },
  { path: '/kpi', labelKey: 'nav.kpi', roles: ['admin', 'club_leader'] },
  { path: '/notifications', labelKey: 'nav.notifications', roles: [] },
  { path: '/admin', labelKey: 'nav.admin', roles: ['admin'] },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();

  const visibleItems = navItems.filter(
    (item) => item.roles.length === 0 || item.roles.some((r) => hasRole(r))
  );

  return (
    <aside className="w-64 min-h-screen border-r-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col">
      <div className="mb-6 border-b-2 border-[var(--color-border)] pb-4">
        <h1 className="text-xl font-black">{t('app.shortTitle')}</h1>
        <p className="text-xs font-bold text-[var(--color-primary)]">{t('app.title')}</p>
      </div>
      <nav className="flex flex-col gap-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'px-3 py-2 font-bold border-2 border-transparent transition-all',
                isActive
                  ? 'border-[var(--color-border)] bg-[var(--color-accent)] shadow-[var(--shadow-brutal-sm)]'
                  : 'hover:border-[var(--color-border)] hover:bg-[var(--color-accent)]/30'
              )
            }
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
