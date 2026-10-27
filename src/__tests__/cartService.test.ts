import { describe, it, expect, beforeEach, vi } from 'vitest';

// Tests must never reach the production database: any use of the Supabase client throws.
vi.mock('../lib/supabase', () => ({
  supabase: new Proxy(
    {},
    {
      get: () => {
        throw new Error('Tests must not reach the database');
      },
    }
  ),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

import { CartService } from '../services/cartService';
import { StoreSettingsService } from '../services/storeSettingsService';
import { INITIAL_STORE_SETTINGS } from '../data/storeDefaults';
import { safeStorage } from '../utils/storage';
import { CartItem } from '../types';

const line = (unitPrice: number, quantity: number): CartItem => ({
  id: 'item-1',
  productId: 'prod-essential-hoodie-black',
  variantId: 'eh-blk-l',
  productName: 'RootLand Essential Hoodie – Black',
  productSlug: 'rootland-essential-hoodie-black',
  image: '/src/assets/images/hoodie_essential_black.webp',
  colorName: 'Black',
  colorHex: '#000',
  size: 'L',
  unitPrice,
  quantity,
  sku: 'RL-EH-BLK-L',
});

describe('CartService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(StoreSettingsService, 'getSettingsSync').mockReturnValue(INITIAL_STORE_SETTINGS);
    safeStorage.clear();
  });

  it('adds the governorate fee below the free-delivery threshold', () => {
    const empty = CartService.createEmptyCart();
    expect(empty.items).toHaveLength(0);
    expect(empty.subtotal).toBe(0);
    expect(empty.shippingFee).toBe(0);

    const cart = CartService.recalculateCart([line(1950, 1)], undefined, 65);
    expect(cart.subtotal).toBe(1950);
    expect(cart.shippingFee).toBe(65);
    expect(cart.total).toBe(2015);
  });

  it('delivers free once the subtotal reaches the threshold from store settings', () => {
    const cart = CartService.recalculateCart([line(1950, 2)], undefined, 65);
    expect(cart.subtotal).toBe(3900);
    expect(cart.shippingFee).toBe(0);
    expect(cart.total).toBe(3900);

    vi.spyOn(StoreSettingsService, 'getSettingsSync').mockReturnValue({ ...INITIAL_STORE_SETTINGS, freeShippingThreshold: 5000 });
    expect(CartService.recalculateCart([line(1950, 2)], undefined, 65).shippingFee).toBe(65);
  });

  it('only discounts with a code the database accepted (no built-in codes)', () => {
    const cart = CartService.recalculateCart([line(1250, 1)], undefined, 65);
    expect(cart.discount).toBe(0);
    expect(cart.total).toBe(1250 + 65);
  });

  it('keeps the chosen governorate fee in storage across reloads', () => {
    CartService.addItem({ ...line(1250, 1), id: undefined } as unknown as Omit<CartItem, 'id'>);
    CartService.setShippingFee(110);
    const reloaded = CartService.getCart();
    expect(reloaded.shippingFee).toBe(110);
    expect(reloaded.total).toBe(1360);
  });
});
