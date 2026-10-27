import React, { useEffect, useState } from 'react';
import { StoreSettingsService, StoreSettings, GovernorateConfig } from '../../services/storeSettingsService';
import { useToast } from '../../components/Toast';
import { Section, SaveBar, Loading, ErrorNotice, adminError, fieldClass, labelClass, thClass, tdClass } from './ui';

type TextField = 'contactPhone' | 'whatsappNumber' | 'contactEmail' | 'instagramUrl' | 'facebookUrl' | 'tiktokUrl' | 'metaPixelId' | 'tiktokPixelId' | 'ga4MeasurementId';

const CONTACT: { key: TextField; label: string; hint?: string }[] = [
  { key: 'contactPhone', label: 'Phone shown on the site' },
  { key: 'whatsappNumber', label: 'WhatsApp number', hint: 'International digits only, e.g. 201119509756' },
  { key: 'contactEmail', label: 'Contact email' },
  { key: 'instagramUrl', label: 'Instagram link' },
  { key: 'facebookUrl', label: 'Facebook link' },
  { key: 'tiktokUrl', label: 'TikTok link' },
];

const PIXELS: { key: TextField; label: string }[] = [
  { key: 'metaPixelId', label: 'Meta Pixel ID' },
  { key: 'tiktokPixelId', label: 'TikTok Pixel ID' },
  { key: 'ga4MeasurementId', label: 'Google Analytics 4 measurement ID' },
];

