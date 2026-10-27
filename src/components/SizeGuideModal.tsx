import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { INITIAL_PRODUCTS } from '../data/products';
import { useLanguage } from '../context/LanguageContext';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProductId?: string;
  isArabic?: boolean;
}

const MEASURE_NOTES = [
  'sizeGuide.measureOversized',
  'sizeGuide.measureChest',
  'sizeGuide.measureLength',
  'sizeGuide.measureSleeve',
  'sizeGuide.measureCare',
] as const;

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({
  isOpen,
  onClose,
  defaultProductId = 'prod-essential-hoodie-black',
}) => {
  const { t, isArabic } = useLanguage();
  const location = useLocation();
  const [selectedProductId, setSelectedProductId] = useState(defaultProductId);
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');

  useEffect(() => {
    if (defaultProductId) {
      setSelectedProductId(defaultProductId);
    }
  }, [defaultProductId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentProduct =
    INITIAL_PRODUCTS.find((p) => p.id === selectedProductId) || INITIAL_PRODUCTS[0];

  const unitLabel = unit === 'cm' ? t('sizeGuide.unitCm') : t('sizeGuide.unitInches');
  const convert = (valCm: number) => (unit === 'cm' ? String(valCm) : (valCm / 2.54).toFixed(1));
  const measured = (valCm: number) => (
    <>
      {convert(valCm)} <span className="text-xs text-mut">{unitLabel}</span>
    </>
  );

  const headCell = 'py-4 pe-6 text-start text-[13px] font-normal text-mut';
  const cell = 'py-5 pe-6 text-[15px] tabular-nums text-fg';

  return (
    <div className="fixed inset-0 z-[105] flex items-stretch justify-center md:items-center md:p-6">
      <div className="popup-scrim fixed inset-0 bg-night/85 cursor-pointer" onClick={onClose} aria-hidden="true" />

      <div
        onClick={(e) => e.stopPropagation()}
        data-surface="bone"
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        className="popup-panel relative z-10 w-full overflow-y-auto md:max-h-[90vh] md:max-w-[1000px]"
      >
        <div className="px-6 pb-10 pt-6 sm:px-12 sm:pb-12 sm:pt-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2
                id="size-guide-title"
                className="font-display text-[clamp(32px,3.6vw,48px)] font-semibold leading-[1.02] tracking-[-0.03em] text-fg"
              >
                {t('sizeGuide.title')}
              </h2>
              <p className="mt-3 max-w-[52ch] text-body">{t('sizeGuide.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-fg transition-colors hover:border-fg cursor-pointer"
              aria-label="Close modal"
              title={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Which hoodie, and which unit */}
          <div className="mt-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-line">
            <div className="flex flex-wrap gap-x-6">
              {INITIAL_PRODUCTS.map((prod) => {
                const prodName = isArabic ? (prod.nameAr || prod.nameArabic) : (prod.nameEn || prod.name);
                const active = selectedProductId === prod.id;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => setSelectedProductId(prod.id)}
                    aria-pressed={active}
                    className={`relative pb-3 text-sm transition-colors duration-300 cursor-pointer ${active ? 'text-fg' : 'text-mut hover:text-fg'}`}
                  >
                    {prodName}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 -bottom-px h-0.5 origin-left bg-fg transition-transform duration-500 ease-out-rl rtl:origin-right ${
                        active ? 'scale-x-100' : 'scale-x-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="mb-3 inline-flex rounded-full border border-line p-1">
              {(['cm', 'in'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  aria-pressed={unit === u}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    unit === u ? 'bg-fg text-bg' : 'text-mut hover:text-fg'
                  }`}
                >
                  {u === 'cm' ? t('sizeGuide.unitCm') : t('sizeGuide.unitInches')}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className={headCell}>{t('sizeGuide.colSize')}</th>
                  <th scope="col" className={headCell}>{t('sizeGuide.colChestFit')}</th>
                  <th scope="col" className={headCell}>{t('sizeGuide.colGarmentChest')}</th>
                  <th scope="col" className={headCell}>{t('sizeGuide.colGarmentLength')}</th>
                  <th scope="col" className={headCell}>{t('sizeGuide.colSleeveLength')}</th>
                  <th scope="col" className={headCell}>{t('sizeGuide.colShoulderWidth')}</th>
                  <th scope="col" className={headCell}>{t('sizeGuide.colHeight')}</th>
                  <th scope="col" className={headCell}>{t('sizeGuide.colWeight')}</th>
                </tr>
              </thead>
              <tbody>
                {currentProduct.measurements.map((m) => (
                  <tr key={m.size} className="border-b border-line transition-colors hover:bg-bg-2">
                    <th
                      scope="row"
                      className="py-5 pe-6 text-start font-display text-[28px] font-semibold leading-none tracking-[-0.02em] text-fg"
                    >
                      {m.size}
                    </th>
                    {/* Ranges stay left to right inside the Arabic table, or "102–107" shows as "107–102". */}
                    <td className="py-5 pe-6 text-sm text-accent">
                      <span dir="ltr" className="inline-block">
                        {m.size === 'L' && (isArabic ? '102–107 سم' : 'Fits chest 102–107 cm (40–42 in)')}
                        {m.size === 'XL' && (isArabic ? '112–117 سم' : 'Fits chest 112–117 cm (44–46 in)')}
                        {m.size === 'XXL' && (isArabic ? '122–127 سم' : 'Fits chest 122–127 cm (48–50 in)')}
                      </span>
                    </td>
                    <td className={cell}>{measured(m.chestWidthCm || m.chestCm / 2)}</td>
                    <td className={cell}>{measured(m.garmentLengthCm || m.lengthCm)}</td>
                    <td className={cell}>{measured(m.sleeveLengthCm || m.sleeveCm)}</td>
                    <td className={cell}>{measured(m.shoulderCm)}</td>
                    <td className="py-5 pe-6 text-sm text-mut">
                      <span dir="ltr" className="inline-block">
                        {isArabic ? m.recommendedHeightCm.replace('cm', 'سم') : m.recommendedHeightCm}
                      </span>
                    </td>
                    <td className="py-5 pe-6 text-sm text-mut">
                      <span dir="ltr" className="inline-block">
                        {isArabic ? m.recommendedWeightKg.replace('kg', 'كجم') : m.recommendedWeightKg}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <h3 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-fg">
              {t('sizeGuide.howWeMeasure')}
            </h3>
            <ul className="space-y-3 text-sm leading-relaxed text-body">
              {MEASURE_NOTES.map((key) => (
                <li key={key} className="flex gap-3">
                  <span aria-hidden="true" className="mt-[0.75em] h-px w-4 shrink-0 bg-clay" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
