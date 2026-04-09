import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Bell, Moon, Sun } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notificationsApi } from '@/api/notifications';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function Topbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.list({ limit: 1 }),
    refetchInterval: 30_000,
  });
  const unreadCount = notifData?.unread ?? 0;

  return (
    <header className="flex items-center justify-between px-4">
      <div />
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={toggleLanguage}>
          {language === 'en' ? 'العربية' : 'English'}
        </Button>
        <Button variant="outline" size="sm" onClick={toggleTheme} aria-label={theme === 'light' ? t('theme.dark') : t('theme.light')}>
          {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
          <span className="sr-only">{theme === 'light' ? t('theme.dark') : t('theme.light')}</span>
        </Button>

        <Link to="/notifications" className="relative">
          <Button variant="outline" size="sm" className="relative">
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 size-5 p-0 flex items-center justify-center text-[10px]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {user?.name || 'User'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>{t('nav.profile')}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>{t('auth.logout')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
