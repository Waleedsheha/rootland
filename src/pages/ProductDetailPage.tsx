import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  ShoppingBag,
  Sparkles,
  Ruler,
  Truck,
  RotateCcw,
  ShieldCheck,
  Star,
  Check,
  Minus,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Product, Review } from '../types';
import { CartService } from '../services/cartService';
import { AuthService } from '../services/authService';
import { TrackingService } from '../services/trackingService';
import { SEOHead } from '../components/SEOHead';
import { useToast } from '../components/Toast';
import { normalizeImagePath } from '../utils/imageUtils';
import { DataService } from '../services/dataService';
import { StoreSettingsService } from '../services/storeSettingsService';
import { errorMessage } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { PixelStrip } from '../components/ui/PixelStrip';
import { ZoomViewer } from '../components/ZoomViewer';
import { HoodieSpin } from '../components/HoodieSpin';
import { PRODUCT_SPINS } from '../data/spin';
import { useScrollReveals } from '../motion/reveal';
import { gsap, useGSAP, FULL_MOTION } from '../motion/gsap';
import { activePrice, colourName, productName as productNameOf } from '../utils/productText';

/** Pieces of one size per order (same limit as the database). */
const MAX_PIECES = 20;
const FIT_VOTES: Review['fitVote'][] = ['Runs Small', 'True to Size', 'Runs Large'];
const FIT_VOTE_AR: Record<Review['fitVote'], string> = {
  'Runs Small': 'أصغر من المعتاد',
  'True to Size': 'مطابق للمقاس',
  'Runs Large': 'أكبر من المعتاد',
};

