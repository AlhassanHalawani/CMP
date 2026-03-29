import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Audience = 'student' | 'staff';

const STORAGE_SEEN = 'cmp_landing_seen';
const STORAGE_AUDIENCE = 'cmp_selected_audience';
const STORAGE_INTRO = 'cmp_intro_completed';

const WIZARD_STEPS = 3;

export function LandingPage() {
  const { t } = useTranslation();
  const { authenticated, initialized, user, logout } = useAuth();
  const { toggleLanguage, language } = useLanguage();
  const navigate = useNavigate();

  const [audience, setAudience] = useState<Audience | null>(() => {
    const stored = localStorage.getItem(STORAGE_AUDIENCE);
    return stored === 'student' || stored === 'staff' ? stored : null;
  });

  const [wizardStep, setWizardStep] = useState<number>(0);
  const [introCompleted, setIntroCompleted] = useState(() => {
    return localStorage.getItem(STORAGE_INTRO) === 'true';
  });
  const [landingSeen] = useState(() => {
    return localStorage.getItem(STORAGE_SEEN) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_SEEN, 'true');
  }, []);

  useEffect(() => {
    if (audience) localStorage.setItem(STORAGE_AUDIENCE, audience);
  }, [audience]);

  const handleSelectAudience = (a: Audience) => {
    setAudience(a);
    setWizardStep(1);
    setIntroCompleted(false);
    localStorage.removeItem(STORAGE_INTRO);
  };

  const handleWizardNext = () => {
    if (wizardStep < WIZARD_STEPS) {
      setWizardStep((s) => s + 1);
    } else {
      setIntroCompleted(true);
      localStorage.setItem(STORAGE_INTRO, 'true');
      setWizardStep(0);
    }
  };

  const handleWizardBack = () => {
    if (wizardStep > 1) {
      setWizardStep((s) => s - 1);
    } else {
      setWizardStep(0);
      setAudience(null);
    }
  };

  const handleSkipIntro = () => {
    setIntroCompleted(true);
    localStorage.setItem(STORAGE_INTRO, 'true');
    setWizardStep(0);
    navigate('/login');
  };

  const handleViewIntroAgain = () => {
    setIntroCompleted(false);
    localStorage.removeItem(STORAGE_INTRO);
    setWizardStep(audience ? 1 : 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getWizardTitle = () => {
    if (wizardStep === 1) return t('landing.wizardStep1Title');
    if (wizardStep === 2)
      return audience === 'staff'
        ? t('landing.wizardStep2StaffTitle')
        : t('landing.wizardStep2StudentTitle');
    return t('landing.wizardStep3Title');
  };

  const getWizardBody = () => {
    if (wizardStep === 1) return t('landing.wizardStep1Body');
    if (wizardStep === 2)
      return audience === 'staff'
        ? t('landing.wizardStep2StaffBody')
        : t('landing.wizardStep2StudentBody');
    return t('landing.wizardStep3Body');
  };

  const studentBenefits = [
    t('landing.benefitStudentDiscover'),
    t('landing.benefitStudentRegister'),
    t('landing.benefitStudentAttendance'),
    t('landing.benefitStudentAchievements'),
    t('landing.benefitStudentLead'),
  ];

  const staffBenefits = [
    t('landing.benefitStaffOversee'),
    t('landing.benefitStaffApprovals'),
    t('landing.benefitStaffAttendance'),
    t('landing.benefitStaffAdmin'),
  ];

  const trustItems = [
    t('landing.trustOne'),
    t('landing.trustTwo'),
    t('landing.trustThree'),
    t('landing.trustFour'),
  ];

  const showBenefits = audience && (introCompleted || wizardStep === 0);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Language + theme toggle bar */}
      <div className="sticky top-0 z-50 flex justify-end gap-3 border-b-2 border-[var(--border)] bg-[var(--background)] px-4 py-2">
        <button
          onClick={toggleLanguage}
          className="text-sm font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          {language === 'en' ? 'العربية' : 'English'}
        </button>
        {!authenticated && (
          <>
            <Link to="/login" className="text-sm font-bold underline">
              {t('landing.loginCta')}
            </Link>
            <Link to="/signup" className="text-sm font-bold underline">
              {t('auth.signup').split('?')[0].trim()}
            </Link>
          </>
        )}
        {authenticated && initialized && (
          <Link to="/dashboard" className="text-sm font-bold underline">
            {t('nav.dashboard')}
          </Link>
        )}
      </div>

      {/* ── HERO ── */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:py-24">
        <p className="mb-2 text-sm font-bold uppercase tracking-widest text-[var(--main)]">
          {t('app.shortTitle')}
        </p>
        <h1 className="mb-4 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
          {t('landing.heroTitle')}
        </h1>
        <p className="mb-8 max-w-xl text-lg font-medium text-[var(--foreground)]/70">
          {t('landing.heroSubtitle')}
        </p>

        {/* Returning authenticated user */}
        {authenticated && initialized && user && (
          <div className="mb-6 border-2 border-[var(--border)] bg-[var(--secondary-background)] p-4 shadow-[4px_4px_0px_0px_var(--border)]">
            <p className="mb-3 font-bold">
              {t('landing.welcomeBack')}, {user.name || user.email}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate('/dashboard')}>
                {t('landing.goDashboard')}
              </Button>
              <Button variant="neutral" size="lg" onClick={() => navigate('/dashboard')}>
                {t('landing.viewIntroAgain')}
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                {t('landing.switchAccount')}
              </Button>
            </div>
          </div>
        )}

        {/* Unauthenticated CTAs */}
        {!authenticated && (
          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" asChild>
              <Link to="/signup">{t('landing.signupCta')}</Link>
            </Button>
            <Button variant="neutral" size="lg" asChild>
              <Link to="/login">{t('landing.loginCta')}</Link>
            </Button>
            {landingSeen && (
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-bold underline"
              >
                {t('landing.skipIntro')}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── AUDIENCE SELECTION ── */}
      {!authenticated && (
        <section className="mx-auto max-w-4xl px-4 pb-16">
          <h2 className="mb-6 text-2xl font-black">{t('landing.audienceTitle')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(['student', 'staff'] as Audience[]).map((a) => (
              <button
                key={a}
                onClick={() => handleSelectAudience(a)}
                className={cn(
                  'border-2 border-[var(--border)] p-6 text-start transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black',
                  audience === a
                    ? 'bg-[var(--main)] text-[var(--main-foreground)] shadow-none translate-x-[3px] translate-y-[3px]'
                    : 'bg-[var(--background)] shadow-[4px_4px_0px_0px_var(--border)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none',
                )}
              >
                <p className="text-xl font-black">
                  {a === 'student' ? t('landing.audienceStudent') : t('landing.audienceStaff')}
                </p>
                <p className="mt-1 text-sm font-medium">
                  {a === 'student'
                    ? t('landing.audienceStudentDesc')
                    : t('landing.audienceStaffDesc')}
                </p>
              </button>
            ))}
          </div>

          {audience && !introCompleted && wizardStep === 0 && (
            <div className="mt-4 flex gap-4">
              <Button onClick={() => setWizardStep(1)}>{t('landing.wizardNext')}</Button>
              <button
                onClick={() => { setAudience(null); }}
                className="text-sm font-bold underline"
              >
                {t('landing.changeAudience')}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── WIZARD ── */}
      {!authenticated && audience && wizardStep > 0 && (
        <section className="mx-auto max-w-4xl px-4 pb-16">
          {/* Progress bar */}
          <div className="mb-6 flex items-center gap-2">
            {Array.from({ length: WIZARD_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 flex-1 border-2 border-[var(--border)] transition-all',
                  i < wizardStep ? 'bg-[var(--main)]' : 'bg-[var(--secondary-background)]',
                )}
              />
            ))}
            <span className="ms-2 whitespace-nowrap text-sm font-bold">
              {t('landing.stepOf', { current: wizardStep, total: WIZARD_STEPS })}
            </span>
          </div>

          {/* Step card */}
          <div
            key={wizardStep}
            className="border-2 border-[var(--border)] bg-[var(--background)] p-8 shadow-[6px_6px_0px_0px_var(--border)] animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <h3 className="mb-3 text-2xl font-black">{getWizardTitle()}</h3>
            <p className="text-base font-medium leading-relaxed text-[var(--foreground)]/80">
              {getWizardBody()}
            </p>
          </div>

          {/* Wizard controls */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="neutral" onClick={handleWizardBack}>
              {t('landing.wizardBack')}
            </Button>
            <Button onClick={handleWizardNext}>
              {wizardStep < WIZARD_STEPS ? t('landing.wizardNext') : t('landing.signupCta')}
            </Button>
            <div className="flex-1" />
            <button onClick={handleSkipIntro} className="text-sm font-bold underline">
              {t('landing.wizardSkip')}
            </button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/signup">{t('landing.signupCta')}</Link>
            </Button>
          </div>

          {/* Mobile sticky CTA */}
          <div className="fixed bottom-0 start-0 end-0 z-40 flex gap-2 border-t-2 border-[var(--border)] bg-[var(--background)] p-3 sm:hidden">
            <Button className="flex-1" asChild>
              <Link to="/signup">{t('landing.signupCta')}</Link>
            </Button>
            <Button variant="neutral" className="flex-1" asChild>
              <Link to="/login">{t('landing.loginCta')}</Link>
            </Button>
          </div>
        </section>
      )}

      {/* ── BENEFITS ── */}
      {showBenefits && (
        <section className="mx-auto max-w-4xl px-4 pb-16">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">{t('landing.benefitsTitle')}</h2>
            {!authenticated && (
              <button onClick={handleViewIntroAgain} className="text-sm font-bold underline">
                {t('landing.viewIntroAgain')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(audience === 'staff' ? staffBenefits : studentBenefits).map((benefit) => (
              <div
                key={benefit}
                className="border-2 border-[var(--border)] bg-[var(--background)] p-5 shadow-[4px_4px_0px_0px_var(--border)]"
              >
                <p className="font-bold">{benefit}</p>
              </div>
            ))}
          </div>

          {/* Mid-page CTA */}
          {!authenticated && (
            <div className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link to="/signup">{t('landing.signupCta')}</Link>
              </Button>
              <Button variant="neutral" size="lg" asChild>
                <Link to="/login">{t('landing.loginCta')}</Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {/* ── TRUST / VALUE ── */}
      <section className="border-y-2 border-[var(--border)] bg-[var(--secondary-background)] px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-2xl font-black">{t('landing.trustTitle')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {trustItems.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-0.5 h-5 w-5 shrink-0 border-2 border-[var(--border)] bg-[var(--main)]" />
                <p className="font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA BAND ── */}
      {!authenticated && (
        <section className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="mb-3 text-3xl font-black sm:text-4xl">{t('landing.finalCtaTitle')}</h2>
          <p className="mx-auto mb-8 max-w-md text-base font-medium text-[var(--foreground)]/70">
            {t('landing.finalCtaBody')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/signup">{t('landing.finalCtaSignup')}</Link>
            </Button>
            <Button variant="neutral" size="lg" asChild>
              <Link to="/login">{t('landing.finalCtaLogin')}</Link>
            </Button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t-2 border-[var(--border)] px-4 py-6 text-center text-sm font-bold">
        {t('app.title')} — {t('app.shortTitle')}
      </footer>
    </div>
  );
}
