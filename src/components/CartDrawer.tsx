import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { X, Plus, Minus, Check, Tag, ArrowRight, Loader2 } from 'lucide-react';
import { Cart } from '../types';
import { CartService, couponApplies } from '../services/cartService';
import { useToast } from './Toast';
import { normalizeImagePath } from '../utils/imageUtils';
import { errorMessage } from '../lib/supabase';
import { couponReasonText } from '../utils/couponText';

/** Pieces of one item per order (same limit as the database). */
const MAX_PIECES = 20;
import { useLanguage } from '../context/LanguageContext';
import { gsap, EASE, prefersReducedMotion } from '../motion/gsap';
import { lockScroll } from '../motion/SmoothScroll';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
  onNavigateShop: () => void;
  isArabic?: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onCheckout,
  onNavigateShop,
}) => {
  const { t, formatPrice, dir, isArabic } = useLanguage();
  const { showToast } = useToast();
  const [cart, setCart] = useState<Cart>(() => CartService.getCart());
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const reloadCart = () => {
    setCart(CartService.getCart());
  };

  useEffect(() => {
    if (isOpen) {
      reloadCart();
    }
    const handleUpdate = () => reloadCart();
    window.addEventListener('kemet_cart_updated', handleUpdate);
    return () => window.removeEventListener('kemet_cart_updated', handleUpdate);
  }, [isOpen]);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Slide in from the reading end; lock page scroll; Escape closes.
  useLayoutEffect(() => {
    if (!isOpen) return;
    lockScroll(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    if (!prefersReducedMotion()) {
      gsap.fromTo(panelRef.current, { xPercent: dir === 'rtl' ? -100 : 100 }, { xPercent: 0, duration: 0.7, ease: EASE });
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      lockScroll(false);
    };
  }, [isOpen, dir]);

  if (!isOpen) return null;

  const handleUpdateQty = (itemId: string, qty: number) => {
    const item = cart.items.find((i) => i.id === itemId);
    if (item?.maxQuantity !== undefined && qty > item.maxQuantity) {
      showToast(
        isArabic ? 'الكمية غير متاحة' : 'Not enough stock',
        isArabic ? `المتاح ${item.maxQuantity} قطعة فقط.` : `Only ${item.maxQuantity} available.`,
        'error'
      );
      return;
    }
    if (qty > MAX_PIECES) {
      showToast(
        isArabic ? 'الحد الأقصى للكمية' : 'Quantity limit',
        isArabic ? `حتى ${MAX_PIECES} قطعة من كل منتج في الطلب الواحد.` : `Up to ${MAX_PIECES} pieces of each item per order.`,
        'error'
      );
      return;
    }
    const updated = CartService.updateQuantity(itemId, qty);
    setCart(updated);
  };

  const handleRemove = (itemId: string, name: string) => {
    const updated = CartService.removeItem(itemId);
    setCart(updated);
    showToast(t('toast.itemRemoved'), name, 'info');
  };

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await CartService.applyCoupon(promoInput);
      if (res.success) {
        setCart(res.cart);
        setPromoInput('');
        showToast(t('toast.discountApplied'), res.cart.discountCode, 'success');
      } else {
        setPromoError(couponReason(res.reason, res.minOrderAmount));
      }
    } catch (err) {
      console.error('[CartDrawer] coupon check failed:', errorMessage(err));
      setPromoError(isArabic ? 'تعذر التحقق من الكود. حاول مرة أخرى.' : 'We could not check the code. Try again.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    const updated = CartService.removeCoupon();
    setCart(updated);
    showToast(t('toast.discountRemoved'), undefined, 'info');
  };

  const couponReason = (reason: string, minOrderAmount?: number) => couponReasonText(reason, minOrderAmount, isArabic, formatPrice);

  const couponOn = couponApplies(cart.coupon, cart.subtotal);
  const freeDelivery = cart.subtotal >= cart.freeShippingThreshold || (couponApplies(cart.coupon, cart.subtotal) && cart.coupon.freeShipping);
  const progressPercentage = freeDelivery ? 100 : Math.min(100, Math.round((cart.subtotal / cart.freeShippingThreshold) * 100));
  const remainingForFreeShipping = freeDelivery ? 0 : Math.max(0, cart.freeShippingThreshold - cart.subtotal);
  const pieces = cart.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="fixed inset-0 z-[105] flex justify-end" role="dialog" aria-modal="true" aria-label={t('cart.title')}>
      <div className="popup-scrim fixed inset-0 bg-night/85 cursor-pointer" onClick={onClose} />

      <div ref={panelRef} data-surface="bone" className="relative z-10 flex h-full w-full max-w-[480px] flex-col" data-lenis-prevent>
        <div className="flex items-center justify-between gap-4 px-6 pb-5 pt-6 sm:px-8 sm:pt-8">
          <h2 className="font-display text-[clamp(28px,3vw,36px)] font-semibold leading-none tracking-[-0.03em] text-fg">
            {t('cart.title')} <span className="text-mut tabular-nums">({pieces})</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-fg transition-colors hover:border-fg cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Free delivery: the rule fills toward the threshold. */}
        <div className="px-6 pb-6 sm:px-8">
          {remainingForFreeShipping > 0 ? (
            <p className="text-sm text-body">{t('cart.freeShippingAdd', { amount: formatPrice(remainingForFreeShipping) })}</p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ok">
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>{t('cart.freeShippingQualified')}</span>
            </p>
          )}
          <div className="relative mt-3 h-0.5 w-full bg-line">
            <div
              className="absolute inset-y-0 start-0 bg-clay transition-[width] duration-700 ease-out-rl"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto border-t border-line px-6 sm:px-8">
          {cart.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
              <h3 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-fg">{t('cart.emptyTitle')}</h3>
              <p className="max-w-xs text-body">{t('cart.emptyDesc')}</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateShop();
                }}
                className="pill pill--solid mt-3"
              >
                <span>{t('cart.exploreHoodies')}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </button>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.id} className="flex gap-5 border-b border-line py-6 last:border-b-0">
                <div className="h-[120px] w-24 shrink-0 overflow-hidden bg-bone-2">
                  <img
                    src={normalizeImagePath(item.image)}
                    alt={item.productName}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-[17px] font-semibold leading-tight tracking-[-0.01em] text-fg">
                        {isArabic ? item.productNameAr || item.productName : item.productName}
                      </h3>
                      <p className="mt-1.5 text-sm text-mut">
                        {isArabic ? item.colorNameAr || item.colorName : item.colorName}
                        <span aria-hidden="true"> · </span>
                        <span className="tabular-nums">{item.size}</span>
                      </p>
                      {item.isPreorder && <p className="mt-1 text-sm text-accent">{isArabic ? 'طلب مسبق' : 'Pre-order'}</p>}
                    </div>
                    <span className="t-counter shrink-0 text-fg">{formatPrice(item.unitPrice * item.quantity)}</span>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <div className="flex h-10 items-center rounded-full border border-line-strong">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                        className="grid h-full w-10 place-items-center text-mut transition-colors hover:text-fg cursor-pointer"
                        aria-label={t('cart.decreaseQty')}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="t-counter w-6 text-center text-fg">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                        className="grid h-full w-10 place-items-center text-mut transition-colors hover:text-fg cursor-pointer"
                        aria-label={t('cart.increaseQty')}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id, item.productName)}
                      aria-label={`${t('cart.removeItem')}: ${item.productName}`}
                      className="text-sm text-mut underline underline-offset-4 transition-colors hover:text-fg cursor-pointer"
                    >
                      {t('cart.remove')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="space-y-5 border-t border-line px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
            {cart.coupon ? (
              <div className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className={`flex items-center gap-2 ${couponOn ? 'text-ok' : 'text-fg'}`}>
                    <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {couponOn
                        ? t('cart.promoApplied', { code: cart.coupon.code, amount: formatPrice(cart.discount) })
                        : cart.coupon.code}
                    </span>
                  </p>
                  {!couponOn && <p className="mt-1 text-xs text-mut">{couponReason('MIN_ORDER', cart.coupon.minOrderAmount)}</p>}
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="shrink-0 text-mut underline underline-offset-4 transition-colors hover:text-fg cursor-pointer"
                >
                  {t('cart.removePromo')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyPromo} className="flex items-end gap-4">
                <div className="group relative min-w-0 flex-1">
                  <label htmlFor="cart-promo" className="sr-only">
                    {t('cart.promoPlaceholder')}
                  </label>
                  <input
                    id="cart-promo"
                    type="text"
                    autoComplete="off"
                    placeholder={t('cart.promoPlaceholder')}
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="field-line w-full rounded-none border-0 border-b border-line-strong bg-transparent px-0 py-3 text-[16px] uppercase text-fg placeholder:normal-case focus:outline-none"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left scale-x-0 bg-clay transition-transform duration-500 ease-out-rl group-focus-within:scale-x-100 rtl:origin-right"
                  />
                </div>
                <button
                  type="submit"
                  disabled={promoLoading || !promoInput.trim()}
                  className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-fg underline underline-offset-4 cursor-pointer disabled:cursor-default disabled:text-mut disabled:no-underline"
                >
                  {promoLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                  {t('cart.applyPromo')}
                </button>
              </form>
            )}

            {promoError && (
              <p role="alert" className="text-sm text-err">
                {promoError}
              </p>
            )}

            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between text-mut">
                <dt>{t('cart.subtotal')}</dt>
                <dd className="t-counter text-fg">{formatPrice(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-mut">
                <dt>{t('cart.shipping')}</dt>
                <dd className="text-fg">{freeDelivery ? t('cart.freeShippingLabel') : t('cart.shippingCalculated')}</dd>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-ok">
                  <dt>{t('cart.discount')}</dt>
                  <dd className="t-counter">-{formatPrice(cart.discount)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <dt className="text-fg">{t('cart.total')}</dt>
                <dd className="font-display text-[28px] font-semibold tracking-[-0.02em] text-fg tabular-nums">
                  {formatPrice(cart.subtotal - cart.discount)}
                </dd>
              </div>
            </dl>

            <button type="button" onClick={onCheckout} className="pill pill--solid pill--block !py-[18px]">
              <span>{t('cart.proceedCheckout')}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
