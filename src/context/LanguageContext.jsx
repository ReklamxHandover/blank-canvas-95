import { createContext, useContext, useState } from 'react';
import { translations } from '../translations.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('sv');

  const t = (key) => {
    const val = translations[lang]?.[key];
    if (val === undefined) return key;
    return val;
  };

  const toggle = () => setLang(l => (l === 'sv' ? 'en' : 'sv'));

  return (
    <LanguageContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
