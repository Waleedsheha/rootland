import { supabase, errorMessage } from '../lib/supabase';
import {
  AppliedCoupon,
  B2BQuoteRequest,
  CouponItem,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  ProductVariant,
  Review,
  TrackedOrder,
} from '../types';
import { sanitizeProduct } from '../utils/imageUtils';

/**
 * Everything the store reads from and writes to Supabase. Reads follow row level security;
 * orders, stock and coupons only change through the database functions (place_order,
 * update_order_status, set_variant_stock, ...), which re-check prices, stock and roles.
 * Errors are thrown with the database message (e.g. "OUT_OF_STOCK:RootLand Hoodie Black L").
 */

export type StaffRole = 'OWNER' | 'ORDERS' | 'CONTENT' | 'MARKETING';

export interface StaffMember {
  email: string;
  role: StaffRole;
  addedBy: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: number;
  actor: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  createdAt: string;
}

export interface CustomerAccount {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  createdAt: string;
  emailConfirmedAt?: string;
  lastSignInAt?: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt?: string;
}

export type CouponQuote =
  | { valid: true; coupon: AppliedCoupon; discount: number }
  /** reason: INVALID | NOT_STARTED | EXPIRED | USED_UP | ALREADY_USED | MIN_ORDER */
  | { valid: false; reason: string; minOrderAmount?: number };

export interface PlaceOrderInput {
  items: { variantId: string; quantity: number; isPreorder: boolean }[];
  address: {
    fullName: string;
    phone: string;
    /** Governorate id, e.g. "cairo" */
    governorate: string;
    city: string;
    district: string;
    streetAddress: string;
    buildingNumber: string;
    floorApartment: string;
    nearestLandmark: string;
  };
  email: string;
  notes: string;
  couponCode: string;
  language: 'en' | 'ar';
  /** The total the customer saw; the database refuses the order if it changed meanwhile. */
  expectedTotal: number;
}

function fail(error: unknown): never {
  throw new Error(errorMessage(error));
}

/**
 * Row level security turns a forbidden update or delete into "0 rows changed" instead of an error;
 * staff writes select the changed rows so that case is reported.
 */
function expectChanged(result: { data: unknown[] | null; error: unknown }): void {
  if (result.error) fail(result.error);
  if (!result.data || result.data.length === 0) throw new Error('NOT_ALLOWED');
}

// ---------------------------------------------------------------------------------------
// Row mappers (database snake_case → app types)
// ---------------------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export function variantFromRow(row: Row): ProductVariant {
  return {
    id: row.id,
    sku: row.sku,
    colorName: row.color_name,
    colorArabicName: row.color_name_ar ?? undefined,
    colorHex: row.color_hex,
    size: row.size,
    stockCount: row.stock_count,
    inStock: row.stock_count > 0,
  };
}

export function productFromRow(row: Row): Product {
  const variants: Row[] = Array.isArray(row.product_variants) ? [...row.product_variants] : [];
  variants.sort((a, b) => a.sort_order - b.sort_order);
  return sanitizeProduct({
    ...(row.details as Omit<Product, 'id' | 'slug' | 'price' | 'salePrice' | 'status' | 'variants'>),
    id: row.id,
    slug: row.slug,
    price: row.price,
    salePrice: row.sale_price ?? undefined,
    status: row.status,
    variants: variants.map(variantFromRow),
  });
}

function itemFromRow(row: Row): OrderItem {
  return {
    productId: row.product_id,
    variantId: row.variant_id,
    sku: row.sku,
    productName: row.product_name,
    productNameAr: row.product_name_ar ?? undefined,
    colorName: row.color_name,
    colorNameAr: row.color_name_ar ?? undefined,
    size: row.size,
    unitPrice: row.unit_price,
    quantity: row.quantity,
    image: row.image,
    isPreorder: row.is_preorder,
  };
}

