import React, { useEffect, useState } from 'react';
import { SiteContentService, StoreSettingsService, SiteContent } from '../../services/storeSettingsService';
import { useToast } from '../../components/Toast';
import { en } from '../../i18n/en';
import { ar } from '../../i18n/ar';
import { Section, SaveBar, Loading, ErrorNotice, adminError, fieldClass, labelClass } from './ui';

type TextKey = 'announcement' | 'heroTitle' | 'heroSubtitle';

const FIELDS: { key: TextKey; label: string; multiline: boolean }[] = [
  { key: 'announcement', label: 'Announcement bar', multiline: false },
  { key: 'heroTitle', label: 'Homepage hero title', multiline: false },
  { key: 'heroSubtitle', label: 'Homepage hero text', multiline: true },
];

/** Storefront text the Content and Marketing teams can change without touching store settings. */
export const ContentTab: React.FC = () => {
  const { showToast } = useToast();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setState('loading');
    SiteContentService.getContent()
      .then((c) => {
        setContent(c);
        setState('ready');
      })
      .catch((err) => {
        setError(adminError(err));
        setState('error');
      });
  };
  useEffect(load, []);

  const amount = StoreSettingsService.getSettingsSync().freeShippingThreshold.toLocaleString('en-US');
  const builtIn: Record<TextKey, { en: string; ar: string }> = {
    announcement: {
      en: en['announcement.freeShipping'].replace('{amount}', amount),
      ar: ar['announcement.freeShipping'].replace('{amount}', amount),
    },
    heroTitle: { en: en['home.heroTitle'], ar: ar['home.heroTitle'] },
    heroSubtitle: { en: en['home.heroDesc'], ar: ar['home.heroDesc'] },
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;
    setSaving(true);
    try {
      const saved = await SiteContentService.updateContent(content);
      setContent(saved);
      showToast('Storefront text published', 'Visitors see it on their next page load.', 'success');
    } catch (err) {
      showToast('Could not publish', adminError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="rounded-2xl border border-fg/10 bg-bg-2">
        <Loading label="Loading storefront text…" />
      </div>
    );
  }
  if (state === 'error' || !content) return <ErrorNotice message={`Storefront text could not be loaded: ${error}`} onRetry={load} />;

  return (
    <form onSubmit={handleSave} className="space-y-6" noValidate>
      {FIELDS.map(({ key, label, multiline }) => (
        <Section key={key} title={label}>
          <div className="grid gap-5 md:grid-cols-2">
            {(['En', 'Ar'] as const).map((lang) => {
              const field = `${key}${lang}` as keyof SiteContent;
              const id = `content-${field}`;
              const props = {
                id,
                value: content[field],
                dir: lang === 'Ar' ? ('rtl' as const) : ('ltr' as const),
                lang: lang === 'Ar' ? 'ar' : 'en',
                maxLength: multiline ? 600 : 160,
                className: fieldClass,
              };
              return (
                <div key={lang}>
                  <label htmlFor={id} className={labelClass}>
                    {lang === 'En' ? 'English' : 'Arabic'}
                  </label>
                  {multiline ? (
                    <textarea {...props} rows={4} onChange={(e) => setContent({ ...content, [field]: e.target.value })} />
                  ) : (
                    <input {...props} onChange={(e) => setContent({ ...content, [field]: e.target.value })} />
                  )}
                  <p className="mt-1.5 text-xs leading-relaxed text-mut" dir={lang === 'Ar' ? 'rtl' : 'ltr'} lang={lang === 'Ar' ? 'ar' : 'en'}>
                    Built-in: {builtIn[key][lang === 'En' ? 'en' : 'ar']}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>
      ))}
      <SaveBar note="Visitors see the new text on their next page load." error={null}>
        <button type="submit" disabled={saving} className="pill pill--accent">
          {saving ? 'Publishing…' : 'Publish text'}
        </button>
      </SaveBar>
    </form>
  );
};
