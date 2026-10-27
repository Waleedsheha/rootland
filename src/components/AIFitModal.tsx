import React, { useState } from 'react';
import { X, Check, ArrowRight, Loader2 } from 'lucide-react';
import { Product, FitProfile, FitRecommendation } from '../types';
import { FitRecommendationService } from '../services/fitRecommendationService';
import { AuthService } from '../services/authService';
import { useToast } from './Toast';
import { useLanguage } from '../context/LanguageContext';

interface AIFitModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProduct?: Product;
  onSelectRecommendedSize?: (size: 'L' | 'XL' | 'XXL') => void;
  isArabic?: boolean;
}

/** A measurement typed as big numerals over a single rule, with its unit at the end. */
function NumberField({
  id,
  label,
  unit,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="group">
      <label htmlFor={id} className="text-[13px] text-mut transition-colors duration-300 group-focus-within:text-fg">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="field-line w-full rounded-none border-0 border-b border-line-strong bg-transparent px-0 pb-2 pe-10 font-display text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-fg focus:outline-none"
        />
        <span className="pointer-events-none absolute bottom-3 end-0 text-sm text-mut">{unit}</span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left scale-x-0 bg-clay transition-transform duration-500 ease-out-rl group-focus-within:scale-x-100 rtl:origin-right"
        />
      </div>
    </div>
  );
}

