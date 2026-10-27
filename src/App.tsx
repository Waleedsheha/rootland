import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { AIFitModal } from './components/AIFitModal';
import { SizeGuideModal } from './components/SizeGuideModal';
import { SearchModal } from './components/SearchModal';
import { AuthModal, AuthMode } from './components/AuthModal';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { Cursor } from './components/chrome/Cursor';
import { PageWipe } from './components/chrome/PageWipe';
import { SmoothScroll, resetScroll } from './motion/SmoothScroll';
import { useLanguage } from './context/LanguageContext';

import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { B2BPage } from './pages/B2BPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { ShippingReturnsPage } from './pages/ShippingReturnsPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

import { Product } from './types';
import { DataService } from './services/dataService';
import { AnalyticsService } from './services/analyticsService';
import { TrackingService } from './services/trackingService';
import { AuthService } from './services/authService';
import { CartService } from './services/cartService';

type ProductsStatus = 'loading' | 'ready' | 'error';

/** Product pages wait for the catalog from Supabase; a failed load is shown, never replaced with stale data. */
function ProductsGate({ status, error, children }: { status: ProductsStatus; error: string; children: React.ReactNode }) {
  const { isArabic } = useLanguage();
  if (status === 'loading') {
    return (
      <div className="gutter min-h-[50vh] flex items-end pb-[clamp(60px,10vh,110px)]">
        <div className="flex items-center gap-4">
          <span className="w-5 h-5 border-2 border-fg border-t-transparent animate-spin rounded-full" />
          <span className="t-label text-mut">{isArabic ? 'جاري تحميل المنتجات…' : 'Loading the hoodies…'}</span>
        </div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div role="alert" className="gutter pb-[clamp(60px,10vh,110px)]">
        <h1 className="t-section text-fg max-w-[18ch]">{isArabic ? 'تعذر تحميل المنتجات.' : 'The hoodies could not be loaded.'}</h1>
        <p className="t-blurb text-body mt-6 max-w-[48ch]">{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="pill pill--solid mt-8">
          {isArabic ? 'إعادة المحاولة' : 'Try again'}
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

function ProductDetailRouteWrapper({
  products,
  onOpenAIFit,
  onOpenSizeGuide,
  onSelectProduct,
  onOpenCart,
  onNavigate,
  isArabic,
}: {
  products: Product[];
  onOpenAIFit: (prod?: Product) => void;
  onOpenSizeGuide: (id: string) => void;
  onSelectProduct: (prod: Product) => void;
  onOpenCart: () => void;
  onNavigate: (route: string, param?: string) => void;
  isArabic: boolean;
}) {
  const { slug } = useParams<{ slug: string }>();
  const activeProduct = products.find((p) => p.slug === slug || p.id === slug);

  if (!activeProduct) {
    return (
      <div className="gutter pb-[clamp(60px,10vh,110px)]">
        <h1 className="t-section text-fg">{isArabic ? 'هذا المنتج غير متاح.' : 'This product is not available.'}</h1>
        <button type="button" onClick={() => onNavigate('shop')} className="pill pill--solid mt-8">
          {isArabic ? 'تسوق الهوديز' : 'Shop the hoodies'}
        </button>
      </div>
    );
  }

  return (
    <ProductDetailPage
      product={activeProduct}
      allProducts={products}
      onOpenAIFit={onOpenAIFit}
      onOpenSizeGuide={onOpenSizeGuide}
      onSelectProduct={onSelectProduct}
      onOpenCart={onOpenCart}
      onCheckoutDirect={() => onNavigate('checkout')}
      isArabic={isArabic}
    />
  );
}

function ShopRouteWrapper({
  products,
  onSelectProduct,
  onOpenAIFit,
  isArabic,
}: {
  products: Product[];
  onSelectProduct: (p: Product) => void;
  onOpenAIFit: () => void;
  isArabic: boolean;
}) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const filter = searchParams.get('category') || searchParams.get('filter') || undefined;

  return (
    <ShopPage
      products={products}
      onSelectProduct={onSelectProduct}
      onOpenAIFit={onOpenAIFit}
      initialFilter={filter}
      isArabic={isArabic}
    />
  );
}

function AccountRouteWrapper({
  products,
  onOpenAIFit,
  onSelectProduct,
  onOpenAuth,
  isArabic,
}: {
  products: Product[];
  onOpenAIFit: () => void;
  onSelectProduct: (p: Product) => void;
  onOpenAuth: () => void;
  isArabic: boolean;
}) {
  const { tab } = useParams<{ tab?: string }>();
  return (
    <AccountPage
      products={products}
      onOpenAIFit={onOpenAIFit}
      onSelectProduct={onSelectProduct}
      onOpenAuth={onOpenAuth}
      initialTab={tab}
      isArabic={isArabic}
    />
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Live catalog and stock from Supabase
  const [products, setProducts] = useState<Product[]>([]);
  const [productsStatus, setProductsStatus] = useState<ProductsStatus>('loading');
  const [productsError, setProductsError] = useState('');

  // Modals state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIFitOpen, setIsAIFitOpen] = useState(false);
  const [targetAIFitProduct, setTargetAIFitProduct] = useState<Product | undefined>(undefined);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [targetSizeGuideProductId, setTargetSizeGuideProductId] = useState('prod-cairo-pullover');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  // Language & RTL State
  const { isArabic, toggleLang } = useLanguage();

  // Settings were loaded before the first paint (main.tsx); start tracking pixels, the live catalog and auth.
  useEffect(() => {
    TrackingService.initializeFromSettings();

    const unsubscribeProducts = DataService.subscribeToProducts(
      (live) => {
        setProducts(live);
        setProductsStatus('ready');
        CartService.syncPrices(live);
      },
      (message) => {
        console.error('[RootLand] products could not be loaded:', message);
        setProductsError(message);
        setProductsStatus('error');
      }
    );

    // Initialize Auth listener
    const unsubscribeAuth = AuthService.initAuthListener();

    return () => {
      unsubscribeProducts();
      unsubscribeAuth();
    };
  }, []);

  // Backward compatibility: smooth migration from legacy hash URLs (e.g. #product/slug) to real paths
  useEffect(() => {
    if (window.location.hash) {
      const clean = window.location.hash.replace('#', '').replace(/^\//, '');
      // Only migrate legacy router hash paths, NEVER in-page anchors like #pricing, #pricing-tiers, #quote-form
      if (clean.startsWith('product/')) {
        navigate(`/${clean}`, { replace: true });
      } else if (['shop', 'checkout', 'about', 'privacy', 'terms', 'shipping'].includes(clean)) {
        navigate(`/${clean}`, { replace: true });
      }
    }
  }, [navigate]);

  // Global listener for opening the size guide from any component
  useEffect(() => {
    const handleOpenSizeGuideEvent = (e: Event) => {
      const custom = e as CustomEvent<{ productId?: string }>;
      handleOpenSizeGuideForProduct(custom.detail?.productId || 'prod-cairo-pullover');
    };
    window.addEventListener('rootland_open_size_guide', handleOpenSizeGuideEvent);
    return () => window.removeEventListener('rootland_open_size_guide', handleOpenSizeGuideEvent);
  }, []);

  // Track page views on route changes & close open overlay modals immediately
  useEffect(() => {
    setIsSizeGuideOpen(false);
    setIsCartOpen(false);
    setIsAIFitOpen(false);
    setIsSearchOpen(false);
    setIsAuthOpen(false);
    const hasHash = Boolean(window.location.hash || location.hash);
    if (!hasHash) {
      resetScroll();
    }
    TrackingService.trackPageView(location.pathname);
    AnalyticsService.trackPageView(location.pathname);
  }, [location.pathname, location.hash]);

  const navigateTo = (route: string, param?: string) => {
    if (route === 'home' || route === '') {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (route === 'product' && param) {
      navigate(`/product/${param}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (route === 'b2b-pricing' || (route === 'b2b' && (param === 'calculator' || param === 'pricing' || param === 'pricing-tiers'))) {
      navigate('/b2b#pricing');
      const performScroll = () => {
        const el = document.getElementById('pricing') || document.getElementById('pricing-tiers');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      performScroll();
      [50, 150, 300, 500, 800, 1200, 1600].forEach((ms) => setTimeout(performScroll, ms));
    } else if (param) {
      navigate(`/${route}/${param}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(`/${route}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectProduct = (product: Product) => {
    navigateTo('product', product.slug);
  };

  const openAuth = (mode: AuthMode = 'signin') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleOpenAIFitForProduct = (product?: Product) => {
    setTargetAIFitProduct(product || products[0]);
    setIsAIFitOpen(true);
  };

  const handleOpenSizeGuideForProduct = (productId: string) => {
    setTargetSizeGuideProductId(productId);
    setIsSizeGuideOpen(true);
  };

  const handleToggleLanguage = () => {
    toggleLang();
  };

  // Derive active route name for Navbar highlighting
  const currentRoute = location.pathname === '/' ? 'home' : location.pathname.split('/')[1] || 'home';
  const isAdmin = currentRoute === 'admin';
  // Transactional pages live on the bone surface; browsing pages on night.
  const BONE_ROUTES = ['checkout', 'order-confirmation', 'track-order', 'track', 'account', 'reset-password', 'privacy', 'terms', 'shipping-returns', 'shipping'];
  const routeSurface: 'night' | 'bone' = BONE_ROUTES.includes(currentRoute) ? 'bone' : 'night';

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <SmoothScroll enabled={!isAdmin} />
        {!isAdmin && <Cursor />}
        {!isAdmin && <div className="grain" aria-hidden="true" />}
        {!isAdmin && <PageWipe />}

        {/* Fixed header: wordmark + language / bag / menu pills. The admin has its own sidebar instead. */}
        {!isAdmin && <Navbar
          currentRoute={currentRoute}
          onNavigate={navigateTo}
          onOpenAuth={() => openAuth('signin')}
          onCreateAccount={() => openAuth('signup')}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenAIFit={() => handleOpenAIFitForProduct(undefined)}
          products={products}
          isAdmin={isAdmin}
          isArabic={isArabic}
          onToggleLanguage={handleToggleLanguage}
        />}

        {/* Dynamic Route View using React Router with History Mode */}
        <main
          className={`flex-1 ${currentRoute === 'home' || isAdmin ? '' : 'page-top'}`}
          data-surface={isAdmin ? undefined : routeSurface}
        >
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  products={products}
                  onSelectProduct={handleSelectProduct}
                  onNavigate={navigateTo}
                  onOpenAIFit={() => handleOpenAIFitForProduct(undefined)}
                  isArabic={isArabic}
                />
              }
            />

            <Route
              path="/shop"
              element={
                <ProductsGate status={productsStatus} error={productsError}>
                  <ShopRouteWrapper
                    products={products}
                    onSelectProduct={handleSelectProduct}
                    onOpenAIFit={() => handleOpenAIFitForProduct(undefined)}
                    isArabic={isArabic}
                  />
                </ProductsGate>
              }
            />

            <Route
              path="/product/:slug"
              element={
                <ProductsGate status={productsStatus} error={productsError}>
                  <ProductDetailRouteWrapper
                    products={products}
                    onOpenAIFit={handleOpenAIFitForProduct}
                    onOpenSizeGuide={handleOpenSizeGuideForProduct}
                    onSelectProduct={handleSelectProduct}
                    onOpenCart={() => setIsCartOpen(true)}
                    onNavigate={navigateTo}
                    isArabic={isArabic}
                  />
                </ProductsGate>
              }
            />

            <Route path="/b2b" element={<B2BPage isArabic={isArabic} />} />
            <Route path="/b2b/:section" element={<B2BPage isArabic={isArabic} />} />
            <Route path="/b2b-pricing" element={<Navigate to="/b2b#pricing" replace />} />
            <Route path="/pricing" element={<Navigate to="/b2b#pricing" replace />} />

            <Route
              path="/checkout"
              element={
                <CheckoutPage onContinueShopping={() => navigateTo('shop')} onOpenAuth={() => openAuth('signin')} />
              }
            />

            <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
            <Route path="/order-confirmation" element={<OrderConfirmationPage />} />

            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/track" element={<TrackOrderPage />} />

            <Route
              path="/account"
              element={
                <ProductsGate status={productsStatus} error={productsError}>
                  <AccountRouteWrapper
                    products={products}
                    onOpenAIFit={() => handleOpenAIFitForProduct(undefined)}
                    onSelectProduct={handleSelectProduct}
                    onOpenAuth={() => openAuth('signin')}
                    isArabic={isArabic}
                  />
                </ProductsGate>
              }
            />
            <Route
              path="/account/:tab"
              element={
                <ProductsGate status={productsStatus} error={productsError}>
                  <AccountRouteWrapper
                    products={products}
                    onOpenAIFit={() => handleOpenAIFitForProduct(undefined)}
                    onSelectProduct={handleSelectProduct}
                    onOpenAuth={() => openAuth('signin')}
                    isArabic={isArabic}
                  />
                </ProductsGate>
              }
            />
            <Route path="/reset-password" element={<ResetPasswordPage onRequestNewLink={() => openAuth('forgot')} />} />

            <Route path="/admin" element={<AdminPage onOpenAuth={() => openAuth('signin')} />} />

            <Route
              path="/about"
              element={<AboutPage onNavigateShop={() => navigateTo('shop')} isArabic={isArabic} />}
            />

            <Route path="/privacy" element={<PrivacyPolicyPage isArabic={isArabic} />} />
            <Route path="/terms" element={<TermsPage isArabic={isArabic} />} />
            <Route
              path="/shipping-returns"
              element={<ShippingReturnsPage isArabic={isArabic} />}
            />
            <Route
              path="/shipping"
              element={<ShippingReturnsPage isArabic={isArabic} />}
            />

            {/* Catch-all redirect to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Footer with Shop, B2B, Care, Legal, and Contact */}
        {!isAdmin && (
          <Footer
            onNavigate={navigateTo}
            onOpenSizeGuide={() => handleOpenSizeGuideForProduct('prod-essential-hoodie-black')}
            onOpenAIFit={() => handleOpenAIFitForProduct(undefined)}
            isArabic={isArabic}
            fromSurface={routeSurface}
          />
        )}

        {/* Floating WhatsApp Quick Concierge */}
        {!isAdmin && <FloatingWhatsApp isArabic={isArabic} />}

        {/* Global Modals & Slide-over Drawers */}
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onCheckout={() => {
            setIsCartOpen(false);
            navigateTo('checkout');
          }}
          onNavigateShop={() => {
            setIsCartOpen(false);
            navigateTo('shop');
          }}
          isArabic={isArabic}
        />

        <AIFitModal
          isOpen={isAIFitOpen}
          onClose={() => setIsAIFitOpen(false)}
          targetProduct={targetAIFitProduct}
          onSelectRecommendedSize={(_size) => {
            // Auto-select on PDP
          }}
          isArabic={isArabic}
        />

        <SizeGuideModal
          isOpen={isSizeGuideOpen}
          onClose={() => setIsSizeGuideOpen(false)}
          defaultProductId={targetSizeGuideProductId}
          isArabic={isArabic}
        />

        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectProduct={handleSelectProduct}
          onViewAllResults={(_query) => navigateTo('shop')}
          isArabic={isArabic}
        />

        <AuthModal isOpen={isAuthOpen} initialMode={authMode} onClose={() => setIsAuthOpen(false)} />
      </div>
    </ToastProvider>
  );
}
