import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/SEOHead';

export const NotFoundPage: React.FC<{ isArabic?: boolean }> = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="gutter min-h-[70vh] flex flex-col justify-end pb-[clamp(60px,10vh,110px)]">
      <SEOHead title={t('notFound.title')} description={t('notFound.desc')} />
      <span className="t-giant text-fg leading-none" dir="ltr" aria-hidden="true">
        4<span className="text-accent">0</span>4
      </span>
      <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-end border-t border-line pt-8">
        <div>
          <h1 className="t-title text-fg">{t('notFound.title')}</h1>
        </div>
        <div className="md:justify-self-end space-y-5 max-w-[40ch]">
          <p className="t-blurb text-mut">{t('notFound.desc')}</p>
          <button type="button" onClick={() => navigate('/')} className="pill pill--solid">
            {t('notFound.backHome')}
            <span aria-hidden="true" className="rtl:-scale-x-100">
              ↗
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default NotFoundPage;