export function orderFromRow(row: Row): Order {
  const items: Row[] = Array.isArray(row.order_items) ? [...row.order_items] : [];
  items.sort((a, b) => a.id - b.id);
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id ?? undefined,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    shippingAddress: row.shipping_address,
    items: items.map(itemFromRow),
    subtotal: row.subtotal,
    discount: row.discount,
    shippingFee: row.shipping_fee,
    total: row.total,
    couponCode: row.coupon_code ?? undefined,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    isPreorder: row.is_preorder,
    preorderNote: row.preorder_note ?? undefined,
    customerLanguage: row.customer_language,
    notes: row.notes,
    courier: row.courier,
    trackingNumber: row.tracking_number,
    stockReleased: row.stock_released,
    timeline: row.timeline,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function trackedFromRow(row: Row): TrackedOrder {
  return {
    orderNumber: row.order_number,
    orderStatus: row.order_status,
    paymentStatus: row.payment_status,
    firstName: row.first_name,
    governorate: row.governorate,
    governorateAr: row.governorate_ar,
    city: row.city,
    subtotal: row.subtotal,
    discount: row.discount,
    shippingFee: row.shipping_fee,
    total: row.total,
    isPreorder: row.is_preorder,
    preorderNote: row.preorder_note ?? undefined,
    courier: row.courier,
    trackingNumber: row.tracking_number,
    createdAt: row.created_at,
    timeline: row.timeline,
    items: (row.order_items as Row[]).map((i) => ({
      productName: i.product_name,
      productNameAr: i.product_name_ar ?? undefined,
      colorName: i.color_name,
      colorNameAr: i.color_name_ar ?? undefined,
      size: i.size,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      image: i.image,
      isPreorder: i.is_preorder,
    })),
  };
}

export function reviewFromRow(row: Row): Review {
  return {
    id: row.id,
    productId: row.product_id,
    authorName: row.author_name,
    location: row.location,
    rating: row.rating,
    title: row.title,
    comment: row.comment,
    verifiedBuyer: row.verified_buyer,
    sizePurchased: row.size_purchased,
    fitVote: row.fit_vote,
    published: row.published,
    createdAt: row.created_at,
  };
}

function couponFromRow(row: Row): CouponItem {
  return {
    code: row.code,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minOrderAmount: row.min_order_amount,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    usageLimit: row.usage_limit ?? undefined,
    usageCount: row.usage_count,
    oneUsePerCustomer: row.one_use_per_customer,
    freeShipping: row.free_shipping,
    active: row.active,
    createdAt: row.created_at,
  };
}

function leadFromRow(row: Row): B2BQuoteRequest {
  return {
    ...(row.details as Omit<B2BQuoteRequest, 'id' | 'companyName' | 'contactPerson' | 'email' | 'phone' | 'estimatedQuantity' | 'status' | 'notes' | 'createdAt'>),
    id: row.id,
    companyName: row.company_name,
    contactPerson: row.contact_person,
    email: row.email,
    phone: row.phone,
    estimatedQuantity: row.estimated_quantity,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------------------
// Live updates
// ---------------------------------------------------------------------------------------

let channelSeq = 0;

/**
 * Calls onChange whenever a row in one of the tables changes (row level security applies, so each
 * visitor only hears about rows they may read). Returns the unsubscribe function.
 */
export function watchTables(tables: string[], onChange: () => void): () => void {
  channelSeq += 1;
  const channel = supabase.channel(`rootland-${tables.join('-')}-${channelSeq}`);
  for (const table of tables) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange());
  }
  channel.subscribe((status, err) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error(`[realtime] ${tables.join(', ')}: ${status}`, err);
    }
  });
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Fetches now, then again whenever the watched tables change. */
function liveQuery<T>(
  tables: string[],
  load: () => Promise<T>,
  onData: (data: T) => void,
  onError: (message: string) => void
): () => void {
  let stopped = false;
  let pending: ReturnType<typeof setTimeout> | null = null;
  const run = () => {
    load()
      .then((data) => {
        if (!stopped) onData(data);
      })
      .catch((err) => {
        if (!stopped) onError(errorMessage(err));
      });
  };
  run();
  const unwatch = watchTables(tables, () => {
    // Bursts of changes (an order and its stock updates) refresh once.
    if (pending) clearTimeout(pending);
    pending = setTimeout(run, 250);
  });
  return () => {
    stopped = true;
    if (pending) clearTimeout(pending);
    unwatch();
  };
}

