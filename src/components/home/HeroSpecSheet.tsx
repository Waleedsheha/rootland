import React, { useEffect, useRef, useState } from 'react';
import { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { gsap, ScrollTrigger, prefersReducedMotion, EASE_OUT } from '../../motion/gsap';
import { activePrice, productName } from '../../utils/productText';
import {
  BLACK_H,
  BLACK_RATIO,
  BLACK_W,
  DIMS,
  FRAME_H,
  FRAME_W,
  PHONE_DIMS,
  RISE_FROM,
  WHITE_RATIO,
  phoneSpecSheetState,
  specSheetState,
  type ChestWidths,
  type DimAnchor,
  type DimState,
} from '../../film/specSheetTimeline';

const BLACK_SLUG = 'rootland-essential-hoodie-black';
const WHITE_SLUG = 'rootland-essential-hoodie-whitegrey';
const BLACK_SRC = '/src/assets/images/hoodie_cutout_black.webp';
const WHITE_SRC = '/src/assets/images/hoodie_cutout_offwhite.webp';
const SIZE_LABELS = ['L', 'XL', 'XXL'] as const;
/** Phones, and any portrait screen, get the horizontal seam. */
const PHONE_QUERY = '(max-width: 767px), (orientation: portrait)';
/** Clay for every dimension line; bone line-strong for extension lines. */
const DIM_STROKE = '#c8642a';
const EXT_STROKE = 'rgba(12,12,12,0.38)';

type DimKey = 'length' | 'chest' | 'sleeve';
const DESKTOP_DIMS: DimKey[] = ['length', 'chest', 'sleeve'];
const PHONE_DIM_KEYS: DimKey[] = ['length', 'chest'];

interface Spec {
  length: number[];
  chest: ChestWidths;
  sleeve: number[];
  fit: string[];
}

/** The black hoodie's garment measurements for L, XL and XXL, or null if any is missing (the hero then skips the measuring). */
function specOf(product: Product | undefined): Spec | null {
  if (!product) return null;
  const grades: { length: number; chest: number; sleeve: number; fit: string }[] = [];
  for (const size of SIZE_LABELS) {
    const m = product.measurements.find((row) => row.size === size);
    if (!m || m.garmentLengthCm === undefined || m.chestWidthCm === undefined || m.sleeveLengthCm === undefined || m.standardUkUsChest === undefined) {
      return null;
    }
    grades.push({ length: m.garmentLengthCm, chest: m.chestWidthCm, sleeve: m.sleeveLengthCm, fit: m.standardUkUsChest });
  }
  return {
    length: grades.map((g) => g.length),
    chest: [grades[0].chest, grades[1].chest, grades[2].chest],
    sleeve: grades.map((g) => g.sleeve),
    fit: grades.map((g) => g.fit),
  };
}

interface HeroSpecSheetProps {
  products: Product[];
  title: string;
  subtitle: string;
  ctaLabel: string;
  onShop: () => void;
  onOpenFit: () => void;
  onSelectProduct: (product: Product) => void;
}

/**
 * The pinned hero, scrubbed by scroll: bone sweeps across and becomes a spec sheet,
 * the black hoodie is measured on it, night returns with the off-white, and a size
 * row (L → XL → XXL) steps under the off-white while the black hoodie shows the current
 * size above it; then both settle above the headline. Desktop splits the
 * screen with a vertical seam; phones and portrait screens with a horizontal one.
 */
export function HeroSpecSheet({ products, title, subtitle, ctaLabel, onShop, onOpenFit, onSelectProduct }: HeroSpecSheetProps) {
  const { t, isArabic, dir, formatPrice, formatNumber } = useLanguage();
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const r = {
    bone: useRef<HTMLDivElement>(null),
    inkNight: useRef<HTMLDivElement>(null),
    inkBone: useRef<HTMLDivElement>(null),
    black: useRef<HTMLButtonElement>(null),
    dims: useRef<SVGSVGElement>(null),
    white: useRef<HTMLButtonElement>(null),
    stepper: useRef<HTMLDivElement>(null),
    stepperBlack: useRef<HTMLDivElement>(null),
    labelBlack: useRef<HTMLDivElement>(null),
    labelWhite: useRef<HTMLDivElement>(null),
    headline: useRef<HTMLDivElement>(null),
    hint: useRef<HTMLDivElement>(null),
  };
  const dimLabels = useRef<Record<DimKey, HTMLDivElement | null>>({ length: null, chest: null, sleeve: null });
  const dimValues = useRef<Record<DimKey, HTMLSpanElement | null>>({ length: null, chest: null, sleeve: null });
  // Phone layout depends on the rendered heights of the headline block and the size row.
  const blocks = useRef({ headline: 0, stepper: 0 });
  const lastSeam = useRef(-1);

  const blackProduct = products.find((p) => p.slug === BLACK_SLUG);
  const whiteProduct = products.find((p) => p.slug === WHITE_SLUG);
  const spec = specOf(blackProduct);
  const specRef = useRef(spec);
  specRef.current = spec;
  const dimKeys = phone ? PHONE_DIM_KEYS : DESKTOP_DIMS;

  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = () => setPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const measure = () => {
    blocks.current = {
      headline: r.headline.current ? r.headline.current.offsetHeight : 0,
      stepper: r.stepper.current ? r.stepper.current.offsetHeight : 0,
    };
  };

  const seamEvent = (detail: { seam: number; width: number; dir: string } | null) => {
    window.dispatchEvent(new CustomEvent('rootland_hero_seam', { detail }));
  };

  // Drive every layer from one progress value.
  const apply = (progress: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const rtl = dir === 'rtl';
    const mirror = (x: number) => (rtl ? W - x : x);
    const currentSpec = specRef.current;
    const chest = currentSpec ? currentSpec.chest : null;

    let seamClipBone: string;
    let seamClipNight: string;
    let wordmarkExit: [number, number];
    let hint: number;
    let black: { x: number; y: number; w: number };
    let white: { x: number; y: number; w: number; visible: boolean };
    let rise: number;
    let dims: Partial<Record<DimKey, DimState>> & { opacity: number };
    let sizeIndex: 0 | 1 | 2;
    let stepper: { opacity: number; rise: number };
    let labels: number;
    let headline: number;

    if (phone) {
      const s = phoneSpecSheetState(progress, W, H, blocks.current.headline, blocks.current.stepper, chest);
      seamClipBone = `inset(0px 0px ${H - s.seam}px 0px)`;
      seamClipNight = `inset(${s.seam}px 0px 0px 0px)`;
      if (lastSeam.current !== -2) {
        lastSeam.current = -2;
        // A horizontal seam never splits the header: it keeps its own surface probe.
        seamEvent(null);
      }
      rise = s.black.rise;
      black = { x: mirror(s.black.x), y: s.black.y + (1 - rise) * H * 0.8, w: s.black.width };
      white = { x: mirror(s.white.x), y: s.white.y, w: s.white.width, visible: s.white.visible };
      ({ wordmarkExit, hint, dims, sizeIndex, stepper, labels, headline } = s);
    } else {
      const s = specSheetState(progress, chest);
      const sx = W / FRAME_W;
      const sy = H / FRAME_H;
      const k = Math.min(sx, sy);
      const seam = s.seam * sx;
      seamClipBone = rtl ? `inset(0px 0px 0px ${W - seam}px)` : `inset(0px ${W - seam}px 0px 0px)`;
      seamClipNight = rtl ? `inset(0px ${seam}px 0px 0px)` : `inset(0px 0px 0px ${seam}px)`;
      if (Math.abs(seam - lastSeam.current) > 0.5) {
        lastSeam.current = seam;
        // Navbar listens and splits its ink at the same x.
        seamEvent({ seam, width: W, dir });
      }
      rise = s.black.rise;
      // Sizes are k-scaled design px; the cut-outs are sized directly (no scale transform) so they stay crisp.
      black = { x: mirror(s.black.x * sx), y: s.black.y * sy + (1 - rise) * RISE_FROM * sy, w: s.black.width * k };
      white = { x: mirror(s.white.x * sx), y: s.white.y * sy, w: s.white.width * k, visible: s.white.visible };
      ({ wordmarkExit, hint, dims, sizeIndex, stepper, labels, headline } = s);
    }

    // Surfaces: bone covers the start side (desktop) or the top (phones) up to the seam.
    gsap.set([r.bone.current, r.inkBone.current], { clipPath: seamClipBone });
    gsap.set(r.inkNight.current, { clipPath: seamClipNight });
    stage.querySelectorAll<HTMLElement>('[data-word="root"]').forEach((el) => gsap.set(el, { yPercent: -105 * wordmarkExit[0] }));
    stage.querySelectorAll<HTMLElement>('[data-word="land"]').forEach((el) => gsap.set(el, { yPercent: -105 * wordmarkExit[1] }));
    gsap.set(r.hint.current, { opacity: hint });

    // The hoodies and their labels exist only for products in the catalogue.
    const set = (el: Element | null, vars: gsap.TweenVars) => el && gsap.set(el, vars);
    const bh = black.w / BLACK_RATIO;
    set(r.black.current, { width: black.w, height: bh, x: black.x - black.w / 2, y: black.y - bh / 2, autoAlpha: rise > 0 ? 1 : 0 });
    const wh = white.w / WHITE_RATIO;
    set(r.white.current, { width: white.w, height: wh, x: white.x - white.w / 2, y: white.y - wh / 2, autoAlpha: white.visible ? 1 : 0 });

    // Measurements: dash progress, ticks, and labels placed from cut-out space.
    if (currentSpec && r.dims.current) {
      const svg = r.dims.current;
      // 1 CSS px lines at any rendered size.
      svg.style.setProperty('--dim-stroke', String(BLACK_W / black.w));
      gsap.set(svg, { opacity: dims.opacity });
      const perUnit = black.w / BLACK_W;
      const unit = t('sizeGuide.unitCm');
      const anchors: Record<DimKey, DimAnchor> = phone
        ? { length: PHONE_DIMS.length.anchor, chest: PHONE_DIMS.chest.anchor, sleeve: DIMS.sleeve.anchor }
        : { length: DIMS.length.anchor, chest: DIMS.chest.anchor, sleeve: DIMS.sleeve.anchor };
      dimKeys.forEach((key) => {
        const d = dims[key] as DimState;
        svg.querySelectorAll<SVGPathElement>(`[data-dim="${key}"]`).forEach((el) => (el.style.strokeDashoffset = String(1 - d.line)));
        svg.querySelectorAll<SVGPathElement>(`[data-ext="${key}"]`).forEach((el) => (el.style.strokeDashoffset = String(1 - d.extension)));
        svg.querySelectorAll<SVGPathElement>(`[data-tick="${key}"]`).forEach((el) => (el.style.opacity = d.ticks ? '1' : '0'));
        const a = anchors[key];
        const ux = (a.x - BLACK_W / 2) * perUnit;
        const lx = black.x + (rtl ? -ux : ux);
        const ly = black.y + (a.y - BLACK_H / 2) * perUnit;
        const shiftX = a.align === 'center' ? '-50%' : rtl ? '-100%' : '0%';
        const shiftY = a.edge === 'bottom' ? '-100%' : '0%';
        const labelEl = dimLabels.current[key];
        if (labelEl) {
          labelEl.style.transform = `translate3d(${lx}px, ${ly}px, 0) translate(${shiftX}, ${shiftY})`;
          labelEl.style.opacity = String(d.labelOpacity);
        }
        const values = currentSpec[key];
        const value = d.countUp < 1 ? Math.round(values[0] * d.countUp) : values[sizeIndex];
        const valueEl = dimValues.current[key];
        if (valueEl) valueEl.textContent = `${formatNumber(value)} ${unit}`;
      });

      gsap.set(r.stepper.current, { opacity: stepper.opacity, y: (1 - stepper.rise) * 18 });
      // The black hoodie's own size (only the current one) rides just above it, on bone.
      set(r.stepperBlack.current, {
        x: black.x,
        y: black.y - bh / 2 - 18 + (1 - stepper.rise) * 18,
        xPercent: -50,
        yPercent: -100,
        opacity: stepper.opacity,
      });
      [r.stepper.current, r.stepperBlack.current].forEach((row) => {
        if (!row) return;
        row.querySelectorAll<HTMLElement>('[data-size]').forEach((el) => {
          const active = Number(el.dataset.size) === sizeIndex;
          el.classList.toggle('text-fg', active);
          el.classList.toggle('text-mut', !active);
        });
        const currentEl = row.querySelector<HTMLElement>('[data-current]');
        if (currentEl) currentEl.textContent = SIZE_LABELS[sizeIndex];
        const fitEl = row.querySelector<HTMLElement>('[data-fit]');
        if (fitEl) fitEl.textContent = currentSpec.fit[sizeIndex];
      });
    }

    // Product labels: desktop under both hoodies; phones above the black one, under the off-white.
    if (phone) {
      set(r.labelBlack.current, { x: black.x, y: black.y - bh / 2 - 18, xPercent: -50, yPercent: -100, opacity: labels });
    } else {
      set(r.labelBlack.current, { x: black.x, y: black.y + bh / 2 + 18, xPercent: -50, yPercent: 0, opacity: labels });
    }
    set(r.labelWhite.current, { x: white.x, y: white.y + wh / 2 + 18, xPercent: -50, opacity: labels });
    [r.labelBlack.current, r.labelWhite.current].forEach((el) => {
      if (el) el.style.pointerEvents = labels > 0.5 ? 'auto' : 'none';
    });

    gsap.set(r.headline.current, { opacity: headline, y: (1 - headline) * 24 });
    if (r.headline.current) r.headline.current.style.pointerEvents = headline > 0.5 ? 'auto' : 'none';
    stage.querySelectorAll<HTMLElement>('[data-rail]').forEach((el) => gsap.set(el, { scaleY: progress }));
  };

  // Pin and scrub — or hold the final frame for reduced motion.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    lastSeam.current = -1;
    measure();
    let trigger: ScrollTrigger | null = null;
    const intro: gsap.core.Tween[] = [];
    const words = (word: string) => stage.querySelectorAll(`[data-word="${word}"] [data-word-intro]`);
    if (prefersReducedMotion()) {
      apply(1);
    } else {
      apply(0);
      trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=400%',
        pin: stage,
        scrub: true,
        // Sections below created their triggers first; refresh this one first so theirs include the pin's length.
        refreshPriority: 1,
        onUpdate: (self) => apply(self.progress),
      });
      ScrollTrigger.refresh();
      // Both ink copies of a word rise together.
      intro.push(
        gsap.fromTo(words('root'), { yPercent: 100 }, { yPercent: 0, duration: 1.1, ease: EASE_OUT, delay: 0.1 }),
        gsap.fromTo(words('land'), { yPercent: 100 }, { yPercent: 0, duration: 1.1, ease: EASE_OUT, delay: 0.22 }),
      );
    }
    let live = true;
    const relayout = () => {
      if (!live) return;
      measure();
      apply(trigger ? trigger.progress : 1);
    };
    window.addEventListener('resize', relayout);
    document.fonts.ready.then(relayout);
    return () => {
      live = false;
      window.removeEventListener('resize', relayout);
      intro.forEach((tween) => tween.kill());
      trigger?.kill();
      seamEvent(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir, phone]);

  const titleWords = title.trim().split(/\s+/);
  const lastWord = titleWords.pop();

  /** Rendered twice, once per surface, each clipped to its side of the seam. */
  const ink = (surface: 'night' | 'bone', ref: React.RefObject<HTMLDivElement | null>) => (
    <div ref={ref} data-surface={surface} className="absolute inset-0 pointer-events-none !bg-transparent" aria-hidden="true">
      <div className="absolute inset-0 gutter flex flex-col justify-center">
        <div className="overflow-hidden">
          <div data-word="root">
            <div data-word-intro className="t-giant text-fg">
              {isArabic ? 'روت' : 'Root'}
            </div>
          </div>
        </div>
        <div className="self-end overflow-hidden">
          <div data-word="land">
            <div data-word-intro className="t-giant text-fg">
              {isArabic ? 'لاند' : 'Land'}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-1/2 end-[calc(var(--gutter)/2)] -translate-y-1/2 h-[28vh] w-px bg-fg/25 hidden md:block">
        <span data-rail className="absolute inset-0 bg-clay origin-top" style={{ transform: 'scaleY(0)' }} />
      </div>
    </div>
  );

  const dimLabel = (key: DimKey, label: string) => {
    // Desktop's chest label sits on the black garment, so it takes night ink; phones put it under the hem, on bone.
    const onGarment = key === 'chest' && !phone;
    return (
      <div
        key={key}
        ref={(el) => {
          dimLabels.current[key] = el;
        }}
        data-surface={onGarment ? 'night' : 'bone'}
        className="absolute top-0 left-0 !bg-transparent whitespace-nowrap pointer-events-none flex flex-col gap-1"
        style={{ opacity: 0, alignItems: key === 'chest' ? 'center' : 'flex-start' }}
        aria-hidden="true"
      >
        <span className={`${phone ? 't-tag' : 't-label'} text-body`}>{label}</span>
        <span
          ref={(el) => {
            dimValues.current[key] = el;
          }}
          className="t-counter text-fg"
        />
      </div>
    );
  };

  /** L / XL / XXL with the active size lit (or only the active size), and its chest fit underneath. */
  const sizeRow = (ref: React.RefObject<HTMLDivElement | null>, className: string, surface?: 'bone', currentOnly = false) => (
    <div ref={ref} data-surface={surface} className={`${className} flex flex-col gap-3 pointer-events-none`} style={{ opacity: 0 }} aria-hidden="true">
      {currentOnly ? (
        <span data-current className="t-title text-fg" dir="ltr">
          {SIZE_LABELS[0]}
        </span>
      ) : (
        <div className={`flex items-baseline ${phone ? 'gap-5' : 'gap-[22px]'}`} dir="ltr">
          {SIZE_LABELS.map((s, i) => (
            <span key={s} data-size={i} className={`t-title ${i === 0 ? 'text-fg' : 'text-mut'} transition-colors duration-300`}>
              {s}
            </span>
          ))}
        </div>
      )}
      <span data-fit className="t-counter text-mut whitespace-nowrap" />
    </div>
  );

  const dimNames: Record<DimKey, string> = {
    length: t('sizeGuide.colGarmentLength'),
    chest: t('sizeGuide.colGarmentChest'),
    sleeve: t('sizeGuide.colSleeveLength'),
  };

  const label = (product: Product | undefined, ref: React.RefObject<HTMLDivElement | null>, surface: 'night' | 'bone') =>
    product ? (
      <div ref={ref} data-surface={surface} className="absolute top-0 left-0 w-max max-w-[78vw] text-center !bg-transparent" style={{ opacity: 0 }}>
        <button
          type="button"
          onClick={() => onSelectProduct(product)}
          className="t-label text-fg hover:text-accent transition-colors cursor-pointer py-2"
          data-hover
        >
          {productName(product, isArabic)}
        </button>
        <div className="t-counter text-mut mt-1.5">
          {formatPrice(activePrice(product))} · {product.sizes.join(' · ')}
        </div>
      </div>
    ) : null;

  const hoodie = (
    product: Product | undefined,
    ref: React.RefObject<HTMLButtonElement | null>,
    children: React.ReactNode,
  ) =>
    product ? (
      <button
        ref={ref}
        type="button"
        aria-label={productName(product, isArabic)}
        onClick={() => onSelectProduct(product)}
        data-cursor="view"
        className="absolute top-0 left-0 block cursor-pointer"
        style={{ opacity: 0, visibility: 'hidden' }}
      >
        {children}
      </button>
    ) : null;

  const ctas = (
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={onShop} className="pill">
        <span>{ctaLabel}</span>
      </button>
      <button type="button" onClick={onOpenFit} className="pill">
        <span>{t('menu.fit')}</span>
      </button>
    </div>
  );
  const heading = (
    <h1 className="t-statement text-fg max-w-[18ch]">
      {titleWords.join(' ')} <span className="text-accent">{lastWord}</span>
    </h1>
  );

  return (
    <section ref={sectionRef} data-surface="night" data-hero-seam aria-label={t('hero.aria')} className="relative">
      <div ref={stageRef} className="relative h-[100svh] w-full overflow-hidden">
        <div ref={r.bone} data-surface="bone" className="absolute inset-0" style={{ clipPath: 'inset(0px 100% 0px 0px)' }} />

        {/* The black hoodie on the bone sheet, with its measurements */}
        {hoodie(
          blackProduct,
          r.black,
          <div className="absolute inset-0" style={{ transform: dir === 'rtl' ? 'scaleX(-1)' : undefined }}>
            <img src={BLACK_SRC} alt="" width={BLACK_W} height={BLACK_H} className="absolute inset-0 h-full w-full" />
            {spec && (
              <svg ref={r.dims} viewBox={`0 0 ${BLACK_W} ${BLACK_H}`} fill="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                {dimKeys.map((key) => (
                  <g key={key}>
                    {DIMS[key].extensions.map((d) => (
                      <path key={d} d={d} data-ext={key} stroke={EXT_STROKE} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} style={{ strokeWidth: 'var(--dim-stroke)' }} />
                    ))}
                    <path d={DIMS[key].line} data-dim={key} stroke={DIM_STROKE} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} style={{ strokeWidth: 'var(--dim-stroke)' }} />
                    <path
                      d={phone && key !== 'sleeve' ? PHONE_DIMS[key].ticks : DIMS[key].ticks}
                      data-tick={key}
                      stroke={DIM_STROKE}
                      style={{ strokeWidth: 'var(--dim-stroke)', opacity: 0 }}
                    />
                  </g>
                ))}
              </svg>
            )}
          </div>,
        )}
        {spec && dimKeys.map((key) => dimLabel(key, dimNames[key]))}

        {/* The off-white rides in with night */}
        {hoodie(whiteProduct, r.white, <img src={WHITE_SRC} alt="" width={1200} height={812} className="absolute inset-0 h-full w-full" />)}

        {/* Size rows: one under the off-white on night, and on wide screens one above the black hoodie on bone
            (phones have no room above it under the header, and their single row sits under both stacked hoodies) */}
        {spec &&
          sizeRow(r.stepper, `absolute bottom-[8%] ${phone ? 'start-[var(--gutter)]' : 'start-[calc(50%+var(--gutter))]'} items-start`)}
        {spec && !phone && sizeRow(r.stepperBlack, 'absolute top-0 left-0 items-center !bg-transparent', 'bone', true)}

        {label(blackProduct, r.labelBlack, 'bone')}
        {label(whiteProduct, r.labelWhite, 'night')}

        {/* Headline: desktop splits it at the seam (h1 on bone, blurb + CTAs on night); phones stack it on night */}
        {phone ? (
          <div ref={r.headline} className="absolute inset-x-0 bottom-0 gutter pb-[6vh] flex flex-col gap-6" style={{ opacity: 0 }}>
            {heading}
            <div className="max-w-[40ch] flex flex-col items-start gap-5">
              <p className="t-blurb text-mut">{subtitle}</p>
              {ctas}
            </div>
          </div>
        ) : (
          <div ref={r.headline} className="absolute inset-x-0 bottom-0 pb-[6vh] grid grid-cols-2 items-end" style={{ opacity: 0 }}>
            <div data-surface="bone" className="!bg-transparent ps-[var(--gutter)] pe-6">
              {heading}
            </div>
            <div className="gutter">
              <div className="max-w-[40ch] space-y-5">
                <p className="t-blurb text-mut">{subtitle}</p>
                {ctas}
              </div>
            </div>
          </div>
        )}

        {ink('night', r.inkNight)}
        {ink('bone', r.inkBone)}

        <div ref={r.hint} className="absolute bottom-[4vh] inset-x-0 flex flex-col items-center gap-3 pointer-events-none" aria-hidden="true">
          <span className="t-label text-bone">{t('hero.scroll')}</span>
          <span className="block w-px h-10 bg-bone/40 overflow-hidden relative">
            <span className="absolute inset-x-0 top-0 h-1/2 bg-bone animate-[rl-scrollcue_1.6s_cubic-bezier(.83,0,.17,1)_infinite]" />
          </span>
        </div>
      </div>
    </section>
  );
}
