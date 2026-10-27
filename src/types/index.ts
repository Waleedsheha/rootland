export type Currency = 'EGP';

export interface ProductVariant {
  id: string;
  sku: string;
  colorName: string;
  colorHex: string;
  colorArabicName?: string;
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  inStock: boolean;
  stockCount: number;
}

export interface ProductSpecification {
  fabricWeight: string; // e.g. "Soft, Substantial Fleece"
  fabricWeightEn?: string;
  fabricWeightAr?: string;
  composition: string; // e.g. "70% Egyptian cotton, 30% polyester"
  compositionEn?: string;
  compositionAr?: string;
  weave: string; // e.g. "Plush brushed fleece interior with smooth knit surface"
  weaveEn?: string;
  weaveAr?: string;
  ribbing: string; // e.g. "Durable stretch ribbing at cuffs and hem"
  ribbingEn?: string;
  ribbingAr?: string;
  origin: string; // e.g. "Designed and crafted in Egypt"
  originEn?: string;
  originAr?: string;
  hardware?: string;
  hardwareEn?: string;
  hardwareAr?: string;
  shrinkage: string; // e.g. "Standard cold machine wash; hang dry"
  shrinkageEn?: string;
  shrinkageAr?: string;
}

export interface SizeMeasurement {
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  chestCm: number;
  lengthCm: number;
  sleeveCm: number;
  shoulderCm: number;
  chestWidthCm?: number; // Garment measurement (flat width)
  garmentLengthCm?: number; // Garment measurement (length)
  sleeveLengthCm?: number; // Garment measurement (sleeve)
  standardUkUsChest?: string; // e.g. "102–107 cm (40–42 in)"
  recommendedHeightCm: string;
  recommendedWeightKg: string;
}

export interface Review {
  id: string;
  productId: string;
  authorName: string;
  location: string; // e.g. "Zamalek, Cairo" or "New Cairo"
  rating: number; // 1-5
  title: string;
  comment: string;
  verifiedBuyer: boolean;
  sizePurchased: string;
  fitVote: 'Runs Small' | 'True to Size' | 'Runs Large';
  published: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  nameArabic: string;
  nameEn?: string;
  nameAr?: string;
  tagline: string;
  taglineEn?: string;
  taglineAr?: string;
  description: string;
  descriptionArabic?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  price: number;
  salePrice?: number;
  currency: Currency;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isLimited?: boolean;
  primaryImage: string;
  secondaryImage?: string;
  gallery: string[];
  colors: {
    name: string;
    hex: string;
    image?: string;
    nameEn?: string;
    nameAr?: string;
  }[];
  sizes: ('S' | 'M' | 'L' | 'XL' | 'XXL')[];
  variants: ProductVariant[];
  specifications: ProductSpecification;
  specificationsEn?: ProductSpecification;
  specificationsAr?: ProductSpecification;
  fitDescription: string;
  fitDescriptionEn?: string;
  fitDescriptionAr?: string;
  careInstructions: string[];
  careInstructionsEn?: string[];
  careInstructionsAr?: string[];
  measurements: SizeMeasurement[];
  rating: number;
  reviewCount: number;
  tags: string[];
  b2bAvailable: boolean;
  status?: 'active' | 'draft' | 'hidden';
  category?: string;
  fabricGsm?: string;
  seoTitle?: string;
  seoTitleEn?: string;
  seoTitleAr?: string;
  seoDescription?: string;
  seoDescriptionEn?: string;
  seoDescriptionAr?: string;
}

export interface CartItem {
  id: string; // composite key: `${productId}-${variantId}`
  productId: string;
  variantId?: string;
  productName: string;
  productSlug: string;
  image: string;
  colorName: string;
  colorHex: string;
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  unitPrice: number;
  quantity: number;
  sku: string;
  productNameAr?: string;
  colorNameAr?: string;
  isPreorder?: boolean;
  /** Pieces available when the item was added (stock, or the pre-order limit) */
  maxQuantity?: number;
}

