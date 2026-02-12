import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type Language = 'en' | 'ar';

interface LanguageContextValue {
  language: Language;
  toggleLanguage: () => void;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState<Language>(() => {
    return (i18n.language?.startsWith('ar') ? 'ar' : 'en') as Language;
  });

  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [language, i18n]);

  const toggleLanguage = () => setLanguage((l) => (l === 'en' ? 'ar' : 'en'));
  const isRtl = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