// ---------------------------------------------------------------------------------------
// Data service
// ---------------------------------------------------------------------------------------

export class DataService {
  // ----- Catalog -----

  /** Active products for the storefront; staff with catalog access also get drafts. */
  public static async fetchProducts(options: { includeDrafts?: boolean } = {}): Promise<Product[]> {
    let query = supabase.from('products').select('*, product_variants(*)').order('sort_order');
    if (!options.includeDrafts) query = query.eq('status', 'active');
    const { data, error } = await query;
    if (error) fail(error);
    return data.map(productFromRow);
  }

  public static subscribeToProducts(
    onData: (products: Product[]) => void,
    onError: (message: string) => void,
    options: { includeDrafts?: boolean } = {}
  ): () => void {
    return liveQuery(['products', 'product_variants'], () => this.fetchProducts(options), onData, onError);
  }

  /** Content team: product-level fields (names, copy, images, price, sale price, status). */
  public static async updateProduct(product: Product): Promise<void> {
    const { id, slug, price, salePrice, status, variants: _variants, ...details } = product;
    expectChanged(
      await supabase
        .from('products')
        .update({ slug, price, sale_price: salePrice ?? null, status, details })
        .eq('id', id)
        .select('id')
    );
  }

  public static async setVariantStock(variantId: string, stock: number): Promise<number> {
    const { data, error } = await supabase.rpc('set_variant_stock', { p_variant_id: variantId, p_stock: stock });
    if (error) fail(error);
    return data as number;
  }

  // ----- Orders -----

  public static async placeOrder(input: PlaceOrderInput): Promise<Order> {
    const { data, error } = await supabase.rpc('place_order', {
      p_items: input.items,
      p_address: input.address,
      p_email: input.email,
      p_notes: input.notes,
      p_coupon_code: input.couponCode,
      p_language: input.language,
      p_expected_total: input.expectedTotal,
    });
    if (error) fail(error);
    return orderFromRow(data);
  }

  /** Guest tracking: order number + the phone used at checkout. Null when they do not match. */
  public static async trackOrder(orderNumber: string, phone: string): Promise<TrackedOrder | null> {
    const { data, error } = await supabase.rpc('track_order', { p_order_number: orderNumber, p_phone: phone });
    if (error) fail(error);
    return data ? trackedFromRow(data) : null;
  }

