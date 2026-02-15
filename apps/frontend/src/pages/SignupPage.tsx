import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/api/auth';

const ALLOWED_DOMAINS = ['stu.kau.edu.sa', 'kau.edu.sa'];

function isAllowedDomain(email: string): boolean {
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;
  return ALLOWED_DOMAINS.includes(parts[1]);
}

export function SignupPage() {
  const { register, authenticated } = useAuth();
  const { t } = useTranslation();
  const { toggleLanguage, language } = useLanguage();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('auth.signupEmailRequired'));
      return;
    }

    if (!isAllowedDomain(trimmed)) {
      setError(t('auth.signupDomainError'));
      return;
    }

    setLoading(true);
    try {
      await authApi.validateSignupEmail(trimmed);
      register(trimmed);
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.error ?? t('auth.signupDomainError'));
      } else {
        setError(t('auth.signupDomainError'));
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-sm border-2 border-[var(--border)] bg-[var(--background)] p-8 shadow-[6px_6px_0px_0px_var(--border)]">
        <h1 className="mb-2 text-3xl font-black">{t('app.shortTitle')}</h1>
        <p className="mb-8 text-sm font-bold text-[var(--main)]">{t('auth.signupTitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold" htmlFor="signup-email">
              {t('auth.signupEmailLabel')}
            </label>
            <Input
              id="signup-email"
              type="email"
              placeholder="you@stu.kau.edu.sa"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            <p className="text-xs text-[var(--main)]">{t('auth.signupEmailHint')}</p>
          </div>

          {error && (
            <p className="text-sm font-bold text-red-600">{error}</p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? t('common.loading') : t('auth.signupSubmit')}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link to="/login" className="font-bold underline">
            {t('auth.backToLogin')}
          </Link>
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
