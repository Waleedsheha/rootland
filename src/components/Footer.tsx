import React, { useEffect, useRef, useState } from 'react';
import { StoreSettingsService } from '../services/storeSettingsService';
import { useLanguage } from '../context/LanguageContext';
import { PixelStrip } from './ui/PixelStrip';
import { RootlandMark3D } from './RootlandMark3D';
import { gsap, EASE, hasFinePointer } from '../motion/gsap';
import { getLenis } from '../motion/SmoothScroll';

interface FooterProps {
  onNavigate: (route: string, param?: string) => void;
  onOpenSizeGuide: () => void;
  onOpenAIFit: () => void;
  isArabic?: boolean;
  /** Surface of the page above, so the footer can open with a pixel strip when it flips. */
  fromSurface?: 'night' | 'bone';
}

const linkClass = 'inline-block py-1.5 md:py-0 text-mut hover:text-fg transition-colors duration-300 cursor-pointer text-start';

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenSizeGuide, onOpenAIFit, fromSurface = 'night' }) => {
  const { t, isArabic } = useLanguage();
  const [settings, setSettings] = useState(() => StoreSettingsService.getSettingsSync());
  const maskRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    StoreSettingsService.getSettings().then(setSettings);
    const handleSettingsUpdated = () => setSettings(StoreSettingsService.getSettingsSync());
    window.addEventListener('rootland_settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('rootland_settings_updated', handleSettingsUpdated);
  }, []);

  // Wordmark swap: grey copy exits upward, the clay twin rises; the mask drifts toward the cursor.
  const onWordEnter = () => {
    gsap.to(stackRef.current, { yPercent: -50, duration: 0.6, ease: EASE });
  };
  const onWordMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasFinePointer() || !maskRef.current) return;
    const rect = maskRef.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.12;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.12;
    gsap.to(maskRef.current, { x: dx, y: dy, duration: 0.6, ease: 'power3.out' });
  };
  const onWordLeave = () => {
    gsap.to(stackRef.current, { yPercent: 0, duration: 0.6, ease: EASE });
    gsap.to(maskRef.current, { x: 0, y: 0, duration: 0.8, ease: 'power3.out' });
  };

  const backToTop = () => {
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(0, { duration: 1.6 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const socials = [
    { label: 'Instagram', url: settings.instagramUrl },
    { label: 'Facebook', url: settings.facebookUrl },
    { label: 'TikTok', url: settings.tiktokUrl },
  ].filter((s) => s.url && s.url.trim());

  const word = isArabic ? 'روت لاند' : 'Rootland';
  const wordHeight = isArabic ? '1.3em' : '0.9em';

  return (
    <footer data-surface="night">
      {fromSurface === 'bone' && <PixelStrip from="bone" to="night" />}

      <div className="gutter pt-[clamp(40px,7vh,80px)] pb-6">
        {/* The 3D mark above the giant wordmark with its clay twin */}
        <div className="pb-[clamp(48px,9vh,110px)] flex flex-col items-center text-center">
          <div className="mb-[clamp(12px,2.5vh,28px)]">
            <RootlandMark3D />
          </div>
          <div
            ref={maskRef}
            onPointerEnter={onWordEnter}
            onPointerMove={onWordMove}
            onPointerLeave={onWordLeave}
            data-hover
            className="t-giant overflow-hidden select-none"
            style={{ height: wordHeight }}
            aria-hidden="true"
          >
            <div ref={stackRef}>
              <div className="text-fg" style={{ height: wordHeight }}>
                {word}
              </div>
              <div className="text-accent" style={{ height: wordHeight }}>
                {word}
              </div>
            </div>
          </div>
          <p className="sr-only">ROOTLAND</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 text-sm">
          <div className="space-y-4">
            <h2 className="t-label text-fg">{t('footer.collectionTitle')}</h2>
            <ul className="space-y-2.5">
              <li>
                <button type="button" onClick={() => onNavigate('shop')} className={linkClass}>
                  {t('footer.allHoodies')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('product', 'rootland-essential-hoodie-black')} className={linkClass}>
                  {t('footer.essentialBlack')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('product', 'rootland-essential-hoodie-whitegrey')} className={linkClass}>
                  {t('footer.essentialWhitegrey')}
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenAIFit} className={linkClass}>
                  {t('nav.aiFit')}
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="t-label text-fg">{t('footer.clientServiceTitle')}</h2>
            <ul className="space-y-2.5">
              <li>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenSizeGuide();
                    window.dispatchEvent(
                      new CustomEvent('rootland_open_size_guide', {
                        detail: { productId: 'prod-essential-hoodie-black' },
                      }),
                    );
                  }}
                  className={linkClass}
                  aria-label="Size Guide & CM Charts"
                >
                  {t('footer.sizeGuide')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('track-order')} className={linkClass}>
                  {t('footer.trackOrder')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('shipping-returns')} className={linkClass}>
                  {t('footer.shippingReturns')}
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="t-label text-fg">{t('footer.legalTitle')}</h2>
            <ul className="space-y-2.5">
              <li>
                <button type="button" onClick={() => onNavigate('b2b', 'pricing')} className={linkClass}>
                  {t('footer.b2bPricing')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('privacy')} className={linkClass}>
                  {t('footer.privacy')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('terms')} className={linkClass}>
                  {t('footer.terms')}
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="t-label text-fg">{t('footer.contactTitle')}</h2>
            <ul className="space-y-2.5">
              <li>
                <a href="https://wa.me/201119509756" target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {t('whatsapp.label')} ↗
                </a>
              </li>
              <li>
                <a href="tel:+201119509756" dir="ltr" className={linkClass}>
                  {t('footer.contactPhone')}
                </a>
              </li>
              <li>
                <a href="mailto:info@rootland.store" className={linkClass}>
                  {t('footer.contactEmail')}
                </a>
              </li>
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" lang="en" className={linkClass}>
                    {s.label} ↗
                  </a>
                </li>
              ))}
              <li className="flex items-center gap-2 pt-1 text-mut">
                <span aria-hidden="true" className="blink inline-block w-2 h-2 rounded-full bg-accent" />
                <span>{t('footer.status')}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-[clamp(48px,9vh,110px)] border-t border-line pt-5 flex flex-col md:flex-row items-center justify-between gap-4 t-label text-mut">
          <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
          <span className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
            <span>{t('footer.sealComposition')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('footer.sealOrigin')}</span>
          </span>
          <button type="button" onClick={backToTop} className="py-2 hover:text-fg transition-colors cursor-pointer">
            {t('footer.backToTop')} ↑
          </button>
        </div>
        <p className="mt-4 flex flex-wrap justify-center items-center gap-x-4 gap-y-1 t-label text-mut">
          <span>
            {t('footer.siteBy')}{' '}
            <a href="https://syvursoft.com" target="_blank" rel="noopener noreferrer" lang="en" className={linkClass}>
              Syvursoft ↗
            </a>
          </span>
          <span aria-hidden="true">·</span>
          <span>{t('footer.siteByPerson')}</span>
        </p>
      </div>
    </footer>
  );
};