  /** The signed-in customer's orders, newest first. */
  public static async fetchMyOrders(userId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) fail(error);
    return data.map(orderFromRow);
  }

  /** An order by number, if the signed-in user may read it (their own, or staff). */
  public static async fetchOrderByNumber(orderNumber: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('order_number', orderNumber.trim().toUpperCase())
      .maybeSingle();
    if (error) fail(error);
    return data ? orderFromRow(data) : null;
  }

  public static async fetchAllOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    if (error) fail(error);
    return data.map(orderFromRow);
  }

  public static subscribeToOrders(onData: (orders: Order[]) => void, onError: (message: string) => void): () => void {
    return liveQuery(['orders'], () => this.fetchAllOrders(), onData, onError);
  }

  public static async updateOrderStatus(orderId: string, status: OrderStatus, note: string): Promise<Order> {
    const { data, error } = await supabase.rpc('update_order_status', { p_order_id: orderId, p_status: status, p_note: note });
    if (error) fail(error);
    return orderFromRow(data);
  }

  public static async updateOrderShipping(orderId: string, courier: string, trackingNumber: string): Promise<Order> {
    const { data, error } = await supabase.rpc('update_order_shipping', {
      p_order_id: orderId,
      p_courier: courier,
      p_tracking_number: trackingNumber,
    });
    if (error) fail(error);
    return orderFromRow(data);
  }

  public static async fetchInternalNotes(orderId: string): Promise<string> {
    const { data, error } = await supabase.from('order_internal_notes').select('notes').eq('order_id', orderId).maybeSingle();
    if (error) fail(error);
    return data ? data.notes : '';
  }

  public static async saveInternalNotes(orderId: string, notes: string): Promise<void> {
    const { error } = await supabase.rpc('save_order_internal_notes', { p_order_id: orderId, p_notes: notes });
    if (error) fail(error);
  }

  // ----- Customers -----

  public static async fetchCustomers(): Promise<CustomerAccount[]> {
    const { data, error } = await supabase.rpc('admin_customers');
    if (error) fail(error);
    return (data as Row[]).map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone ?? undefined,
      createdAt: row.created_at,
      emailConfirmedAt: row.email_confirmed_at ?? undefined,
      lastSignInAt: row.last_sign_in_at ?? undefined,
      orderCount: Number(row.order_count),
      totalSpent: Number(row.total_spent),
      lastOrderAt: row.last_order_at ?? undefined,
    }));
  }

  // ----- Coupons -----

  /** Checkout preview of a code; place_order checks it again (including one use per customer). */
  public static async checkCoupon(code: string, subtotal: number): Promise<CouponQuote> {
    const { data, error } = await supabase.rpc('check_coupon', { p_code: code, p_subtotal: Math.round(subtotal) });
    if (error) fail(error);
    if (!data.valid) return { valid: false, reason: data.reason, minOrderAmount: data.minOrderAmount ?? undefined };
    return {
      valid: true,
      discount: data.discount,
      coupon: {
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount,
        freeShipping: data.freeShipping,
      },
    };
  }

  public static async fetchCoupons(): Promise<CouponItem[]> {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) fail(error);
    return data.map(couponFromRow);
  }

  public static subscribeToCoupons(onData: (coupons: CouponItem[]) => void, onError: (message: string) => void): () => void {
    return liveQuery(['coupons'], () => this.fetchCoupons(), onData, onError);
  }

  /** Creates a code, or replaces the rule of an existing one (its usage count stays). */
  public static async saveCoupon(coupon: Omit<CouponItem, 'usageCount' | 'createdAt'>): Promise<void> {
    expectChanged(
      await supabase
        .from('coupons')
        .upsert({
          code: coupon.code.trim().toUpperCase(),
          discount_type: coupon.discountType,
          discount_value: coupon.discountValue,
          min_order_amount: coupon.minOrderAmount,
          start_date: coupon.startDate ?? null,
          end_date: coupon.endDate ?? null,
          usage_limit: coupon.usageLimit ?? null,
          one_use_per_customer: coupon.oneUsePerCustomer,
          free_shipping: coupon.freeShipping,
          active: coupon.active,
        })
        .select('code')
    );
  }

  public static async setCouponActive(code: string, active: boolean): Promise<void> {
    expectChanged(await supabase.from('coupons').update({ active }).eq('code', code).select('code'));
  }

  public static async deleteCoupon(code: string): Promise<void> {
    expectChanged(await supabase.from('coupons').delete().eq('code', code).select('code'));
  }

  // ----- Reviews -----

  public static subscribeToPublishedReviews(onData: (reviews: Review[]) => void, onError: (message: string) => void): () => void {
    return liveQuery(
      ['reviews'],
      async () => {
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false });
        if (error) fail(error);
        return data.map(reviewFromRow);
      },
      onData,
      onError
    );
  }

  public static subscribeToAllReviews(onData: (reviews: Review[]) => void, onError: (message: string) => void): () => void {
    return liveQuery(
      ['reviews'],
      async () => {
        const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
        if (error) fail(error);
        return data.map(reviewFromRow);
      },
      onData,
      onError
    );
  }

  /** Customer review: saved hidden until the Content team publishes it. */
  public static async submitReview(input: {
    productId: string;
    authorName: string;
    rating: number;
    comment: string;
    size: string;
    location: string;
    fitVote: Review['fitVote'];
  }): Promise<string> {
    const { data, error } = await supabase.rpc('submit_review', {
      p_product_id: input.productId,
      p_author_name: input.authorName,
      p_rating: input.rating,
      p_comment: input.comment,
      p_size: input.size,
      p_location: input.location,
      p_fit_vote: input.fitVote,
    });
    if (error) fail(error);
    return data as string;
  }

  public static async setReviewPublished(id: string, published: boolean): Promise<void> {
    expectChanged(await supabase.from('reviews').update({ published }).eq('id', id).select('id'));
  }

  public static async deleteReview(id: string): Promise<void> {
    expectChanged(await supabase.from('reviews').delete().eq('id', id).select('id'));
  }

  // ----- B2B -----

  public static async submitB2BLead(lead: Omit<B2BQuoteRequest, 'id' | 'createdAt' | 'status' | 'notes'>): Promise<string> {
    const { companyName, contactPerson, email, phone, estimatedQuantity, ...details } = lead;
    const { data, error } = await supabase.rpc('submit_b2b_lead', {
      p_company_name: companyName,
      p_contact_person: contactPerson,
      p_email: email,
      p_phone: phone,
      p_estimated_quantity: estimatedQuantity,
      p_details: details,
    });
    if (error) fail(error);
    return data as string;
  }

  public static subscribeToB2BLeads(onData: (leads: B2BQuoteRequest[]) => void, onError: (message: string) => void): () => void {
    return liveQuery(
      ['b2b_leads'],
      async () => {
        const { data, error } = await supabase.from('b2b_leads').select('*').order('created_at', { ascending: false });
        if (error) fail(error);
        return data.map(leadFromRow);
      },
      onData,
      onError
    );
  }

  public static async updateB2BLead(id: string, patch: { status: NonNullable<B2BQuoteRequest['status']>; notes: string }): Promise<void> {
    expectChanged(await supabase.from('b2b_leads').update({ status: patch.status, notes: patch.notes }).eq('id', id).select('id'));
  }

  // ----- Staff -----

  public static async fetchStaff(): Promise<StaffMember[]> {
    const { data, error } = await supabase.from('staff').select('*').order('created_at');
    if (error) fail(error);
    return data.map((row) => ({ email: row.email, role: row.role, addedBy: row.added_by, createdAt: row.created_at }));
  }

  public static subscribeToStaff(onData: (staff: StaffMember[]) => void, onError: (message: string) => void): () => void {
    return liveQuery(['staff'], () => this.fetchStaff(), onData, onError);
  }

  public static async addStaff(email: string, role: StaffRole, addedBy: string): Promise<void> {
    expectChanged(await supabase.from('staff').insert({ email: email.trim().toLowerCase(), role, added_by: addedBy }).select('email'));
  }

  public static async updateStaffRole(email: string, role: StaffRole): Promise<void> {
    expectChanged(await supabase.from('staff').update({ role }).eq('email', email).select('email'));
  }

  public static async removeStaff(email: string): Promise<void> {
    expectChanged(await supabase.from('staff').delete().eq('email', email).select('email'));
  }

  // ----- Audit trail -----

  public static async fetchAuditLogs(limit = 200): Promise<AuditLogRecord[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) fail(error);
    return data.map((row) => ({
      id: row.id,
      actor: row.actor,
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id,
      details: row.details,
      createdAt: row.created_at,
    }));
  }
}