/** Owner only: contact details, delivery fees, pre-orders and tracking pixels. Checkout reads these live. */
export const SettingsTab: React.FC = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [threshold, setThreshold] = useState('');
  const [preorderMax, setPreorderMax] = useState('');
  /** Scroll speed as a percentage of the browser's normal wheel step. */
  const [scrollPct, setScrollPct] = useState(100);
  const [fees, setFees] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const adopt = (s: StoreSettings) => {
    setSettings(s);
    setThreshold(String(s.freeShippingThreshold));
    setPreorderMax(String(s.preorderMaxPerVariant));
    setScrollPct(Math.round(s.scrollSpeed * 100));
    setFees(Object.fromEntries(s.governorates.map((g) => [g.id, String(g.fee)])));
  };

  const load = () => {
    setState('loading');
    StoreSettingsService.getSettings()
      .then((s) => {
        adopt(s);
        setState('ready');
      })
      .catch((err) => {
        setLoadError(adminError(err));
        setState('error');
      });
  };
  useEffect(load, []);

  if (state === 'loading') {
    return (
      <div className="rounded-2xl border border-fg/10 bg-bg-2">
        <Loading label="Loading store settings…" />
      </div>
    );
  }
  if (state === 'error' || !settings) return <ErrorNotice message={`Store settings could not be loaded: ${loadError}`} onRetry={load} />;

  const setText = (key: TextField, value: string) => setSettings({ ...settings, [key]: value });
  const setGov = (id: string, patch: Partial<GovernorateConfig>) =>
    setSettings({ ...settings, governorates: settings.governorates.map((g) => (g.id === id ? { ...g, ...patch } : g)) });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const thresholdValue = Number(threshold);
    const maxValue = Number(preorderMax);
    if (!Number.isInteger(thresholdValue) || thresholdValue <= 0) return setFormError('Free delivery needs a whole number of pounds above 0.');
    if (!Number.isInteger(maxValue) || maxValue < 0) return setFormError('Open pre-orders per size must be a whole number (0 stops pre-orders).');
    if (!/^[0-9]{10,15}$/.test(settings.whatsappNumber)) return setFormError('The WhatsApp number must be 10 to 15 digits with the country code, e.g. 201119509756.');
    if (scrollPct < 10 || scrollPct > 200) return setFormError('Scroll speed must be between 10% and 200% of normal.');
    const governorates: GovernorateConfig[] = [];
    for (const g of settings.governorates) {
      const fee = Number(fees[g.id]);
      if (!Number.isInteger(fee) || fee < 0) return setFormError(`The delivery fee for ${g.name} must be a whole number of pounds (0 or more).`);
      if (!g.deliveryDays.trim() || !g.deliveryDaysArabic?.trim()) return setFormError(`Enter the delivery time for ${g.name} in English and Arabic.`);
      governorates.push({ ...g, fee, deliveryDays: g.deliveryDays.trim(), deliveryDaysArabic: g.deliveryDaysArabic.trim() });
    }
    setSaving(true);
    try {
      const saved = await StoreSettingsService.updateSettings({
        ...settings,
        freeShippingThreshold: thresholdValue,
        preorderMaxPerVariant: maxValue,
        scrollSpeed: scrollPct / 100,
        governorates,
      });
      adopt(saved);
      showToast('Settings saved', 'Checkout now uses these values.', 'success');
    } catch (err) {
      setFormError(adminError(err));
    } finally {
      setSaving(false);
    }
  };

  const compactField = `${fieldClass} !py-1.5`;

  return (
    <form onSubmit={handleSave} className="space-y-6" noValidate>
      <Section title="Delivery" description="Free delivery from a subtotal, and the fee and delivery time for each governorate." flush>
        <div className="border-b border-fg/10 px-5 py-5 sm:px-6">
          <div className="max-w-xs">
            <label htmlFor="s-threshold" className={labelClass}>
              Free delivery from (EGP subtotal)
            </label>
            <input id="s-threshold" type="number" min={1} step={1} inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} className={fieldClass} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fg/10">
                <th className={`${thClass} text-start`}>Governorate</th>
                <th className={`${thClass} text-start`}>Fee (EGP)</th>
                <th className={`${thClass} text-start`}>Delivery time (English)</th>
                <th className={`${thClass} text-start`}>Delivery time (Arabic)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fg/10">
              {settings.governorates.map((g) => (
                <tr key={g.id} className="align-middle">
                  <td className={`${tdClass} whitespace-nowrap !py-2.5 text-fg`}>
                    {g.name}
                    <span className="block w-fit text-xs text-mut" dir="rtl" lang="ar">
                      {g.nameArabic}
                    </span>
                  </td>
                  <td className={`${tdClass} !py-2.5`}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={fees[g.id]}
                      onChange={(e) => setFees({ ...fees, [g.id]: e.target.value })}
                      aria-label={`Delivery fee for ${g.name}`}
                      className={`${compactField} !w-24 tabular-nums`}
                    />
                  </td>
                  <td className={`${tdClass} !py-2.5`}>
                    <input
                      value={g.deliveryDays}
                      onChange={(e) => setGov(g.id, { deliveryDays: e.target.value })}
                      aria-label={`Delivery time for ${g.name}`}
                      className={`${compactField} min-w-[8rem]`}
                    />
                  </td>
                  <td className={`${tdClass} !py-2.5`}>
                    <input
                      value={g.deliveryDaysArabic ?? ''}
                      onChange={(e) => setGov(g.id, { deliveryDaysArabic: e.target.value })}
                      dir="rtl"
                      lang="ar"
                      aria-label={`Arabic delivery time for ${g.name}`}
                      className={`${compactField} min-w-[8rem]`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Pre-orders" description="Customers can order a sold-out size, up to a limit per size.">
        <label className="flex w-fit items-center gap-2.5 text-sm text-body cursor-pointer">
          <input type="checkbox" checked={settings.preorderEnabled} onChange={(e) => setSettings({ ...settings, preorderEnabled: e.target.checked })} className="accent-fg" />
          Let customers pre-order sold-out sizes (paid on delivery)
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="s-pre-max" className={labelClass}>
              Open pre-orders per size
            </label>
            <input id="s-pre-max" type="number" min={0} step={1} inputMode="numeric" value={preorderMax} onChange={(e) => setPreorderMax(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="s-pre-en" className={labelClass}>
              Pre-order note (English)
            </label>
            <input id="s-pre-en" value={settings.preorderNoteEn} onChange={(e) => setSettings({ ...settings, preorderNoteEn: e.target.value })} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="s-pre-ar" className={labelClass}>
              Pre-order note (Arabic)
            </label>
            <input id="s-pre-ar" dir="rtl" lang="ar" value={settings.preorderNoteAr} onChange={(e) => setSettings({ ...settings, preorderNoteAr: e.target.value })} className={fieldClass} />
          </div>
        </div>
      </Section>

      <Section title="Contact and social" description="How customers reach the store.">
        <div className="grid gap-4 sm:grid-cols-2">
          {CONTACT.map(({ key, label, hint }) => (
            <div key={key}>
              <label htmlFor={`s-${key}`} className={labelClass}>
                {label}
              </label>
              <input id={`s-${key}`} value={settings[key]} onChange={(e) => setText(key, e.target.value.trim())} dir="ltr" className={fieldClass} />
              {hint && <p className="mt-1.5 text-xs text-mut">{hint}</p>}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tracking pixels" description="Leave a field empty to turn that pixel off. Pixels start on the visitor’s next page load.">
        <div className="grid gap-4 sm:grid-cols-3">
          {PIXELS.map(({ key, label }) => (
            <div key={key}>
              <label htmlFor={`s-${key}`} className={labelClass}>
                {label}
              </label>
              <input id={`s-${key}`} value={settings[key]} onChange={(e) => setText(key, e.target.value.trim())} dir="ltr" className={`${fieldClass} tabular-nums`} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Scrolling" description="How far the page moves for each turn of a mouse wheel or swipe on a trackpad. Phones keep their own touch scrolling.">
        <div className="max-w-md space-y-2">
          <label htmlFor="s-scroll" className={labelClass}>
            Scroll speed: <span className="tabular-nums text-fg">{scrollPct}%</span> of normal
          </label>
          <input
            id="s-scroll"
            type="range"
            min={10}
            max={200}
            step={5}
            value={scrollPct}
            onChange={(e) => setScrollPct(Number(e.target.value))}
            className="w-full accent-fg cursor-pointer"
          />
          <div className="flex justify-between text-xs tabular-nums text-mut" aria-hidden="true">
            <span>Slowest (10%)</span>
            <span>Fastest (200%)</span>
          </div>
          <p className="text-xs leading-relaxed text-mut">After saving, open the store to try it; visitors get it on their next visit.</p>
        </div>
      </Section>

      <SaveBar note="Checkout uses these values as soon as you save." error={formError}>
        <button type="submit" disabled={saving} className="pill pill--accent">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </SaveBar>
    </form>
  );
};
