import { AppliedCoupon, Cart, CartItem, Product } from '../types';
import { safeStorage } from '../utils/storage';
import { activePrice } from '../utils/productText';
import { DataService } from './dataService';
import { StoreSettingsService } from './storeSettingsService';

const CART_STORAGE_KEY = 'kemet_cart_v1';

/** Discount a coupon gives on a subtotal: the same rule the database applies in place_order. */
export function couponDiscount(coupon: AppliedCoupon | undefined, subtotal: number): number {
  if (!coupon || subtotal < coupon.minOrderAmount) return 0;
  const raw = coupon.discountType === 'percentage' ? Math.round((subtotal * coupon.discountValue) / 100) : coupon.discountValue;
  return Math.min(raw, subtotal);
}

/** True when the coupon applies to this subtotal (its minimum order is reached). */
export function couponApplies(coupon: AppliedCoupon | undefined, subtotal: number): coupon is AppliedCoupon {
  return Boolean(coupon) && subtotal >= (coupon as AppliedCoupon).minOrderAmount;
}

export class CartService {
  public static getCart(): Cart {
    const data = safeStorage.getItem(CART_STORAGE_KEY);
    if (!data) return this.createEmptyCart();
    try {
      const parsed = JSON.parse(data);
      return this.recalculateCart(
        Array.isArray(parsed.items) ? parsed.items : [],
        parsed.coupon,
        typeof parsed.shippingFee === 'number' ? parsed.shippingFee : 0
      );
    } catch (e) {
      console.error('Failed to read the bag from storage', e);
      return this.createEmptyCart();
    }
  }

  public static createEmptyCart(): Cart {
    return this.recalculateCart([], undefined, 0);
  }

  /**
   * Totals for the bag. `shippingFee` is the chosen governorate's fee (0 until one is chosen);
   * delivery is free from the store's threshold or with a free-shipping coupon.
   */
  public static recalculateCart(items: CartItem[], coupon: AppliedCoupon | undefined, shippingFee: number): Cart {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discount = couponDiscount(coupon, subtotal);
    const threshold = StoreSettingsService.getSettingsSync().freeShippingThreshold;
    const freeShipping = subtotal >= threshold || (couponApplies(coupon, subtotal) && coupon.freeShipping);
    const effectiveShipping = items.length === 0 || freeShipping ? 0 : shippingFee;
    return {
      items,
      subtotal,
      coupon,
      discount,
      discountCode: coupon?.code,
      shippingFee: effectiveShipping,
      freeShippingThreshold: threshold,
      total: Math.max(0, subtotal - discount + effectiveShipping),
    };
  }

  public static saveCart(cart: Cart, shippingFee: number): void {
    safeStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: cart.items, coupon: cart.coupon, shippingFee }));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('kemet_cart_updated'));
  }

  /** The governorate fee last chosen at checkout (stored before free-shipping rules). */
  private static storedShippingFee(): number {
    const data = safeStorage.getItem(CART_STORAGE_KEY);
    if (!data) return 0;
    try {
      const parsed = JSON.parse(data);
      return typeof parsed.shippingFee === 'number' ? parsed.shippingFee : 0;
    } catch {
      return 0;
    }
  }

  private static update(items: CartItem[], coupon: AppliedCoupon | undefined, shippingFee = this.storedShippingFee()): Cart {
    const cart = this.recalculateCart(items, coupon, shippingFee);
    this.saveCart(cart, shippingFee);
    return cart;
  }

  public static addItem(item: Omit<CartItem, 'id'>): Cart {
    const current = this.getCart();
    const id = `${item.productId}-${item.colorName}-${item.size}${item.isPreorder ? '-preorder' : ''}`;
    const exists = current.items.some((i) => i.id === id);
    const items = exists
      ? current.items.map((i) => (i.id === id ? { ...i, quantity: i.quantity + item.quantity } : i))
      : [...current.items, { ...item, id }];
    return this.update(items, current.coupon);
  }

  public static updateQuantity(itemId: string, newQty: number): Cart {
    const current = this.getCart();
    const items =
      newQty <= 0
        ? current.items.filter((i) => i.id !== itemId)
        : current.items.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i));
    return this.update(items, current.coupon);
  }

  public static removeItem(itemId: string): Cart {
    return this.updateQuantity(itemId, 0);
  }

  /** Checks the code with the database and keeps its rule in the bag. */
  public static async applyCoupon(code: string): Promise<{ success: true; cart: Cart } | { success: false; reason: string; minOrderAmount?: number }> {
    const clean = code.trim().toUpperCase();
    if (!clean) return { success: false, reason: 'INVALID' };
    const current = this.getCart();
    const quote = await DataService.checkCoupon(clean, current.subtotal);
    if (!quote.valid) return { success: false, reason: quote.reason, minOrderAmount: quote.minOrderAmount };
    return { success: true, cart: this.update(current.items, quote.coupon) };
  }

  public static removeCoupon(): Cart {
    return this.update(this.getCart().items, undefined);
  }

  /** Brings bag prices up to date with the catalogue; the database charges the current price. */
  public static syncPrices(products: Product[]): Cart {
    const current = this.getCart();
    let changed = false;
    const items = current.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product || activePrice(product) === item.unitPrice) return item;
      changed = true;
      return { ...item, unitPrice: activePrice(product) };
    });
    return changed ? this.update(items, current.coupon) : current;
  }

  /** Stores the chosen governorate's delivery fee. */
  public static setShippingFee(fee: number): Cart {
    const current = this.getCart();
    return this.update(current.items, current.coupon, fee);
  }

  public static clearCart(): void {
    this.update([], undefined, 0);
  }
}