/** A coupon accepted by the database; its rule is kept so the discount follows the bag. */
export interface AppliedCoupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  freeShipping: boolean;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  coupon?: AppliedCoupon;
  /** Discount of the applied coupon on the current subtotal (0 below its minimum order) */
  discount: number;
  discountCode?: string;
  /** Delivery fee of the chosen governorate (0 when free); 0 until one is chosen at checkout */
  shippingFee: number;
  freeShippingThreshold: number;
  total: number;
}

export interface Address {
  fullName: string;
  phone: string;
  alternatePhone?: string;
  governorate: string; // e.g., Cairo, Giza, Alexandria, Red Sea, etc.
  city: string;
  district: string;
  streetAddress: string;
  buildingNumber: string;
  floorApartment?: string;
  nearestLandmark?: string;
  isDefault?: boolean;
}

export interface Customer {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  /** Delivery addresses saved from checkout, newest first (the first one fills the next checkout) */
  addresses: OrderAddress[];
  createdAt: string;
  savedFitProfile?: FitProfile;
}

export interface OrderItem {
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  productNameAr?: string;
  colorName: string;
  colorNameAr?: string;
  size: string;
  unitPrice: number;
  quantity: number;
  image: string;
  isPreorder: boolean;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refused'
  | 'returned';

/**
 * Every order is cash on delivery.
 * cash_on_delivery – the courier collects the total at the door
 * paid             – delivered and the cash was collected
 */
export type PaymentStatus = 'cash_on_delivery' | 'paid';

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

/** Delivery address saved with an order (the governorate in English and Arabic, plus its id). */
export interface OrderAddress extends Address {
  governorateId: string;
  governorateAr: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "RL-261026-7KQ4"
  /** Account that placed the order; absent for guest checkout */
  userId?: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: OrderAddress;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode?: string;
  paymentMethod: 'cod';
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  isPreorder: boolean;
  preorderNote?: string;
  customerLanguage: 'en' | 'ar';
  notes: string;
  courier: string;
  trackingNumber: string;
  /** In-stock items were put back (cancelled or refused) */
  stockReleased: boolean;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

/** What guest tracking returns: status and items, no address or phone. */
export interface TrackedOrder {
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  firstName: string;
  governorate: string;
  governorateAr: string;
  city: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  isPreorder: boolean;
  preorderNote?: string;
  courier: string;
  trackingNumber: string;
  createdAt: string;
  timeline: { status: OrderStatus; timestamp: string }[];
  items: Omit<OrderItem, 'productId' | 'variantId' | 'sku'>[];
}

export interface CouponItem {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  usageCount: number;
  oneUsePerCustomer: boolean;
  freeShipping: boolean;
  active: boolean;
  createdAt: string;
}

export interface B2BQuoteRequest {
  id?: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  businessType: 'Restaurant / Café' | 'Hotel / Hospitality' | 'Tech Startup / Corporate' | 'School / University' | 'Event / Festival' | 'Fitness / Gym' | 'Retail / Fashion Brand' | 'Other';
  employeeCount: string;
  estimatedQuantity: number;
  productType: string;
  preferredColors: string;
  brandingTechnique: string;
  requiredDeliveryDate: string;
  additionalRequirements: string;
  hasLogoArtwork: boolean;
  logoFileName?: string;
  estimatedBudgetEgp?: number;
  status?: 'new' | 'contacted' | 'quoted' | 'sampling' | 'in_production' | 'completed';
  notes?: string;
  createdAt?: string;
}

export interface FitProfile {
  heightCm: number;
  weightKg: number;
  ageRange: '18-24' | '25-34' | '35-44' | '45+';
  bodyType: 'slim' | 'athletic' | 'average' | 'stocky';
  normalClothingSize: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  desiredFit: 'slim' | 'regular' | 'oversized';
  genderPreference: 'unisex' | 'mens' | 'womens';
  photoUploaded?: boolean;
}

export interface FitRecommendation {
  recommendedSize: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  alternativeSize?: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  confidencePercentage: number;
  fitHeadline: string;
  fitExplanation: string;
  alternativeExplanation?: string;
  measurementsComparison: {
    chestTolerance: string;
    lengthFeel: string;
    shoulderSilhouette: string;
  };
}

export interface WishlistItem {
  productId: string;
  addedAt: string;
}
