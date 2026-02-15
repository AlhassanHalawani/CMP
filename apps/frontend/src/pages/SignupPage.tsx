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
  const { authenticated, login } = useAuth();
  const { t } = useTranslation();
  const { toggleLanguage, language } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (authenticated) return <Navigate to="/" replace />;

  if (success) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <div className="w-full max-w-sm border-2 border-[var(--border)] bg-[var(--background)] p-8 shadow-[6px_6px_0px_0px_var(--border)]">
          <h1 className="mb-2 text-3xl font-black">{t('app.shortTitle')}</h1>
          <p className="mb-4 text-sm font-bold text-[var(--main)]">{t('auth.signupSuccessTitle')}</p>
          <p className="mb-6 text-sm">{t('auth.signupSuccessBody')}</p>
          <Button className="w-full" size="lg" onClick={login}>
            {t('auth.loginWith')}
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();

    if (!isAllowedDomain(trimmedEmail)) {
      setError(t('auth.signupDomainError'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.signupPasswordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.signupPasswordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await authApi.signup({ name: name.trim(), email: trimmedEmail, password });
      setSuccess(true);
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data;
        if (data?.errors) {
          setError(data.errors[0]?.msg ?? t('auth.signupDomainError'));
        } else {
          setError(data?.error ?? t('auth.signupDomainError'));
        }
      } else {
        setError(t('auth.signupDomainError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-sm border-2 border-[var(--border)] bg-[var(--background)] p-8 shadow-[6px_6px_0px_0px_var(--border)]">
        <h1 className="mb-2 text-3xl font-black">{t('app.shortTitle')}</h1>
        <p className="mb-6 text-sm font-bold text-[var(--main)]">{t('auth.signupTitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-bold" htmlFor="signup-name">
              {t('auth.signupNameLabel')}
            </label>
            <Input
              id="signup-name"
              type="text"
              placeholder={t('auth.signupNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

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

          <div className="space-y-1">
            <label className="text-sm font-bold" htmlFor="signup-password">
              {t('auth.signupPasswordLabel')}
            </label>
            <Input
              id="signup-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold" htmlFor="signup-confirm">
              {t('auth.signupConfirmPasswordLabel')}
            </label>
            <Input
              id="signup-confirm"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
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
