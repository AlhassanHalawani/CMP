import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export function SignupPage() {
  const { authenticated, register } = useAuth();
  const { t } = useTranslation();
  const { toggleLanguage, language } = useLanguage();
  const [redirectError, setRedirectError] = useState(false);

  if (authenticated) return <Navigate to="/" replace />;

  useEffect(() => {
    Promise.resolve(register()).catch(() => {
      setRedirectError(true);
    });
  }, [register]);

  const retryRegister = () => {
    setRedirectError(false);
    Promise.resolve(register()).catch(() => {
      setRedirectError(true);
    });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-sm border-2 border-[var(--border)] bg-[var(--background)] p-8 shadow-[6px_6px_0px_0px_var(--border)]">
        <h1 className="mb-2 text-3xl font-black">{t('app.shortTitle')}</h1>
        <p className="mb-4 text-sm font-bold text-[var(--main)]">{t('auth.signupTitle')}</p>
        <p className="mb-6 text-sm">{t('auth.signupRedirectBody')}</p>

        {redirectError ? (
          <div className="space-y-3">
            <p className="text-sm font-bold text-red-600">{t('auth.signupRedirectFailed')}</p>
            <Button className="w-full" size="lg" onClick={retryRegister}>
              {t('auth.signupSubmit')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">{t('common.loading')}</p>
            <Button className="w-full" size="lg" onClick={retryRegister}>
              {t('auth.signupSubmit')}
            </Button>
          </div>
        )}

        <div className="mt-4 text-center">
          <button onClick={retryRegister} className="text-sm font-bold underline">
            {t('auth.signupSubmit')}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button onClick={toggleLanguage} className="text-sm font-bold underline">
            {language === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
      </div>
    </div>
  );
}
