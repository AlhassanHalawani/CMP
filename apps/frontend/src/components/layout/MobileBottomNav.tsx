import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Calendar,
  QrCode,
  User,
  TrendingUp,
  Plus,
  Bell,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavSlot {
  path: string;
  labelKey: string;
  icon: LucideIcon;
  center?: boolean;
}

// TODO FR-016: Center "Scan QR" for students and admins maps to /events until a
// dedicated /scan or /checkin route is implemented.
// TODO FR-016: "Create Event" for club leaders maps to /events until /events/new
// or an inline creation flow is added.

const studentSlots: NavSlot[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/clubs', labelKey: 'nav.myClub', icon: Users },
  { path: '/events', labelKey: 'nav.scan', icon: QrCode, center: true },
  { path: '/events', labelKey: 'nav.events', icon: Calendar },
  { path: '/profile', labelKey: 'nav.profile', icon: User },
];

const leaderSlots: NavSlot[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/clubs', labelKey: 'nav.myClub', icon: Users },
  { path: '/events', labelKey: 'nav.createEvent', icon: Plus, center: true },
  { path: '/notifications', labelKey: 'nav.notifications', icon: Bell },
  { path: '/kpi', labelKey: 'nav.kpi', icon: TrendingUp },
];

const adminSlots: NavSlot[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/clubs', labelKey: 'nav.clubs', icon: Users },
  { path: '/events', labelKey: 'nav.scan', icon: QrCode, center: true },
  { path: '/reports', labelKey: 'nav.reports', icon: Calendar },
  { path: '/admin', labelKey: 'nav.admin', icon: Settings },
];

export function MobileBottomNav() {
  const { t } = useTranslation();
  const { authenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!authenticated) return null;

  const slots = hasRole('admin')
    ? adminSlots
    : hasRole('club_leader')
      ? leaderSlots
      : studentSlots;

  return (
    <nav
      className="fixed bottom-0 start-0 end-0 z-50 flex border-t-2 border-[var(--border)] bg-[var(--background)] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t('nav.mobileNav')}
    >
      {slots.map((slot, i) => {
        // Center action is always styled as a prominent action button and does
        // not change appearance based on the current route.
        const isActive =
          !slot.center && location.pathname === slot.path;
        const Icon = slot.icon;

        return (
          <Link
            key={i}
            to={slot.path}
            aria-label={t(slot.labelKey)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black',
              slot.center ? 'relative -mt-3' : '',
              !slot.center && isActive
                ? 'text-[var(--foreground)]'
                : !slot.center
                  ? 'text-[var(--foreground)]/50 hover:text-[var(--foreground)]/80'
                  : '',
            )}
          >
            {slot.center ? (
              <span className="flex h-14 w-14 items-center justify-center border-2 border-[var(--border)] bg-[var(--main)] text-[var(--main-foreground)] shadow-[3px_3px_0px_0px_var(--border)]">
                <Icon size={24} />
              </span>
            ) : (
              <>
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                <span>{t(slot.labelKey)}</span>
              </>
            )}
            {slot.center && (
              <span className="mt-0.5">{t(slot.labelKey)}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
