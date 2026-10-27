import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { en } from '../i18n/en';
import { ar } from '../i18n/ar';

export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

export interface LanguageContextType {
  lang: Language;
  dir: Direction;
  isArabic: boolean;
  setLang: (newLang: Language) => void;
  toggleLang: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatPrice: (amount: number) => string;
  formatNumber: (value: number) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Every visit opens in English; switching to Arabic lasts for the visit only.
  const [lang, setLangState] = useState<Language>('en');

  const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr';
  const isArabic = lang === 'ar';

  // Apply attributes to <html> on mount and when language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.setAttribute('dir', dir);
    }
  }, [lang, dir]);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', newLang);
      document.documentElement.setAttribute('dir', newLang === 'ar' ? 'rtl' : 'ltr');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rootland_lang_changed', { detail: { lang: newLang } }));
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'ar' ? 'en' : 'ar');
  }, [lang, setLang]);

  /**
   * Translates a key with optional string interpolation, e.g. t('shop.showingCount', { count: 3 })
   */
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dictionary = lang === 'ar' ? ar : en;
      const fallbackDictionary = en;

      let value = (dictionary as Record<string, string>)[key] || (fallbackDictionary as Record<string, string>)[key];

      if (!value) {
        return key;
      }

      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          const regex = new RegExp(`\\{${paramKey}\\}|\\{\\{${paramKey}\\}\\}`, 'g');
          value = value.replace(regex, String(paramVal));
        });
      }

      return value;
    },
    [lang]
  );

  /**
   * Strictly formats numbers using Western digits (0-9) via latn numbering system.
   */
  const formatNumber = useCallback((value: number): string => {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return new Intl.NumberFormat('en-US', {
      numberingSystem: 'latn',
      maximumFractionDigits: 2,
    }).format(value);
  }, []);

  /**
   * Formats monetary values with Western numerals and localized currency label ("EGP" vs "ج.م").
   */
  const formatPrice = useCallback(
    (amount: number): string => {
      const formatted = formatNumber(amount);
      return lang === 'ar' ? `${formatted} ج.م` : `${formatted} EGP`;
    },
    [lang, formatNumber]
  );

  /**
   * Formats dates with Western numerals (latn).
   */
  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        const locale = lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';
        const defaultOptions: Intl.DateTimeFormatOptions = {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          numberingSystem: 'latn',
        };
        return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(d);
      } catch {
        return String(date);
      }
    },
    [lang]
  );

  const contextValue = useMemo<LanguageContextType>(
    () => ({
      lang,
      dir,
      isArabic,
      setLang,
      toggleLang,
      t,
      formatPrice,
      formatNumber,
      formatDate,
    }),
    [lang, dir, isArabic, setLang, toggleLang, t, formatPrice, formatNumber, formatDate]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
