import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';

export function Topbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();

  return (
    <header className="flex items-center justify-between border-b-2 border-[var(--border)] bg-[var(--background)] px-6 py-3">
      <div />
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={toggleLanguage}>
          {language === 'en' ? 'العربية' : 'English'}
        </Button>
        <Button variant="outline" size="sm" onClick={toggleTheme}>
          {theme === 'light' ? t('theme.dark') : t('theme.light')}
        </Button>

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
