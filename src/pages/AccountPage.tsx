import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Customer, Order, Product } from '../types';
import { AuthService } from '../services/authService';
import { DataService } from '../services/dataService';
import { CartService } from '../services/cartService';
import { useToast } from '../components/Toast';
import { normalizeImagePath } from '../utils/imageUtils';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/SEOHead';
import { lockScroll } from '../motion/SmoothScroll';
import { normalizeEgyptMobile } from '../utils/phone';
import { orderStatusLabel } from '../utils/orderText';
import { errorMessage } from '../lib/supabase';

interface AccountPageProps {
  products: Product[];
  onOpenAIFit: () => void;
  onSelectProduct: (product: Product) => void;
  onOpenAuth: () => void;
  initialTab?: string;
  isArabic?: boolean;
}

type Tab = 'profile' | 'orders' | 'addresses' | 'wishlist' | 'fit';
const TABS: Tab[] = ['profile', 'orders', 'addresses', 'wishlist', 'fit'];

export const AccountPage: React.FC<AccountPageProps> = ({ products, onOpenAIFit, onSelectProduct, onOpenAuth, initialTab }) => {
  const { t, isArabic, formatPrice, formatDate } = useLanguage();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>(TABS.includes(initialTab as Tab) ? (initialTab as Tab) : 'profile');
  const [user, setUser] = useState<Customer | null>(() => AuthService.getCurrentUser());
  const [ready, setReady] = useState(() => AuthService.isReady());
  const [loadError, setLoadError] = useState(() => AuthService.getLoadError());
  const [isStaff, setIsStaff] = useState(() => AuthService.getStaffRole() !== null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersState, setOrdersState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedOrderReceipt, setSelectedOrderReceipt] = useState<Order | null>(null);
  const [wishlistVersion, setWishlistVersion] = useState(0);

  // Profile form
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = () => {
      const current = AuthService.getCurrentUser();
      setUser(current);
      setReady(AuthService.isReady());
      setLoadError(AuthService.getLoadError());
      setIsStaff(AuthService.getStaffRole() !== null);
      setFullName(current?.fullName ?? '');
      setPhone(current?.phone ?? '');
    };
    const handleWishlist = () => setWishlistVersion((v) => v + 1);
    window.addEventListener('rootland_auth_updated', handleAuth);
    window.addEventListener('rootland_wishlist_updated', handleWishlist);
    return () => {
      window.removeEventListener('rootland_auth_updated', handleAuth);
      window.removeEventListener('rootland_wishlist_updated', handleWishlist);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setOrdersState('loading');
    DataService.fetchMyOrders(user.id)
      .then((list) => {
        if (!active) return;
        setOrders(list);
        setOrdersState('ready');
      })
      .catch((err) => {
        console.error('[AccountPage] orders could not be loaded:', errorMessage(err));
        if (active) setOrdersState('error');
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!selectedOrderReceipt) return;
    lockScroll(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedOrderReceipt(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      lockScroll(false);
    };
  }, [selectedOrderReceipt]);

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      showToast(t('toast.signedOut'), t('toast.signedOutMsg'), 'info');
    } catch (err) {
      showToast(isArabic ? 'تعذر تسجيل الخروج' : 'Could not sign out', AuthService.formatAuthError(err, isArabic), 'error');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    if (!fullName.trim()) {
      setProfileError(t('auth.nameRequired'));
      return;
    }
    if (phone.trim() && !normalizeEgyptMobile(phone)) {
      setProfileError(t('auth.phoneInvalid'));
      return;
    }
    setSavingProfile(true);
    try {
      await AuthService.updateProfile({ fullName, phone: phone.trim() ? (normalizeEgyptMobile(phone) as string) : '' });
      showToast(t('account.profileSaved'), undefined, 'success');
    } catch (err) {
      setProfileError(errorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError(t('auth.passwordShort'));
      return;
    }
    setSavingPassword(true);
    try {
      await AuthService.updatePassword(newPassword);
      setNewPassword('');
      showToast(t('account.passwordUpdated'), undefined, 'success');
    } catch (err) {
      setPasswordError(AuthService.formatAuthError(err, isArabic));
    } finally {
      setSavingPassword(false);
    }
  };

  const wishlistItems = AuthService.getWishlist();
  const wishlistedProducts = products.filter((p) => wishlistItems.some((w) => w.productId === p.id));
  void wishlistVersion;

  const handleRemoveWishlist = (productId: string) => {
    AuthService.toggleWishlist(productId);
    showToast(t('toast.wishlistRemoved'), undefined, 'info');
  };

  const handleMoveToCart = (product: Product) => {
    const productName = isArabic ? product.nameAr || product.nameArabic : product.nameEn || product.name;
    const variant = product.variants.find((v) => v.colorName === product.colors[0].name && v.size === 'L');
    if (!variant || variant.stockCount <= 0) {
      showToast(
        isArabic ? 'نفد هذا المقاس' : 'Size sold out',
        isArabic ? 'افتح صفحة المنتج لاختيار مقاس آخر أو الطلب المسبق.' : 'Open the product page to choose another size or pre-order.',
        'info'
      );
      return;
    }
    CartService.addItem({
      productId: product.id,
      variantId: variant.id,
      productName: product.nameEn || product.name,
      productNameAr: product.nameAr || product.nameArabic,
      colorNameAr: product.colors[0].nameAr,
      maxQuantity: variant.stockCount,
      productSlug: product.slug,
      image: product.primaryImage,
      colorName: product.colors[0].name,
      colorHex: product.colors[0].hex,
      size: 'L',
      unitPrice: product.salePrice && product.salePrice < product.price ? product.salePrice : product.price,
      quantity: 1,
      sku: variant.sku,
    });
    AuthService.toggleWishlist(product.id);
    showToast(t('account.moveToBag'), `${productName} (L)`, 'success');
  };

  if (!ready) {
    return (
      <div className="gutter min-h-[40vh] flex items-end pb-[clamp(60px,10vh,110px)]">
        <SEOHead title={t('account.seoTitle')} description={t('account.seoDesc')} />
        <div className="flex items-center gap-4">
          <span className="w-5 h-5 border-2 border-fg border-t-transparent animate-spin rounded-full" />
          <span className="text-sm text-mut">{t('account.loading')}</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="gutter pb-[clamp(60px,10vh,110px)]">
        <SEOHead title={t('account.seoTitle')} description={t('account.seoDesc')} />
        <h1 className="t-section text-fg max-w-[16ch]">{isArabic ? 'تعذر تحميل حسابك.' : 'Your account could not be loaded.'}</h1>
        <p role="alert" className="t-blurb text-body max-w-[52ch] mt-6">
          {isArabic ? 'تأكد من الاتصال ثم أعد تحميل الصفحة.' : 'Check your connection and reload the page.'} ({loadError})
        </p>
        <button type="button" onClick={handleLogout} className="pill mt-8">
          {t('account.signOut')}
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="gutter pb-[clamp(60px,10vh,110px)]">
        <SEOHead title={t('account.seoTitle')} description={t('account.seoDesc')} />
        <h1 className="t-section text-fg max-w-[16ch]">{t('account.signInRequiredTitle')}</h1>
        <p className="t-blurb text-body max-w-[46ch] mt-6">{t('account.signInRequiredDesc')}</p>
        <button type="button" onClick={onOpenAuth} className="pill pill--solid mt-8">
          {t('account.signInBtn')}
        </button>
      </div>
    );
  }

  const tabLabel: Record<Tab, string> = {
    profile: t('account.tabProfile'),
    orders: `${t('account.tabOrders')} ${String(orders.length).padStart(2, '0')}`,
    wishlist: `${t('account.tabWishlist')} ${String(wishlistedProducts.length).padStart(2, '0')}`,
    addresses: t('account.tabAddresses'),
    fit: t('account.tabFit'),
  };

  const fit = user.savedFitProfile
    ? [
        [isArabic ? 'الطول' : 'Height', `${user.savedFitProfile.heightCm} ${isArabic ? 'سم' : 'cm'}`],
        [isArabic ? 'الوزن' : 'Weight', `${user.savedFitProfile.weightKg} ${isArabic ? 'كجم' : 'kg'}`],
        [isArabic ? 'بنية الجسم' : 'Body build', user.savedFitProfile.bodyType],
        [isArabic ? 'القصّة المفضلة' : 'Preferred fit', user.savedFitProfile.desiredFit],
      ]
    : [];

  const fieldClass = 'w-full bg-bg-2 border border-line p-2.5 text-sm text-fg focus:outline-none focus:border-fg';

  return (
    <div className="gutter pb-[clamp(60px,10vh,110px)]">
      <SEOHead title={t('account.seoTitle')} description={t('account.seoDesc')} />

      {/* Header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between pb-8">
        <div>
          <h1 className="t-section text-fg">{t('account.welcome', { name: user.fullName || user.email })}</h1>
          <p className="text-sm text-mut mt-4">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start md:self-auto">
          {isStaff && (
            <Link to="/admin" className="pill pill--sm pill--solid">
              {t('account.openAdmin')}
            </Link>
          )}
          <button type="button" onClick={handleLogout} className="pill pill--sm">
            {t('account.signOut')}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-y border-line py-4 mb-10 [scrollbar-width:none]" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`pill pill--sm shrink-0 ${activeTab === tab ? '!bg-fg !text-bg !border-fg' : ''}`}
          >
            {tabLabel[tab]}
          </button>
        ))}
      </div>

      {/* Profile */}
      {activeTab === 'profile' && (
        <section className="max-w-2xl space-y-12">
          <form onSubmit={handleSaveProfile} className="space-y-4" noValidate>
            <h2 className="t-title text-fg">{isArabic ? 'معلومات الحساب' : 'Account information'}</h2>
            {profileError && (
              <p role="alert" className="text-sm text-err">
                {profileError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="account-name" className="block text-sm text-mut mb-1">
                  {t('auth.nameLabel')}
                </label>
                <input id="account-name" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="account-phone" className="block text-sm text-mut mb-1">
                  {t('auth.phoneLabel')}
                </label>
                <input
                  id="account-phone"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  className={`${fieldClass} font-mono`}
                />
              </div>
            </div>
            <p className="text-sm text-mut">
              {t('auth.emailLabel')}: <span className="text-fg">{user.email}</span>
            </p>
            <button type="submit" disabled={savingProfile} className="pill pill--sm pill--solid disabled:opacity-50">
              {savingProfile ? t('common.loading') : t('account.saveProfile')}
            </button>
          </form>

          <form onSubmit={handleChangePassword} className="space-y-4 border-t border-line pt-10" noValidate>
            <h2 className="t-title text-fg">{t('account.passwordTitle')}</h2>
            {passwordError && (
              <p role="alert" className="text-sm text-err">
                {passwordError}
              </p>
            )}
            <div className="max-w-sm">
              <label htmlFor="account-password" className="block text-sm text-mut mb-1">
                {t('reset.newPassword')}
              </label>
              <input
                id="account-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={fieldClass}
              />
              <p className="text-xs text-mut mt-1">{t('auth.passwordHint')}</p>
            </div>
            <button type="submit" disabled={savingPassword} className="pill pill--sm disabled:opacity-50">
              {savingPassword ? t('common.loading') : t('account.passwordSaveBtn')}
            </button>
          </form>
        </section>
      )}

      {/* Orders */}
      {activeTab === 'orders' && (
        <section>
          {ordersState === 'loading' && <p className="t-blurb text-body border-t border-line pt-8">{t('account.ordersLoading')}</p>}
          {ordersState === 'error' && (
            <p role="alert" className="t-blurb text-err border-t border-line pt-8">
              {t('account.ordersError')}
            </p>
          )}
          {ordersState === 'ready' && orders.length === 0 && <p className="t-blurb text-body border-t border-line pt-8">{t('account.ordersEmpty')}</p>}
          {ordersState === 'ready' && orders.length > 0 && (
            <div className="border-b border-line">
              {orders.map((ord) => (
                <article key={ord.id} className="py-8 border-t border-line">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h3 className="t-title text-fg" dir="ltr">
                        {ord.orderNumber}
                      </h3>
                      <p className="text-sm text-mut mt-2">
                        {isArabic ? 'تاريخ الطلب' : 'Placed on'} {formatDate(ord.createdAt)} · {isArabic ? 'التوصيل إلى' : 'Delivery to'} {ord.shippingAddress.city},{' '}
                        {isArabic ? ord.shippingAddress.governorateAr : ord.shippingAddress.governorate}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="pill pill--sm pointer-events-none">{orderStatusLabel(ord.orderStatus, isArabic)}</span>
                      <span className="t-counter text-fg">{formatPrice(ord.total)}</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="py-3 border-t border-line flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-14 bg-bone-2 overflow-hidden shrink-0">
                            <img src={normalizeImagePath(item.image)} alt={item.productName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-fg">{isArabic ? item.productNameAr || item.productName : item.productName}</h4>
                            <p className="text-sm text-body mt-1">
                              {isArabic ? item.colorNameAr || item.colorName : item.colorName} · {isArabic ? `المقاس ${item.size}` : `Size ${item.size}`} ·{' '}
                              {isArabic ? `الكمية ${item.quantity}` : `Qty ${item.quantity}`}
                              {item.isPreorder ? (isArabic ? ' · طلب مسبق' : ' · Pre-order') : ''}
                            </p>
                          </div>
                        </div>
                        <span className="t-counter text-fg">{formatPrice(item.unitPrice * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-5">
                    <button type="button" onClick={() => setSelectedOrderReceipt(ord)} className="pill pill--sm">
                      {t('account.orderReceipt')}
                    </button>
                    <Link to={`/track-order?order=${encodeURIComponent(ord.orderNumber)}&phone=${encodeURIComponent(ord.customerPhone)}`} className="pill pill--sm">
                      {t('account.trackOrder')}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Wishlist */}
      {activeTab === 'wishlist' && (
        <section>
          {wishlistedProducts.length === 0 ? (
            <p className="t-blurb text-body border-t border-line pt-8">{t('account.wishlistEmpty')}</p>
          ) : (
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {wishlistedProducts.map((p) => {
                const prodName = isArabic ? p.nameAr || p.nameArabic : p.nameEn || p.name;
                const fabricDesc = isArabic
                  ? p.specifications.fabricWeightAr || p.specifications.fabricWeight
                  : p.specifications.fabricWeightEn || p.specifications.fabricWeight;
                return (
                  <article key={p.id}>
                    <button type="button" onClick={() => onSelectProduct(p)} className="block w-full overflow-hidden bg-bone-2 cursor-pointer" data-cursor="view">
                      <img
                        src={normalizeImagePath(p.primaryImage)}
                        alt={prodName}
                        referrerPolicy="no-referrer"
                        className="w-full aspect-[4/3] object-cover transition-transform duration-[1200ms] ease-out-rl hover:scale-[1.04]"
                      />
                    </button>
                    <div className="pt-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="t-row text-fg">{prodName}</h3>
                        <p className="text-sm text-mut mt-2">{fabricDesc}</p>
                      </div>
                      <span className="t-counter text-fg shrink-0">{formatPrice(p.salePrice && p.salePrice < p.price ? p.salePrice : p.price)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-5">
                      <button type="button" onClick={() => handleMoveToCart(p)} className="pill pill--sm pill--solid">
                        {t('account.moveToBag')}
                      </button>
                      <button type="button" onClick={() => handleRemoveWishlist(p.id)} className="pill pill--sm">
                        {isArabic ? 'حذف' : 'Remove'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Addresses */}
      {activeTab === 'addresses' && (
        <section>
          {user.addresses.length === 0 ? (
            <p className="t-blurb text-body border-t border-line pt-8">{t('account.addressesEmpty')}</p>
          ) : (
            <div className="border-b border-line">
              {user.addresses.map((addr, idx) => (
                <div key={idx} className="py-7 border-t border-line grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                  <div>
                    <h3 className="t-row text-fg">{addr.fullName}</h3>
                    <p className="t-counter text-mut mt-2" dir="ltr">
                      {addr.phone}
                    </p>
                  </div>
                  <p className="text-body">
                    {addr.streetAddress}, {addr.buildingNumber} {addr.floorApartment && `· ${addr.floorApartment}`}
                    <br />
                    {addr.district && `${addr.district}, `}
                    {addr.city}, {isArabic ? addr.governorateAr : addr.governorate}
                    {addr.nearestLandmark && (
                      <>
                        <br />
                        <span className="text-mut">
                          {isArabic ? 'علامة مميزة:' : 'Landmark:'} {addr.nearestLandmark}
                        </span>
                      </>
                    )}
                  </p>
                  {idx === 0 && (
                    <span className="text-sm self-start border border-line-strong rounded-full px-2.5 py-1">
                      {isArabic ? 'يُستخدم في الطلب القادم' : 'Used at your next checkout'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Fit profile */}
      {activeTab === 'fit' && (
        <section className="max-w-2xl">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="t-title text-fg">{t('account.savedFitTitle')}</h2>
              <p className="text-body mt-2">{isArabic ? 'الملف المحفوظ من أداة المقاس' : 'Saved from the fit tool'}</p>
            </div>
            <button type="button" onClick={onOpenAIFit} className="pill pill--sm pill--solid">
              {t('account.recalculateFit')}
            </button>
          </div>
          {fit.length > 0 ? (
            <dl>
              {fit.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4 py-3.5 border-b border-line text-body">
                  <dt className="text-mut">{label}</dt>
                  <dd className="text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="t-blurb text-body border-t border-line pt-6">
              {isArabic
                ? 'لا يوجد ملف مقاسات محفوظ بعد. استخدم مساعد المقاسات لحساب مقاسك المثالي.'
                : 'No saved fit profile. Run the AI Fit Assistant to calibrate your custom measurements.'}
            </p>
          )}
        </section>
      )}

      {/* Receipt */}
      {selectedOrderReceipt && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-night/70" onClick={() => setSelectedOrderReceipt(null)} />
          <div data-surface="bone" data-lenis-prevent className="relative w-full max-w-md p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-4 pb-4 border-b border-line">
              <div>
                <h2 className="t-title text-fg" dir="ltr">
                  {selectedOrderReceipt.orderNumber}
                </h2>
                <p className="text-sm text-mut mt-2">{formatDate(selectedOrderReceipt.createdAt)}</p>
              </div>
              <button type="button" onClick={() => setSelectedOrderReceipt(null)} className="pill pill--sm shrink-0">
                {t('common.close')}
              </button>
            </div>
            <dl className="mt-2">
              {selectedOrderReceipt.items.map((it, i) => (
                <div key={i} className="flex justify-between gap-4 py-2.5 border-b border-line text-body">
                  <dt>
                    {isArabic ? it.productNameAr || it.productName : it.productName} · {it.size} · {isArabic ? it.colorNameAr || it.colorName : it.colorName} × {it.quantity}
                  </dt>
                  <dd className="t-counter text-fg shrink-0">{formatPrice(it.unitPrice * it.quantity)}</dd>
                </div>
              ))}
              {selectedOrderReceipt.discount > 0 && (
                <div className="flex justify-between gap-4 py-2.5 border-b border-line text-body">
                  <dt>{isArabic ? 'الخصم' : 'Discount'}</dt>
                  <dd className="t-counter text-fg shrink-0">-{formatPrice(selectedOrderReceipt.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 py-2.5 border-b border-line text-body">
                <dt>{isArabic ? 'الشحن' : 'Delivery'}</dt>
                <dd className="t-counter text-fg shrink-0">{selectedOrderReceipt.shippingFee === 0 ? (isArabic ? 'مجاني' : 'Free') : formatPrice(selectedOrderReceipt.shippingFee)}</dd>
              </div>
              <div className="flex justify-between items-baseline pt-4 mt-2 border-t-2 border-fg">
                <dt className="font-semibold text-fg">
                  {selectedOrderReceipt.paymentStatus === 'paid' ? (isArabic ? 'إجمالي المدفوع' : 'Total paid') : isArabic ? 'الإجمالي عند الاستلام' : 'Total on delivery'}
                </dt>
                <dd className="font-display text-[24px] font-semibold tracking-[-0.02em] text-fg tabular-nums">{formatPrice(selectedOrderReceipt.total)}</dd>
              </div>
            </dl>
            <p className="text-sm text-mut mt-5">
              {isArabic
                ? `الدفع عند الاستلام · التوصيل إلى ${selectedOrderReceipt.shippingAddress.governorateAr}`
                : `Cash on delivery · Delivered to ${selectedOrderReceipt.shippingAddress.governorate}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
