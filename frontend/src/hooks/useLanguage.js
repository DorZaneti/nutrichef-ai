import { useCallback, useEffect, useMemo } from 'react';
import { translate } from '../i18n';
import usePersistentState from './usePersistentState';

export function initialLanguage() {
  try {
    const saved = JSON.parse(localStorage.getItem('nutrichef.language'));
    if (saved) return saved;
  } catch {
    // fall through to the browser language
  }
  return navigator.language?.toLowerCase().startsWith('he') ? 'he' : 'en';
}

export function applyLanguage(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
}

// UI language + direction. The value for LanguageContext.
export default function useLanguage() {
  const [lang, setLang] = usePersistentState('nutrichef.language', initialLanguage());

  useEffect(() => {
    applyLanguage(lang);
  }, [lang]);

  const t = useCallback((key, params) => translate(lang, key, params), [lang]);
  return useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
}
