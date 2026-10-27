import React, { useEffect, useRef, useState } from 'react';
import { X, User, ShieldCheck } from 'lucide-react';
import { CartService } from '../services/cartService';
import { AuthService } from '../services/authService';
import { RootlandIcon } from './RootlandLogo';
import { MenuOverlay } from './chrome/MenuOverlay';
import { useLanguage } from '../context/LanguageContext';
import { SiteContentService, StoreSettingsService } from '../services/storeSettingsService';
import { Product } from '../types';

interface NavbarProps {
  currentRoute: string;
  onNavigate: (route: string, param?: string) => void;
  onOpenCart: () => void;
  onOpenSearch: () => void;
  onOpenAIFit: () => void;
  /** Opens the sign-in / create-account window. */
  onOpenAuth: () => void;
  /** Opens the same window on the create-account form. */
  onCreateAccount: () => void;
  products: Product[];
  isAdmin?: boolean;
  isArabic?: boolean;
  onToggleLanguage?: () => void;
}

type Surface = 'night' | 'bone';
interface HeroSeam {
  seam: number;
  width: number;
  dir: string;
}

/**
 * Fixed, transparent header: wordmark at the start, language / sign-in / bag / menu
 * pills at the end. It re-inks itself to the surface of whatever band sits beneath it,
 * hides while scrolling down and returns on the way up.
 */
