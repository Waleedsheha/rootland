import { useEffect, useRef } from 'react';
import { gsap, useGSAP, prefersReducedMotion, EASE, EASE_OUT } from '../../motion/gsap';
import { lockScroll } from '../../motion/SmoothScroll';
import { useLanguage } from '../../context/LanguageContext';
import { Product } from '../../types';
import { productName } from '../../utils/productText';

interface MenuOverlayProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  wishlistCount: number;
  onNavigate: (route: string, param?: string) => void;
  onOpenAIFit: () => void;
  onOpenSearch: () => void;
  onToggleLanguage: () => void;
}

const COLS = 12;
const ROWS = 8;
const CELLS = Array.from({ length: COLS * ROWS }, (_, i) => i);

interface MenuLink {
  key: string;
  label: string;
  meta?: string;
  action: () => void;
}

/**
 * Full-screen menu: 96 night cells pop in at random, then the links rise out of
 * their masks. Escape, any link, or the header pill closes it.
 */
export function MenuOverlay({
  open,
  onClose,
  products,
  wishlistCount,
  onNavigate,
  onOpenAIFit,
  onOpenSearch,
  onToggleLanguage,
}: MenuOverlayProps) {
  const { t, isArabic, formatPrice } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLButtonElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);

  const links: MenuLink[] = [
    { key: 'shop', label: t('menu.shop'), action: () => onNavigate('shop') },
    ...products.map((p) => ({
      key: p.id,
      label: productName(p, isArabic),
      meta: formatPrice(p.salePrice && p.salePrice < p.price ? p.salePrice : p.price),
      action: () => onNavigate('product', p.slug),
    })),
    { key: 'fit', label: t('menu.fit'), action: onOpenAIFit },
  ];

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const cells = root.querySelectorAll('[data-cell]');
      const items = root.querySelectorAll('[data-menu-item]');
      const reduced = prefersReducedMotion();
      gsap.set(root, { autoAlpha: 0 });
      gsap.set(cells, { scale: 0 });
      gsap.set(items, { yPercent: 110 });

      const tl = gsap.timeline({ paused: true });
      if (reduced) {
        tl.set(cells, { scale: 1 })
          .set(items, { yPercent: 0 })
          .to(root, { autoAlpha: 1, duration: 0.3, ease: 'none' });
      } else {
        tl.set(root, { autoAlpha: 1 })
          .to(cells, { scale: 1, duration: 0.45, ease: EASE, stagger: { each: 0.006, from: 'random' } })
          .to(items, { yPercent: 0, duration: 0.9, ease: EASE_OUT, stagger: 0.06 }, 0.4);
      }
      timeline.current = tl;
    },
    { scope: rootRef },
  );

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const tl = timeline.current;
    if (!tl || !open) return;
    tl.timeScale(1).play();
    lockScroll(true);
    const focusTimer = window.setTimeout(() => firstLinkRef.current?.focus(), 450);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
      tl.timeScale(2.2).reverse();
      lockScroll(false);
    };
  }, [open]);

  return (
    <div
      id="site-menu"
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.menu')}
      aria-hidden={!open}
      data-surface="night"
      className={`fixed inset-0 z-[90] !bg-transparent ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
      >
        {CELLS.map((i) => (
          <span key={i} data-cell className="block bg-night-2" style={{ marginRight: -1, marginBottom: -1 }} />
        ))}
      </div>

      <nav
        className="relative h-full gutter flex flex-col justify-end gap-8 pb-8 pt-28 overflow-y-auto"
        data-lenis-prevent
      >
        <ul className="flex flex-col">
          {links.map((link, i) => (
            <li key={link.key} className="overflow-hidden">
              <div data-menu-item>
                <button
                  ref={i === 0 ? firstLinkRef : undefined}
                  type="button"
                  tabIndex={open ? 0 : -1}
                  onClick={link.action}
                  className="group flex items-baseline gap-4 w-full text-start cursor-pointer text-fg hover:text-white transition-colors duration-300"
                >
                  <span
                    className="font-display font-semibold uppercase tracking-[-0.03em] leading-[1.02] transition-transform duration-500 ease-rl group-hover:translate-x-[clamp(10px,1.8vw,26px)] rtl:group-hover:-translate-x-[clamp(10px,1.8vw,26px)] [&:lang(ar)]:font-bold [&:lang(ar)]:normal-case [&:lang(ar)]:tracking-normal [&:lang(ar)]:leading-[1.3]"
                    style={{ fontSize: 'clamp(30px, min(6vw, 7.2vh), 84px)' }}
                  >
                    {link.label}
                  </span>
                  {link.meta && <span className="t-counter text-mut ms-auto hidden sm:inline">{link.meta}</span>}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="overflow-hidden border-t border-line pt-5">
          <div data-menu-item className="flex flex-wrap items-center gap-x-6 gap-y-3 t-label text-mut">
            <button type="button" tabIndex={open ? 0 : -1} onClick={onOpenSearch} className="hover:text-fg transition-colors cursor-pointer">
              {t('menu.search')}
            </button>
            <button type="button" tabIndex={open ? 0 : -1} onClick={() => onNavigate('account')} className="hover:text-fg transition-colors cursor-pointer">
              {t('nav.account')}
            </button>
            <button type="button" tabIndex={open ? 0 : -1} onClick={() => onNavigate('account', 'wishlist')} className="hover:text-fg transition-colors cursor-pointer">
              {t('nav.wishlist')} <span className="t-counter text-accent">{wishlistCount}</span>
            </button>
            <button type="button" tabIndex={open ? 0 : -1} onClick={onToggleLanguage} className="hover:text-fg transition-colors cursor-pointer">
              <span lang={isArabic ? 'en' : 'ar'}>{t('nav.langToggle')}</span>
            </button>
            <span className="hidden md:inline text-line-strong" aria-hidden="true">/</span>
            <a tabIndex={open ? 0 : -1} href="https://wa.me/201119509756" target="_blank" rel="noopener noreferrer" className="hover:text-fg transition-colors">
              {t('whatsapp.label')}
            </a>
            <a tabIndex={open ? 0 : -1} href="tel:+201119509756" dir="ltr" className="hover:text-fg transition-colors">
              {t('footer.contactPhone')}
            </a>
            <a tabIndex={open ? 0 : -1} href="mailto:info@rootland.store" dir="ltr" className="hover:text-fg transition-colors normal-case">
              {t('footer.contactEmail')}
            </a>
          </div>
        </div>
      </nav>
    </div>
  );
}
