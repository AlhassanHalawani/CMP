import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';

export function LoginPage() {
  const { login, authenticated } = useAuth();
  const { t } = useTranslation();
  const { toggleLanguage, language } = useLanguage();

  if (authenticated) return <Navigate to="/" replace />;

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-background)]">
      <div className="w-full max-w-sm border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-brutal-lg)]">
        <h1 className="mb-2 text-3xl font-black">{t('app.shortTitle')}</h1>
        <p className="mb-8 text-sm font-bold text-[var(--color-primary)]">{t('app.title')}</p>
        <Button className="w-full" size="lg" onClick={login}>
          {t('auth.loginWith')}
        </Button>
        <div className="mt-4 text-center">
          <button onClick={toggleLanguage} className="text-sm font-bold underline">
            {language === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
      </div>
    </div>
  );
}
