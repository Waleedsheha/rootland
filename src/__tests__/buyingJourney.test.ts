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

import { CartService, couponDiscount } from '../services/cartService';
import { OrderService } from '../services/orderService';
import { DataService, PlaceOrderInput } from '../services/dataService';
import { StoreSettingsService } from '../services/storeSettingsService';
import { buildRoleInfo, ROLE_TABS } from '../services/authService';
import { FitRecommendationService } from '../services/fitRecommendationService';
import { normalizeEgyptMobile } from '../pages/CheckoutPage';
import { orderStatusLabel, orderStep } from '../utils/orderText';
import { couponReasonText } from '../utils/couponText';
import { INITIAL_PRODUCTS } from '../data/products';
import { INITIAL_STORE_SETTINGS } from '../data/storeDefaults';
import { safeStorage } from '../utils/storage';
import { AppliedCoupon, Order } from '../types';

const black = INITIAL_PRODUCTS[0];

function cartLine(quantity: number, unitPrice = black.price, isPreorder = false) {
  return {
    productId: black.id,
    variantId: black.variants[0].id,
    productName: black.name,
    productSlug: black.slug,
    image: black.primaryImage,
    colorName: black.colors[0].name,
    colorHex: black.colors[0].hex,
    size: 'L' as const,
    unitPrice,
    quantity,
    sku: black.variants[0].sku,
    isPreorder,
  };
}

const TEN_PERCENT: AppliedCoupon = { code: 'TEST10', discountType: 'percentage', discountValue: 10, minOrderAmount: 2000, freeShipping: false };

function placedOrder(input: PlaceOrderInput): Order {
  return {
    id: '7b1f2c4e-0000-4000-8000-000000000001',
    orderNumber: 'RL-261026-TEST',
    customerEmail: input.email,
    customerPhone: input.address.phone,
    shippingAddress: { ...input.address, governorate: 'Cairo', governorateId: 'cairo', governorateAr: 'القاهرة' },
    items: [],
    subtotal: 1250,
    discount: 0,
    shippingFee: 65,
    total: input.expectedTotal,
    paymentMethod: 'cod',
    paymentStatus: 'cash_on_delivery',
    orderStatus: 'pending',
    isPreorder: false,
    customerLanguage: input.language,
    notes: input.notes,
    courier: '',
    trackingNumber: '',
    stockReleased: false,
    timeline: [{ status: 'pending', timestamp: '2026-10-26T10:00:00Z' }],
    createdAt: '2026-10-26T10:00:00Z',
    updatedAt: '2026-10-26T10:00:00Z',
  };
}

const ORDER_INPUT: PlaceOrderInput = {
  items: [{ variantId: black.variants[0].id, quantity: 1, isPreorder: false }],
  address: {
    fullName: 'Test Buyer',
    phone: '01012345678',
    governorate: 'cairo',
    city: 'Nasr City',
    district: '',
    streetAddress: '1 Test St',
    buildingNumber: '1',
    floorApartment: '',
    nearestLandmark: '',
  },
  email: '',
  notes: '',
  couponCode: '',
  language: 'en',
  expectedTotal: 1315,
};