/** One answer from a short list, as pill buttons. */
function Choice<T extends string>({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: readonly { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className="text-[13px] text-mut">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`rounded-full border px-4 py-2 text-sm transition-colors duration-300 cursor-pointer ${
              value === option.value ? 'border-fg bg-fg text-bg' : 'border-line text-fg hover:border-fg'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const AIFitModal: React.FC<AIFitModalProps> = ({
  isOpen,
  onClose,
  targetProduct,
  onSelectRecommendedSize,
}) => {
  const { t, isArabic } = useLanguage();
  const { showToast } = useToast();
  const savedUser = AuthService.getCurrentUser();

  const [heightCm, setHeightCm] = useState<number>(savedUser?.savedFitProfile?.heightCm || 178);
  const [weightKg, setWeightKg] = useState<number>(savedUser?.savedFitProfile?.weightKg || 78);
  const [ageRange, setAgeRange] = useState<'18-24' | '25-34' | '35-44' | '45+'>(
    savedUser?.savedFitProfile?.ageRange || '25-34'
  );
  const [bodyType, setBodyType] = useState<'slim' | 'athletic' | 'average' | 'stocky'>(
    savedUser?.savedFitProfile?.bodyType || 'average'
  );
  const [normalSize, setNormalSize] = useState<'L' | 'XL' | 'XXL'>('L');
  const [desiredFit, setDesiredFit] = useState<'slim' | 'regular' | 'oversized'>(
    savedUser?.savedFitProfile?.desiredFit || 'regular'
  );

  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [uploadedPhotoName, setUploadedPhotoName] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<FitRecommendation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  if (!isOpen) return null;

  const handleRunRecommendation = () => {
    setIsCalculating(true);
    const profile: FitProfile = {
      heightCm,
      weightKg,
      ageRange,
      bodyType,
      normalClothingSize: normalSize,
      desiredFit,
      genderPreference: 'unisex',
      photoUploaded: !!uploadedPhotoName,
    };

    setTimeout(() => {
      const rec = FitRecommendationService.calculateRecommendation(profile, targetProduct, isArabic ? 'ar' : 'en');
      setRecommendation(rec);
      setIsCalculating(false);
      AuthService.saveFitProfile(profile).catch((err) => {
        console.error('[AIFitModal] fit profile could not be saved:', err);
        showToast(
          isArabic ? 'لم يتم حفظ المقاسات' : 'Fit profile not saved',
          isArabic ? 'ظهرت التوصية، لكن تعذر حفظ إجاباتك في حسابك.' : 'Your recommendation is ready, but your answers could not be saved to your account.',
          'error'
        );
      });
    }, 450);
  };

  const handleApplySize = (size: 'L' | 'XL' | 'XXL') => {
    if (onSelectRecommendedSize) {
      onSelectRecommendedSize(size);
    }
    showToast(t('toast.sizeSelected'), t('toast.sizeSelectedMsg', { size }), 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-stretch justify-center md:items-center md:p-6">
      <div className="popup-scrim fixed inset-0 bg-night/85 cursor-pointer" onClick={onClose} />

      <div
        data-surface="bone"
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-labelledby="fit-title"
        className="popup-panel relative z-10 w-full overflow-y-auto md:max-h-[92vh] md:max-w-[640px]"
      >
        <div className="px-6 pb-10 pt-6 sm:px-12 sm:pb-12 sm:pt-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2
                id="fit-title"
                className="font-display text-[clamp(32px,3.6vw,44px)] font-semibold leading-[1.02] tracking-[-0.03em] text-fg"
              >
                {t('aiFit.title')}
              </h2>
              <p className="mt-3 max-w-[46ch] text-body">{t('aiFit.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-fg transition-colors hover:border-fg cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-x-8">
            <NumberField id="fit-height" label={t('aiFit.heightLabel')} unit={isArabic ? 'سم' : 'cm'} value={heightCm} min={140} max={220} onChange={setHeightCm} />
            <NumberField id="fit-weight" label={t('aiFit.weightLabel')} unit={isArabic ? 'كجم' : 'kg'} value={weightKg} min={40} max={160} onChange={setWeightKg} />
          </div>

          <div className="mt-10 space-y-8">
            <Choice
              id="fit-age"
              label={t('aiFit.ageLabel')}
              value={ageRange}
              onChange={setAgeRange}
              options={[
                // Ranges read left to right in Arabic too, or "18–24" shows as "24–18".
                { value: '18-24', label: <span dir="ltr">18–24</span> },
                { value: '25-34', label: <span dir="ltr">25–34</span> },
                { value: '35-44', label: <span dir="ltr">35–44</span> },
                { value: '45+', label: <span dir="ltr">45+</span> },
              ]}
            />
            <Choice
              id="fit-build"
              label={t('aiFit.bodyTypeLabel')}
              value={bodyType}
              onChange={setBodyType}
              options={[
                { value: 'slim', label: t('aiFit.bodySlim') },
                { value: 'average', label: t('aiFit.bodyAverage') },
                { value: 'athletic', label: t('aiFit.bodyAthletic') },
                { value: 'stocky', label: t('aiFit.bodyStocky') },
              ]}
            />
            <Choice
              id="fit-usual"
              label={t('aiFit.normalSizeLabel')}
              value={normalSize}
              onChange={setNormalSize}
              options={[
                { value: 'L', label: 'L' },
                { value: 'XL', label: 'XL' },
                { value: 'XXL', label: 'XXL' },
              ]}
            />
            <Choice
              id="fit-volume"
              label={t('aiFit.desiredFitLabel')}
              value={desiredFit}
              onChange={setDesiredFit}
              options={[
                { value: 'slim', label: t('aiFit.fitSlim') },
                { value: 'regular', label: t('aiFit.fitRegular') },
                { value: 'oversized', label: t('aiFit.fitOversized') },
              ]}
            />
          </div>

          <button
            type="button"
            onClick={handleRunRecommendation}
            disabled={isCalculating}
            className="pill pill--solid mt-10 w-full !py-[18px]"
          >
            {isCalculating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>{isCalculating ? t('aiFit.calculating') : t('aiFit.calculateBtn')}</span>
            {!isCalculating && <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />}
          </button>

          {recommendation && (
            <div className="mt-10 border-t border-line pt-8" aria-live="polite">
              <p className="text-sm text-mut">{t('aiFit.recommendationTitle')}</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-6">
                <span className="font-display text-[clamp(72px,10vw,112px)] font-semibold leading-[0.85] tracking-[-0.04em] text-fg">
                  {recommendation.recommendedSize}
                </span>
                <button
                  type="button"
                  onClick={() => handleApplySize(recommendation.recommendedSize as any)}
                  className="pill pill--accent"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>{t('aiFit.applySize', { size: recommendation.recommendedSize })}</span>
                </button>
              </div>
              <p className="mt-6 max-w-[56ch] leading-relaxed text-body">
                {recommendation.fitExplanation}
                {recommendation.alternativeExplanation ? ` ${recommendation.alternativeExplanation}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