interface ProductDetailPageProps {
  product: Product;
  allProducts: Product[];
  onOpenAIFit: (product: Product) => void;
  onOpenSizeGuide: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onOpenCart: () => void;
  onCheckoutDirect: () => void;
  isArabic?: boolean;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts,
  onOpenAIFit,
  onOpenSizeGuide,
  onSelectProduct,
  onOpenCart,
  onCheckoutDirect,
}) => {
  const { t, formatPrice, formatDate, dir, isArabic } = useLanguage();
  const { showToast } = useToast();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L' | 'XL' | 'XXL'>('L');
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(() => AuthService.isInWishlist(product.id));
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const scopeRef = useRef<HTMLDivElement>(null);

  useScrollReveals(scopeRef, [product.id, isArabic]);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(FULL_MOTION, () => {
        gsap.utils.toArray<HTMLElement>('[data-clip]').forEach((frame, i) => {
          if (i === 0) return;
          gsap.fromTo(
            frame,
            { clipPath: 'inset(14% 6% 14% 6%)' },
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              ease: 'none',
              scrollTrigger: { trigger: frame, start: 'top 95%', end: 'top 40%', scrub: true },
            },
          );
        });
      });
    },
    { scope: scopeRef, dependencies: [product.id], revertOnUpdate: true },
  );

  // Track ViewContent on mount
  useEffect(() => {
    TrackingService.trackViewContent(product);
  }, [product.id]);

  // Published reviews of this product (live)
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsError, setReviewsError] = useState(false);

  useEffect(() => {
    const unsub = DataService.subscribeToPublishedReviews(
      (allPublished) => {
        setReviews(allPublished.filter((r) => r.productId === product.id));
        setReviewsError(false);
      },
      (message) => {
        console.error('[ProductDetailPage] reviews could not be loaded:', message);
        setReviewsError(true);
      }
    );
    return () => unsub();
  }, [product.id]);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewLocation, setNewReviewLocation] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewFit, setNewReviewFit] = useState<Review['fitVote'] | ''>('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Only the product's main image is shown
  const gallery = [normalizeImagePath(product.primaryImage)];
  const spin = PRODUCT_SPINS[product.slug];
  const activeImage = gallery[activeImageIndex];
  const price = activePrice(product);

  // Find variant matching color & size
  const matchingVariant = product.variants.find(
    (v) => v.colorName === selectedColor.name && v.size === selectedSize
  );
  const stockCount = matchingVariant ? Math.max(0, matchingVariant.stockCount) : 0;
  const inStock = matchingVariant ? stockCount > 0 : false;
  const storeSettings = StoreSettingsService.getSettingsSync();
  // Pre-order: a sold-out size can be ordered ahead and paid on delivery like any order
  const preordersOpen = storeSettings.preorderEnabled && storeSettings.preorderMaxPerVariant > 0;
  const canPreorder = !inStock && Boolean(matchingVariant) && preordersOpen;
  const maxQuantity = Math.min(MAX_PIECES, inStock ? stockCount : canPreorder ? storeSettings.preorderMaxPerVariant : 1);

  const productName = isArabic ? (product.nameAr || product.nameArabic) : (product.nameEn || product.name);
  const productTagline = isArabic ? (product.taglineAr || product.tagline) : (product.taglineEn || product.tagline);
  const productDescription = isArabic
    ? (product.descriptionAr || product.descriptionArabic || product.description)
    : (product.descriptionEn || product.description);

  const compositionText = isArabic
    ? (product.specifications.compositionAr || '70% قطن مصري، 30% بوليستر')
    : (product.specifications.compositionEn || product.specifications.composition);

  const weaveText = isArabic
    ? (product.specifications.weaveAr || 'سطح خارجي محبوك ناعم وبطانة داخلية فليس مريحة')
    : (product.specifications.weaveEn || product.specifications.weave);

  const originText = isArabic
    ? (product.specifications.originAr || 'تصميم وحياكة متقنة في مصر')
    : (product.specifications.originEn || product.specifications.origin);

  const shrinkageText = isArabic
    ? (product.specifications.shrinkageAr || 'غسيل آلي بماء بارد مع التجفيف بالتعليق')
    : (product.specifications.shrinkageEn || product.specifications.shrinkage);

  const fitDescriptionText = isArabic
    ? (product.fitDescriptionAr || product.fitDescription)
    : (product.fitDescriptionEn || product.fitDescription);

  const careInstructionsList = isArabic
    ? (product.careInstructionsAr || product.careInstructions)
    : (product.careInstructionsEn || product.careInstructions);

  const handleToggleWishlist = () => {
    const added = AuthService.toggleWishlist(product.id);
    setIsWishlisted(added);
    showToast(
      added ? t('toast.wishlistAdded') : t('toast.wishlistRemoved'),
      productName,
      'info'
    );
  };

  const handleAddToCart = (openDrawer = true) => {
    if (!matchingVariant || (!inStock && !canPreorder)) {
      showToast(t('product.outOfStockSize'), t('product.outOfStockMsg'), 'error');
      return false;
    }
    // Do not allow more pieces than we have (in-stock) or than the pre-order limit
    const inCart = CartService.getCart().items
      .filter((i) => i.variantId === matchingVariant.id && Boolean(i.isPreorder) === canPreorder)
      .reduce((sum, i) => sum + i.quantity, 0);
    if (inCart + quantity > maxQuantity) {
      showToast(
        isArabic ? 'الكمية غير متاحة' : 'Not enough stock',
        isArabic
          ? `المتاح من هذا المقاس ${Math.max(0, maxQuantity - inCart)} قطعة فقط.`
          : `Only ${Math.max(0, maxQuantity - inCart)} more of this size available.`,
        'error'
      );
      return false;
    }

    const newItem = {
      productId: product.id,
      variantId: matchingVariant.id,
      productName: product.nameEn || product.name,
      productNameAr: product.nameAr || product.nameArabic,
      colorNameAr: selectedColor.nameAr || matchingVariant.colorArabicName,
      isPreorder: canPreorder,
      maxQuantity,
      productSlug: product.slug,
      image: normalizeImagePath(product.primaryImage),
      colorName: selectedColor.name,
      colorHex: selectedColor.hex,
      size: selectedSize,
      unitPrice: price,
      quantity,
      sku: matchingVariant.sku,
    };

    CartService.addItem(newItem);
    TrackingService.trackAddToCart({ ...newItem, id: `${newItem.productId}-${newItem.colorName}-${newItem.size}` });

    showToast(
      canPreorder ? (isArabic ? 'تمت إضافة الطلب المسبق' : 'Pre-order added') : t('toast.addedToBag'),
      `${productName} (${selectedSize})`,
      'success'
    );
    if (openDrawer) {
      onOpenCart();
    }
    return true;
  };

  const handleBuyNow = () => {
    const added = handleAddToCart(false);
    if (added) {
      onCheckoutDirect();
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    if (!newReviewAuthor.trim() || !newReviewComment.trim() || !newReviewFit) {
      setReviewError(isArabic ? 'اكتب اسمك وتقييمك واختر كيف كان المقاس.' : 'Add your name, your review and how the size fits.');
      return;
    }
    setReviewSubmitting(true);
    try {
      // Reviews appear only after the Content team publishes them in the admin
      await DataService.submitReview({
        productId: product.id,
        authorName: newReviewAuthor.trim(),
        location: newReviewLocation.trim(),
        rating: newReviewRating,
        comment: newReviewComment.trim(),
        size: selectedSize,
        fitVote: newReviewFit,
      });
      setNewReviewAuthor('');
      setNewReviewLocation('');
      setNewReviewComment('');
      setNewReviewFit('');
      setShowReviewForm(false);
      showToast(t('toast.success'), t('product.reviewSubmitted'), 'success');
    } catch (err) {
      const message = errorMessage(err);
      console.error('[ProductDetailPage] review could not be sent:', message);
      setReviewError(
        message === 'TOO_MANY_REVIEWS'
          ? isArabic
            ? 'وصلتنا تقييمات كثيرة الآن. حاول مرة أخرى بعد قليل.'
            : 'We are receiving many reviews right now. Please try again a little later.'
          : isArabic
            ? 'تعذر إرسال التقييم. تأكد من الاتصال وحاول مرة أخرى.'
            : 'Your review could not be sent. Check your connection and try again.'
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  const siblings = allProducts.filter((p) => p.id !== product.id);
  const specs = [
    { label: t('product.specComposition'), value: compositionText },
    { label: t('product.specWeave'), value: weaveText },
    { label: t('product.specOrigin'), value: originText },
    { label: t('product.specCare'), value: shrinkageText },
  ];
  const trust = [
    {
      icon: <Truck className="w-4 h-4" />,
      title: isArabic ? 'التوصيل' : 'Delivery',
      text: isArabic ? 'لجميع محافظات مصر عبر بوسطة' : 'All 27 governorates by Bosta',
    },
    {
      icon: <ShieldCheck className="w-4 h-4" />,
      title: isArabic ? 'الدفع عند الاستلام' : 'Cash on delivery',
      text: isArabic ? 'لا شيء مقدماً، ادفع نقداً عند الاستلام' : 'Nothing upfront, pay in cash at your door',
    },
    {
      icon: <RotateCcw className="w-4 h-4" />,
      title: isArabic ? 'استبدال المقاس خلال 14 يوماً' : '14-day size exchange',
      text: isArabic ? 'تواصل معنا على واتساب' : 'Message us on WhatsApp',
    },
  ];

  return (
    <div ref={scopeRef}>
      <SEOHead
        title={productName}
        description={productDescription}
        ogImage={activeImage}
        ogType="product"
        productData={{
          price,
          currency: 'EGP',
          inStock,
        }}
      />

      <div className="gutter grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start pb-[clamp(60px,10vh,110px)]">
        {/* Gallery */}
        <div className="lg:col-span-7 min-w-0">
          {spin ? (
            /* Hoodies with a 360° turn show it instead of the photo (edge to edge on phones). */
            <div
              className={`relative -mx-[var(--gutter)] lg:mx-0 aspect-[4/5] lg:aspect-[4/3] ${
                spin.stage === 'bone' ? 'bg-bone' : 'bg-night-2'
              }`}
            >
              <HoodieSpin spin={spin} alt={productName} />
            </div>
          ) : (
            <>
              {/* Phones: swipe row */}
              <div className="lg:hidden -mx-[var(--gutter)] flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setZoomIndex(idx)}
                    className="snap-center shrink-0 w-[86vw] ps-[var(--gutter)] last:pe-[var(--gutter)] cursor-pointer"
                    aria-label={`${productName} ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt={`${productName} ${idx + 1}`}
                      width={1200}
                      height={900}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full aspect-[4/5] object-cover bg-ghost-ink"
                    />
                  </button>
                ))}
              </div>

              {/* Desktop: tall stack, each frame revealed through a mask */}
              <div className="hidden lg:grid gap-5">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setZoomIndex(idx)}
                    data-cursor="view"
                    data-clip
                    className={`block overflow-hidden bg-ghost-ink cursor-pointer ${
                      idx % 3 === 1 ? 'w-[78%]' : idx % 3 === 2 ? 'w-[78%] justify-self-end' : ''
                    }`}
                    aria-label={`${productName} ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt={`${productName} ${idx + 1}`}
                      width={1200}
                      height={900}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      fetchPriority={idx === 0 ? 'high' : undefined}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full aspect-[4/3] object-cover"
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Buy box */}
        <aside className="lg:col-span-5 lg:sticky lg:top-28 space-y-7">
          <div>
            <div className="flex items-center justify-between gap-4 mb-5">
              {reviews.length > 0 && (
                <span className="flex items-center gap-1.5 t-counter text-fg">
                  <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                  {avgRating.toFixed(1)}
                  <span className="text-mut">{t('product.reviewsCount', { count: reviews.length })}</span>
                </span>
              )}
            </div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="t-title text-fg">{productName}</h1>
              <button
                type="button"
                onClick={handleToggleWishlist}
                className="pill pill--sm shrink-0 !px-3"
                aria-label={isWishlisted ? t('productCard.removeFromWishlist') : t('productCard.addToWishlist')}
                aria-pressed={isWishlisted}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-accent text-accent' : ''}`} />
              </button>
            </div>
            <div className="flex items-baseline gap-3 mt-5">
              <span className="font-display text-[clamp(26px,2.4vw,34px)] font-semibold tracking-[-0.02em] text-fg tabular-nums whitespace-nowrap">
                {formatPrice(price)}
              </span>
              {price < product.price && <span className="t-counter text-mut line-through">{formatPrice(product.price)}</span>}
              <span className="t-label text-mut">{t('product.vatIncluded')}</span>
            </div>
            <p className="text-body mt-5 max-w-[52ch]">{productDescription}</p>
          </div>

          {/* Colour */}
          <div className="border-t border-line pt-5">
            <div className="t-label text-mut mb-3">
              {t('product.colorway')}{' '}
              <span className="text-fg">
                {isArabic ? (selectedColor.nameAr || selectedColor.name) : (selectedColor.nameEn || selectedColor.name)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  aria-pressed={selectedColor.name === c.name}
                  className={`pill pill--sm ${selectedColor.name === c.name ? '!border-fg' : ''}`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-line-strong" style={{ backgroundColor: c.hex }} />
                  {isArabic ? (c.nameAr || c.name) : (c.nameEn || c.name)}
                </button>
              ))}
              {siblings.map((p) => (
                <button key={p.id} type="button" onClick={() => onSelectProduct(p)} className="pill pill--sm opacity-60 hover:opacity-100">
                  {p.colors.slice(0, 1).map((c) => (
                    <span key={c.name} className="w-3.5 h-3.5 rounded-full border border-line-strong" style={{ backgroundColor: c.hex }} />
                  ))}
                  {p.colors.length > 0 ? colourName(p.colors[0], isArabic) : productNameOf(p, isArabic)}
                  <span aria-hidden="true" className="rtl:-scale-x-100">
                    ↗
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="border-t border-line pt-5">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
              <span className="t-label text-mut">
                {t('product.selectSize')} <span className="text-fg t-counter">{selectedSize}</span>
              </span>
              <div className="flex items-center gap-4 t-label">
                <button
                  type="button"
                  onClick={() => onOpenAIFit(product)}
                  className="text-accent hover:text-fg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('nav.aiFit')}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenSizeGuide(product.id)}
                  className="text-mut hover:text-fg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  {t('footer.sizeGuide')}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {product.sizes.map((s) => {
                const variant = product.variants.find((v) => v.colorName === selectedColor.name && v.size === s);
                const variantStock = variant ? Math.max(0, variant.stockCount) : 0;
                const isAvailable = variantStock > 0 || (Boolean(variant) && preordersOpen);
                const soldOut = variantStock <= 0;
                const active = selectedSize === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => setSelectedSize(s)}
                    aria-pressed={active}
                    className={`h-14 rounded-full border flex flex-col items-center justify-center transition-colors cursor-pointer ${
                      active
                        ? 'border-fg bg-fg text-bg'
                        : isAvailable
                          ? 'border-line-strong text-fg hover:border-fg'
                          : 'border-line text-mut line-through cursor-not-allowed'
                    }`}
                  >
                    <span className="t-counter">{s}</span>
                    {soldOut && isAvailable && <span className="t-tag opacity-70">{isArabic ? 'طلب مسبق' : 'Pre-order'}</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-sm pt-3">
              {inStock ? (
                <span className="text-ok flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {stockCount <= 3
                      ? isArabic
                        ? `آخر ${stockCount} قطع من هذا المقاس`
                        : `Only ${stockCount} left in this size`
                      : isArabic
                        ? 'متوفر'
                        : 'In stock'}
                  </span>
                </span>
              ) : canPreorder ? (
                <span className="text-warn leading-relaxed">
                  {isArabic
                    ? `نفد هذا المقاس. اطلبه مسبقاً وادفع عند الاستلام. ${storeSettings.preorderNoteAr}`
                    : `This size is sold out. Pre-order it and pay on delivery. ${storeSettings.preorderNoteEn}`}
                </span>
              ) : (
                <span className="text-err">{t('product.outOfStockSize')}</span>
              )}
            </div>
          </div>

          {/* Quantity & buy */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-full border border-line-strong h-[46px]">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-full px-4 text-mut hover:text-fg cursor-pointer"
                  aria-label={t('cart.decreaseQty')}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="t-counter text-fg w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(Math.max(1, maxQuantity), quantity + 1))}
                  className="h-full px-4 text-mut hover:text-fg cursor-pointer"
                  aria-label={t('cart.increaseQty')}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleAddToCart(true)}
                disabled={!inStock && !canPreorder}
                className="pill pill--solid flex-1"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{canPreorder ? (isArabic ? 'اطلب مسبقاً' : 'Pre-order') : t('common.addToBag')}</span>
              </button>
            </div>
            <button type="button" onClick={handleBuyNow} disabled={!inStock && !canPreorder} className="pill pill--accent pill--block">
              <span>{t('product.orderCod')}</span>
              <ArrowRight className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Trust rows */}
          <ul className="border-t border-line">
            {trust.map((row) => (
              <li key={row.title} className="flex items-start gap-3 py-3.5 border-b border-line text-sm">
                <span className="text-accent mt-0.5 shrink-0">{row.icon}</span>
                <span className="text-mut">
                  <span className="text-fg">{row.title}</span> — {row.text}
                </span>
              </li>
            ))}
          </ul>

          {/* Specifications */}
          <div>
            <h2 className="t-label text-fg mb-4">{t('product.specificationsTitle')}</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {specs.map((spec) => (
                <div key={spec.label}>
                  <dt className="t-label text-mut">{spec.label}</dt>
                  <dd className="text-fg mt-1">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>

      {/* Fit & care */}
      <section className="gutter section border-t border-line grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="t-title text-fg mb-4">{t('product.fitGuideTitle')}</h2>
          <p className="t-blurb text-body max-w-[48ch]" data-reveal>
            {fitDescriptionText}
          </p>
        </div>
        <div>
          <h2 className="t-title text-fg mb-4">{t('product.careTitle')}</h2>
          <ol className="border-t border-line">
            {careInstructionsList.map((inst, i) => (
              <li key={i} className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 py-3 border-b border-line text-sm text-body">
                <span className="t-counter text-accent">{String(i + 1).padStart(2, '0')}</span>
                <span>{inst}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <PixelStrip from="night" to="bone" />

      {/* Customer Reviews */}
      <section data-surface="bone" className="gutter section">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <h2 key={`reveal-1-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg" data-reveal-lines>
              {t('product.reviewsSectionTitle')}
            </h2>
            <p className="text-body mt-4 max-w-[60ch]">
              {isArabic
                ? 'جميع التقييمات تعكس تجارب حقيقية وموثقة لملمس الفليس الناعم والقصة الأوفر سايز.'
                : 'All reviews reflect authentic feedback on soft fleece feel, comfort, and oversized fit.'}
            </p>
          </div>
          <button type="button" onClick={() => setShowReviewForm(!showReviewForm)} className="pill self-start sm:self-auto">
            {showReviewForm ? t('common.cancel') : t('product.writeReview')}
          </button>
        </div>

        {showReviewForm && (
          <form onSubmit={handleAddReview} className="max-w-xl space-y-6 mb-12" noValidate>
            <h3 className="font-display text-xl font-semibold text-fg">
              {isArabic ? `شارك تجربتك مع ${productName}` : `Share your thoughts on ${productName}`}
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-mut">{t('product.reviewAuthor')}</span>
                <input
                  type="text"
                  required
                  maxLength={80}
                  autoComplete="name"
                  value={newReviewAuthor}
                  onChange={(e) => setNewReviewAuthor(e.target.value)}
                  placeholder={isArabic ? 'مثال: طارق ن.' : 'e.g. Tarek N.'}
                  className="field"
                />
              </label>
              <label className="block">
                <span className="text-sm text-mut">{isArabic ? 'المدينة (اختياري)' : 'City (optional)'}</span>
                <input
                  type="text"
                  maxLength={80}
                  value={newReviewLocation}
                  onChange={(e) => setNewReviewLocation(e.target.value)}
                  placeholder={isArabic ? 'مثال: القاهرة' : 'e.g. Cairo'}
                  className="field"
                />
              </label>
            </div>
            <div>
              <span className="text-sm text-mut block mb-2">{t('product.reviewRating')}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReviewRating(star)}
                    className="p-1 cursor-pointer"
                    aria-label={isArabic ? `${star} من 5` : `${star} of 5`}
                    aria-pressed={star <= newReviewRating}
                  >
                    <Star className={`w-5 h-5 ${star <= newReviewRating ? 'fill-accent text-accent' : 'text-mut'}`} />
                  </button>
                ))}
              </div>
            </div>
            <fieldset>
              <legend className="text-sm text-mut mb-2">
                {isArabic ? `كيف كان المقاس ${selectedSize}؟` : `How does size ${selectedSize} fit?`}
              </legend>
              <div className="flex flex-wrap gap-2">
                {FIT_VOTES.map((vote) => (
                  <button
                    key={vote}
                    type="button"
                    onClick={() => setNewReviewFit(vote)}
                    aria-pressed={newReviewFit === vote}
                    className={`pill pill--sm ${newReviewFit === vote ? '!bg-fg !text-bg !border-fg' : ''}`}
                  >
                    {isArabic ? FIT_VOTE_AR[vote] : vote}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="text-sm text-mut">{t('product.reviewComment')}</span>
              <textarea
                rows={3}
                required
                maxLength={2000}
                value={newReviewComment}
                onChange={(e) => setNewReviewComment(e.target.value)}
                placeholder={
                  isArabic
                    ? 'كيف شعرت بملمس الفليس؟ وكيف ناسبتك القصة عند الكتفين؟'
                    : 'How does the soft fleece feel? How does it fit on the shoulders?'
                }
                className="field resize-none"
              />
            </label>
            {reviewError && (
              <p role="alert" className="text-sm text-err">
                {reviewError}
              </p>
            )}
            <button type="submit" disabled={reviewSubmitting} className="pill pill--solid">
              {reviewSubmitting ? t('common.loading') : t('product.submitReview')}
            </button>
          </form>
        )}

        {reviewsError && reviews.length === 0 ? (
          <p role="alert" className="border-t border-line pt-8 text-body">
            {isArabic ? 'تعذر تحميل التقييمات. أعد تحميل الصفحة للمحاولة مرة أخرى.' : 'Reviews could not be loaded. Reload the page to try again.'}
          </p>
        ) : reviews.length === 0 ? (
          <p className="border-t border-line pt-8 text-body">{t('product.noReviewsYet')}</p>
        ) : (
          <div className="border-b border-line">
            {reviews.map((rev) => (
              <article key={rev.id} className="grid gap-4 py-8 border-t border-line md:grid-cols-[96px_minmax(0,2fr)_minmax(0,1fr)]">
                <span className="t-counter text-accent" aria-label={`${rev.rating}/5`}>
                  {'★'.repeat(rev.rating)}
                </span>
                <div>
                  {rev.title && <h3 className="t-row text-fg mb-3">&ldquo;{rev.title}&rdquo;</h3>}
                  <p className="text-body">{rev.comment}</p>
                </div>
                <div className="text-sm text-mut md:text-end space-y-1">
                  <div className="text-fg">
                    {rev.authorName}
                    {rev.verifiedBuyer && <span className="text-ok"> · {isArabic ? 'مشتري موثّق' : 'Verified buyer'}</span>}
                  </div>
                  {rev.location && <div>{rev.location}</div>}
                  <div>
                    {rev.sizePurchased && <>{isArabic ? `مقاس ${rev.sizePurchased}` : `Size ${rev.sizePurchased}`} · </>}
                    {isArabic ? FIT_VOTE_AR[rev.fitVote] : rev.fitVote}
                  </div>
                  <div className="t-counter">{formatDate(rev.createdAt)}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <PixelStrip from="bone" to="night" />

      {/* Phones: fixed buy bar so the order button is always centred and reachable */}
      <div data-surface="night" className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="shrink-0 leading-tight">
            <div className="t-counter text-fg">{formatPrice(price)}</div>
            <div className="t-label text-mut">
              {isArabic ? 'المقاس' : 'Size'} <span className="t-counter text-fg">{selectedSize}</span>
            </div>
          </div>
          <button type="button" onClick={handleBuyNow} disabled={!inStock && !canPreorder} className="pill pill--accent flex-1">
            <span>{canPreorder ? (isArabic ? 'اطلب مسبقاً' : 'Pre-order') : t('product.orderCod')}</span>
            <ArrowRight className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {zoomIndex !== null && (
        <ZoomViewer images={gallery} index={zoomIndex} alt={productName} onIndex={setZoomIndex} onClose={() => setZoomIndex(null)} />
      )}
    </div>
  );
};
