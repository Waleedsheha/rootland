import { useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { FINE_POINTER, ScrollTrigger, gsap, hasFinePointer, useGSAP } from '../../motion/gsap';
import { FillRow } from '../ui/FillRow';

interface Spec {
  key: string;
  src: string;
  width: number;
  height: number;
  altEn: string;
  altAr: string;
}

const SPECS: Spec[] = [
  {
    key: 'spec1',
    // Pexels photo 4264828 (Pexels licence: free for commercial use, no credit required).
    src: '/src/assets/images/cotton_boll.webp',
    width: 1200,
    height: 900,
    altEn: 'A ripe cotton boll in the field',
    altAr: 'لوزة قطن ناضجة في الحقل',
  },
  {
    key: 'spec2',
    src: '/src/assets/images/lifestyle_cairo_cafe.webp',
    width: 1280,
    height: 720,
    altEn: 'A man and a woman in the same oversized hoodie at a Cairo café',
    altAr: 'رجل وامرأة بنفس الهودي الأوفر سايز في كافيه بالقاهرة',
  },
  {
    key: 'spec3',
    src: '/src/assets/images/hoodie_hood_detail.webp',
    width: 1080,
    height: 810,
    altEn: 'Close-up of the hood: no drawstrings, no eyelets',
    altAr: 'لقطة قريبة للقلنسوة: بدون أربطة وبدون فتحات',
  },
  {
    key: 'spec4',
    src: '/src/assets/images/hoodie_essential_whitegrey.webp',
    width: 1200,
    height: 900,
    altEn: 'The off-white hoodie laid flat with no logo or print',
    altAr: 'الهودي الأوف وايت مفروداً بدون شعار أو طباعة',
  },
  {
    key: 'spec5',
    src: '/src/assets/images/egypt_giza_sunset.webp',
    width: 1200,
    height: 900,
    altEn: 'The Sphinx and a pyramid at Giza at sunset',
    altAr: 'أبو الهول والهرم في الجيزة وقت الغروب',
  },
];

/**
 * "Plain, on purpose": five spec rows beside one photo panel. The panel
 * crossfades to the row's photo on hover (fine pointers) or as the row
 * crosses 60% of the viewport (touch). Below lg the panel sticks to the top
 * while the rows scroll under it.
 */
export function BuiltPlain() {
  const { t, isArabic } = useLanguage();
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const list = listRef.current;
      if (!list) return;
      const mm = gsap.matchMedia();
      mm.add(`not all and ${FINE_POINTER}`, () => {
        Array.from(list.children).forEach((row, i) => {
          ScrollTrigger.create({
            trigger: row,
            start: 'top 60%',
            end: 'bottom 60%',
            onToggle: (self) => {
              if (self.isActive) setActive(i);
            },
          });
        });
      });
    },
    { scope: listRef },
  );

  const hover = (i: number) => {
    if (hasFinePointer()) setActive(i);
  };

  return (
    <section data-surface="bone" className="gutter section">
      <div className="grid gap-x-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="lg:col-start-1 lg:row-start-1">
          <h2 key={`reveal-1-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg mb-10" data-reveal-lines>
            {t('home.specTitle')} <span className="text-accent">{t('home.specTitleAccent')}</span>
          </h2>
        </div>

        <figure className="sticky top-0 z-10 self-start bg-bg pt-3 pb-6 lg:static lg:z-auto lg:p-0 lg:self-end lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <div className="relative overflow-hidden bg-ghost aspect-[4/3] max-h-[42svh] lg:max-h-none">
            {SPECS.map((spec, i) => (
              <img
                key={spec.key}
                src={spec.src}
                alt={isArabic ? spec.altAr : spec.altEn}
                width={spec.width}
                height={spec.height}
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-700 ease-out-rl motion-reduce:transition-none ${
                  i === active ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.06]'
                }`}
              />
            ))}
          </div>
        </figure>

        <div ref={listRef} className="border-b border-line lg:col-start-1 lg:row-start-2">
          {SPECS.map((spec, i) => (
            <FillRow key={spec.key} className="px-4 py-7" onEnter={() => hover(i)}>
              <div className="grid items-baseline gap-4 grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
                <span className="t-row text-fg">{t(`home.${spec.key}Title`)}</span>
                <span className="text-sm text-mut hidden sm:block">{t(`home.${spec.key}Body`)}</span>
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full transition-colors ${i === active ? 'bg-accent' : 'bg-line-strong'}`}
                />
              </div>
              <span className="text-sm text-mut sm:hidden block mt-2">{t(`home.${spec.key}Body`)}</span>
            </FillRow>
          ))}
        </div>
      </div>
    </section>
  );
}