describe('Cash-on-delivery buying flow (no live database)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(StoreSettingsService, 'getSettingsSync').mockReturnValue(INITIAL_STORE_SETTINGS);
    safeStorage.clear();
    CartService.clearCart();
  });

  it('free delivery starts at exactly 3,000 EGP', () => {
    const below = CartService.recalculateCart([{ ...cartLine(1, 2999), id: 'a' }], undefined, 65);
    expect(below.shippingFee).toBe(65);
    expect(below.total).toBe(3064);
    const exact = CartService.recalculateCart([{ ...cartLine(1, 3000), id: 'a' }], undefined, 65);
    expect(exact.shippingFee).toBe(0);
    expect(exact.total).toBe(3000);
  });

  it('a free-delivery code removes the fee once its minimum is reached', () => {
    const code: AppliedCoupon = { ...TEN_PERCENT, freeShipping: true };
    const below = CartService.recalculateCart([{ ...cartLine(1, 1250), id: 'a' }], code, 65);
    expect(below.shippingFee).toBe(65);
    expect(below.discount).toBe(0);
    const reached = CartService.recalculateCart([{ ...cartLine(2, 1250), id: 'a' }], code, 65);
    expect(reached.shippingFee).toBe(0);
    expect(reached.discount).toBe(250);
    expect(reached.total).toBe(2250);
  });

  it('percentage codes round like the database and never exceed the subtotal', () => {
    expect(couponDiscount(TEN_PERCENT, 2005)).toBe(201); // 200.5 rounds up, as Postgres round() does
    expect(couponDiscount(TEN_PERCENT, 1999)).toBe(0);
    expect(couponDiscount({ ...TEN_PERCENT, discountType: 'fixed', discountValue: 5000, minOrderAmount: 0 }, 1250)).toBe(1250);
  });

  it('keeps pre-order lines separate from in-stock lines in the bag', () => {
    CartService.addItem(cartLine(1));
    const cart = CartService.addItem(cartLine(1, black.price, true));
    expect(cart.items).toHaveLength(2);
    expect(cart.items.find((i) => i.isPreorder)?.id).toMatch(/-preorder$/);
  });

  it('brings old bag prices up to the catalogue price', () => {
    CartService.addItem(cartLine(2, 1100));
    const synced = CartService.syncPrices([{ ...black, price: 1250, salePrice: undefined }]);
    expect(synced.items[0].unitPrice).toBe(1250);
    expect(synced.subtotal).toBe(2500);
    const onSale = CartService.syncPrices([{ ...black, price: 1250, salePrice: 999 }]);
    expect(onSale.items[0].unitPrice).toBe(999);
  });

  it('places the order through the database and keeps a copy in this browser', async () => {
    const spy = vi.spyOn(DataService, 'placeOrder').mockImplementation(async (input) => placedOrder(input));
    const order = await OrderService.placeOrder(ORDER_INPUT);
    expect(spy).toHaveBeenCalledWith(ORDER_INPUT);
    expect(order.paymentMethod).toBe('cod');
    expect(OrderService.getOrders()[0].orderNumber).toBe('RL-261026-TEST');
    expect(await OrderService.findOrder('#rl-261026-test')).toEqual(order);
  });

  it('passes database refusals on to the checkout', async () => {
    vi.spyOn(DataService, 'placeOrder').mockRejectedValue(new Error('OUT_OF_STOCK:RootLand Essential Hoodie – Black L'));
    await expect(OrderService.placeOrder(ORDER_INPUT)).rejects.toThrow('OUT_OF_STOCK');
    expect(OrderService.getOrders()).toHaveLength(0);
  });
});

describe('Launch helpers', () => {
  it('validates Egyptian mobile numbers', () => {
    expect(normalizeEgyptMobile('010 1234 5678')).toBe('01012345678');
    expect(normalizeEgyptMobile('+20 111 950 9756')).toBe('01119509756');
    expect(normalizeEgyptMobile('0020 1550000000')).toBe('01550000000');
    expect(normalizeEgyptMobile('0131234567')).toBeNull();
    expect(normalizeEgyptMobile('12345')).toBeNull();
  });

  it('labels every order status in both languages and orders the happy path', () => {
    expect(orderStatusLabel('shipped', false)).toBe('With the courier');
    expect(orderStatusLabel('delivered', true)).toBe('تم التسليم');
    expect(['pending', 'confirmed', 'processing', 'shipped', 'delivered'].map((s) => orderStep(s as Order['orderStatus']))).toEqual([1, 2, 3, 4, 5]);
    expect(orderStep('refused')).toBe(0);
  });

  it('explains refused coupons, with the minimum order when there is one', () => {
    const price = (n: number) => `${n} EGP`;
    expect(couponReasonText('MIN_ORDER', 2000, false, price)).toBe('This code needs an order of 2000 EGP or more.');
    expect(couponReasonText('EXPIRED', undefined, true, price)).toBe('انتهت صلاحية هذا الكود.');
  });

  it('gives each admin role only its own sections', () => {
    expect(ROLE_TABS.ORDERS).toEqual(['dashboard', 'orders', 'customers']);
    expect(ROLE_TABS.CONTENT).not.toContain('orders');
    expect(buildRoleInfo('CONTENT').canManageOrders).toBe(false);
    expect(buildRoleInfo('MARKETING').canManageSettings).toBe(false);
    expect(buildRoleInfo('OWNER').canManageStaff).toBe(true);
    expect(ROLE_TABS.OWNER).toEqual(expect.arrayContaining(['settings', 'staff', 'activity']));
  });

  it('fit tool answers in Arabic and never recommends S or M', () => {
    const rec = FitRecommendationService.calculateRecommendation(
      { heightCm: 170, weightKg: 62, ageRange: '18-24', bodyType: 'slim', normalClothingSize: 'S', desiredFit: 'regular', genderPreference: 'unisex' },
      undefined,
      'ar'
    );
    expect(['L', 'XL', 'XXL']).toContain(rec.recommendedSize);
    expect(rec.fitExplanation).toMatch(/[؀-ۿ]/);
  });
});