export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  onOpenCart,
  onOpenSearch,
  onOpenAIFit,
  onOpenAuth,
  onCreateAccount,
  products,
  isAdmin = false,
  onToggleLanguage,
}) => {
  const { t, isArabic, toggleLang } = useLanguage();
  const [signedIn, setSignedIn] = useState(() => Boolean(AuthService.getCurrentUser()));
  const [isStaff, setIsStaff] = useState(() => AuthService.getStaffRole() !== null);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [compact, setCompact] = useState(false);
  const [surface, setSurface] = useState<Surface>('night');
  // True while the bar sits over moving imagery: it then carries its own scrim.
  const [onMedia, setOnMedia] = useState(false);
  // The home hero's vertical seam (bone on the start side up to `seam` px). Over the hero the bar splits its ink there.
  const [heroSeam, setHeroSeam] = useState<HeroSeam | null>(null);
  const [overHero, setOverHero] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [siteContent, setSiteContent] = useState(() => SiteContentService.getContentSync());
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    () => StoreSettingsService.getSettingsSync().freeShippingThreshold,
  );
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    SiteContentService.getContent().then(setSiteContent);
    const onContent = () => setSiteContent(SiteContentService.getContentSync());
    const onSettings = () => setFreeShippingThreshold(StoreSettingsService.getSettingsSync().freeShippingThreshold);
    window.addEventListener('rootland_content_updated', onContent);
    window.addEventListener('rootland_settings_updated', onSettings);
    return () => {
      window.removeEventListener('rootland_content_updated', onContent);
      window.removeEventListener('rootland_settings_updated', onSettings);
    };
  }, []);

  useEffect(() => {
    const updateCounts = () => {
      const cart = CartService.getCart();
      setCartCount(cart.items.reduce((sum, item) => sum + item.quantity, 0));
      setWishlistCount(AuthService.getWishlist().length);
    };
    updateCounts();
    window.addEventListener('kemet_cart_updated', updateCounts);
    window.addEventListener('rootland_wishlist_updated', updateCounts);
    return () => {
      window.removeEventListener('kemet_cart_updated', updateCounts);
      window.removeEventListener('rootland_wishlist_updated', updateCounts);
    };
  }, []);

  useEffect(() => {
    const onAuth = () => {
      setSignedIn(Boolean(AuthService.getCurrentUser()));
      setIsStaff(AuthService.getStaffRole() !== null);
    };
    window.addEventListener('rootland_auth_updated', onAuth);
    return () => window.removeEventListener('rootland_auth_updated', onAuth);
  }, []);

  // Scroll direction + the surface under the header bar.
  useEffect(() => {
    if (isAdmin) return;
    let lastY = window.scrollY;
    let frame = 0;

    const probe = () => {
      frame = 0;
      const y = window.scrollY;
      setCompact(y > 40);
      if (y > lastY + 4 && y > 160) setHidden(true);
      else if (y < lastY - 4) setHidden(false);
      lastY = y;

      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const probeY = Math.max(rect.top + rect.height / 2, 1);
      const under = document
        .elementsFromPoint(window.innerWidth / 2, probeY)
        .find((el) => !bar.contains(el));
      const surfaceEl = under?.closest('[data-surface]');
      const next = surfaceEl?.getAttribute('data-surface');
      if (next === 'night' || next === 'bone') setSurface(next);
      setOnMedia(Boolean(surfaceEl?.hasAttribute('data-media')));
      setOverHero(Boolean(under?.closest('[data-hero-seam]')));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(probe);
    };

    probe();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [isAdmin, currentRoute]);

  useEffect(() => {
    const onSeam = (e: Event) => setHeroSeam((e as CustomEvent<HeroSeam | null>).detail);
    window.addEventListener('rootland_hero_seam', onSeam);
    return () => window.removeEventListener('rootland_hero_seam', onSeam);
  }, []);

  // A new route starts with the header visible.
  useEffect(() => {
    setHidden(false);
    setMenuOpen(false);
  }, [currentRoute]);

  const handleLang = () => {
    if (onToggleLanguage) onToggleLanguage();
    else toggleLang();
  };

  const announcement = SiteContentService.pick(
    siteContent,
    'announcement',
    isArabic,
    t('announcement.freeShipping', { amount: freeShippingThreshold.toLocaleString('en-US') }),
  );

  const barSurface: Surface = menuOpen || isAdmin ? 'night' : surface;
  const scrim = onMedia && !menuOpen;
  const pillClass = `pill pill--sm ${scrim ? '!bg-night/70 !border-bone/30' : ''}`;

  // Over the hero the bar is drawn twice, once per surface, each clipped to its side of the seam.
  const split = heroSeam !== null && overHero && !menuOpen && !isAdmin;
  const seamClip = (side: Surface) => {
    if (!heroSeam) return undefined;
    const { seam, width, dir } = heroSeam;
    const rest = width - seam;
    if (dir === 'rtl') return side === 'bone' ? `inset(0px 0px 0px ${rest}px)` : `inset(0px ${seam}px 0px 0px)`;
    return side === 'bone' ? `inset(0px ${rest}px 0px 0px)` : `inset(0px 0px 0px ${seam}px)`;
  };

  /** The bar's contents. The mirror copy is only ink: hidden from assistive tech and the tab order, but clickable. */
  const bar = (mirror: boolean) => {
    const tab = mirror ? -1 : undefined;
    return (
      <>
        {bannerVisible && !isAdmin && (
          <div
            className="grid transition-[grid-template-rows,opacity] duration-500 ease-rl"
            style={{ gridTemplateRows: compact || menuOpen ? '0fr' : '1fr', opacity: compact || menuOpen ? 0 : 1 }}
          >
            <div className="overflow-hidden">
              <div className={`gutter flex items-center justify-center gap-3 border-b border-line py-2 t-label ${scrim ? 'bg-night text-bone' : 'text-mut'}`}>
                <span className="text-accent hidden sm:inline">{t('announcement.eyebrow')}</span>
                <span className="text-center sm:truncate">{announcement}</span>
                <button
                  type="button"
                  tabIndex={tab}
                  onClick={() => setBannerVisible(false)}
                  className={`${scrim ? 'text-bone' : 'text-mut'} hover:text-fg transition-colors cursor-pointer shrink-0 p-2 -m-2`}
                  aria-label={t('announcement.dismiss')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <header className="gutter flex items-center justify-between gap-3 py-[18px] text-fg transition-colors duration-300">
          <button
            type="button"
            tabIndex={tab}
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 cursor-pointer"
            aria-label="ROOTLAND"
          >
            <RootlandIcon size={26} color="currentColor" barColor="#c8642a" />
            <span lang="en" className="font-display text-[19px] sm:text-[21px] font-semibold tracking-[-0.03em] uppercase leading-none max-[359px]:hidden">
              Rootland
            </span>
          </button>

          <div className="flex items-center gap-2">
            {/* Visitors who are not signed in, on screens wide enough to fit it beside the pills. */}
            {!isAdmin && !signedIn && (
              <button
                type="button"
                tabIndex={tab}
                onClick={onCreateAccount}
                className="hidden lg:inline-flex items-center gap-1.5 me-3 text-sm text-mut hover:text-fg transition-colors cursor-pointer"
              >
                <span>{t('nav.newHere')}</span>
                <span className="text-accent underline underline-offset-4">{t('nav.createAccount')}</span>
              </button>
            )}
            <button
              type="button"
              tabIndex={tab}
              onClick={handleLang}
              className={`${pillClass} hidden sm:inline-flex`}
              aria-label="Toggle language"
              title={isArabic ? 'Switch to English' : 'التحويل إلى العربية'}
            >
              <span lang={isArabic ? 'en' : 'ar'}>{t('nav.langToggle')}</span>
            </button>
            {/* Everyone signs in the same way; staff also get the admin beside their account (on phones, from the account page). */}
            {!isAdmin && isStaff && (
              <button
                type="button"
                tabIndex={tab}
                onClick={() => onNavigate('admin')}
                className={`${pillClass} hidden sm:inline-flex`}
                aria-label={t('nav.admin')}
              >
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('nav.admin')}</span>
              </button>
            )}
            {!isAdmin && (
              <button
                type="button"
                tabIndex={tab}
                onClick={signedIn ? () => onNavigate('account') : onOpenAuth}
                className={`${pillClass} max-[399px]:!px-[11px]`}
                aria-label={signedIn ? t('nav.account') : t('nav.signIn')}
              >
                <User className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{signedIn ? t('nav.account') : t('nav.signIn')}</span>
              </button>
            )}
            <button
              type="button"
              tabIndex={tab}
              onClick={onOpenCart}
              className={pillClass}
              aria-label={`${t('nav.cart')} (${cartCount})`}
            >
              <span>{t('nav.bag')}</span>
              <span className="pill__count t-counter">{cartCount}</span>
            </button>
            <button
              type="button"
              tabIndex={tab}
              onClick={() => setMenuOpen((v) => !v)}
              className={pillClass}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
            >
              <span aria-hidden="true" className="relative inline-block w-3 h-[7px]">
                <span
                  className="absolute inset-x-0 top-0 h-px bg-current transition-transform duration-300 ease-rl"
                  style={{ transform: menuOpen ? 'translateY(3px) rotate(45deg)' : 'none' }}
                />
                <span
                  className="absolute inset-x-0 bottom-0 h-px bg-current transition-transform duration-300 ease-rl"
                  style={{ transform: menuOpen ? 'translateY(-3px) rotate(-45deg)' : 'none' }}
                />
              </span>
              {/* Narrow phones keep only the icon so the sign-in, bag and menu pills fit beside the wordmark. */}
              <span className="max-[399px]:sr-only">{menuOpen ? t('nav.close') : t('nav.menu')}</span>
            </button>
          </div>
        </header>
      </>
    );
  };

  return (
    <>
      <div
        ref={barRef}
        data-surface={barSurface}
        className={`${isAdmin ? 'relative' : 'fixed inset-x-0 top-0'} z-[100] ${
          isAdmin ? '' : '!bg-transparent'
        } transition-transform duration-500 ease-rl`}
        style={{
          transform: hidden && !menuOpen ? 'translateY(-100%)' : 'translateY(0)',
          background: scrim ? 'linear-gradient(to bottom, rgba(12,12,12,0.85), rgba(12,12,12,0.55) 55%, rgba(12,12,12,0))' : undefined,
        }}
      >
        <div data-surface={split ? 'night' : barSurface} className="!bg-transparent" style={{ clipPath: split ? seamClip('night') : undefined }}>
          {bar(false)}
        </div>
        {split && (
          <div data-surface="bone" className="absolute inset-0 !bg-transparent" style={{ clipPath: seamClip('bone') }} aria-hidden="true">
            {bar(true)}
          </div>
        )}
      </div>

      <MenuOverlay
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        products={products}
        wishlistCount={wishlistCount}
        onNavigate={(route, param) => {
          setMenuOpen(false);
          onNavigate(route, param);
        }}
        onOpenAIFit={() => {
          setMenuOpen(false);
          onOpenAIFit();
        }}
        onOpenSearch={() => {
          setMenuOpen(false);
          onOpenSearch();
        }}
        onToggleLanguage={handleLang}
      />
    </>
  );
};
