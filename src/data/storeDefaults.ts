/**
 * Starting values for the two settings rows in Supabase (`settings.store`, `settings.content`).
 * They are written once by supabase/seed.sql; after that the admin edits the rows and the app
 * reads them from the database.
 */

export interface GovernorateConfig {
  id: string;
  name: string;
  nameArabic: string;
  fee: number;
  deliveryDays: string;
  deliveryDaysArabic?: string;
}

export interface StoreSettings {
  contactPhone: string;
  whatsappNumber: string;
  contactEmail: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  /** Orders whose subtotal reaches this amount ship free */
  freeShippingThreshold: number;
  metaPixelId: string;
  tiktokPixelId: string;
  ga4MeasurementId: string;
  governorates: GovernorateConfig[];
  /** Sold-out sizes can be pre-ordered (paid on delivery like every order) */
  preorderEnabled: boolean;
  /** Open pre-order pieces allowed per size */
  preorderMaxPerVariant: number;
  preorderNoteEn: string;
  preorderNoteAr: string;
  /** Mouse-wheel and trackpad scroll step as a share of the browser's normal step (0.1–2, 1 = normal) */
  scrollSpeed: number;
}

export interface SiteContent {
  announcementEn: string;
  announcementAr: string;
  heroTitleEn: string;
  heroTitleAr: string;
  heroSubtitleEn: string;
  heroSubtitleAr: string;
  heroImage: string;
}

export const ALL_27_EGYPT_GOVERNORATES: GovernorateConfig[] = [
  { id: 'cairo', name: 'Cairo', nameArabic: 'القاهرة', fee: 65, deliveryDays: '1-2 Days', deliveryDaysArabic: '1-2 يوم' },
  { id: 'giza', name: 'Giza', nameArabic: 'الجيزة', fee: 65, deliveryDays: '1-2 Days', deliveryDaysArabic: '1-2 يوم' },
  { id: 'alexandria', name: 'Alexandria', nameArabic: 'الإسكندرية', fee: 75, deliveryDays: '2-3 Days', deliveryDaysArabic: '2-3 أيام' },
  { id: 'qalyubia', name: 'Qalyubia', nameArabic: 'القليوبية', fee: 70, deliveryDays: '2-3 Days', deliveryDaysArabic: '2-3 أيام' },
  { id: 'sharqia', name: 'Sharqia', nameArabic: 'الشرقية', fee: 75, deliveryDays: '2-3 Days', deliveryDaysArabic: '2-3 أيام' },
  { id: 'dakahlia', name: 'Dakahlia (Mansoura)', nameArabic: 'الدقهلية (المنصورة)', fee: 75, deliveryDays: '2-3 Days', deliveryDaysArabic: '2-3 أيام' },
  { id: 'gharbia', name: 'Gharbia (Tanta)', nameArabic: 'الغربية (طنطا)', fee: 75, deliveryDays: '2-3 Days', deliveryDaysArabic: '2-3 أيام' },
  { id: 'monufia', name: 'Monufia', nameArabic: 'المنوفية', fee: 75, deliveryDays: '2-3 Days', deliveryDaysArabic: '2-3 أيام' },
  { id: 'beheira', name: 'Beheira (Damanhur)', nameArabic: 'البحيرة (دمنهور)', fee: 80, deliveryDays: '2-4 Days', deliveryDaysArabic: '2-4 أيام' },
  { id: 'kafr_el_sheikh', name: 'Kafr El Sheikh', nameArabic: 'كفر الشيخ', fee: 80, deliveryDays: '2-4 Days', deliveryDaysArabic: '2-4 أيام' },
  { id: 'damietta', name: 'Damietta', nameArabic: 'دمياط', fee: 80, deliveryDays: '2-4 Days', deliveryDaysArabic: '2-4 أيام' },
  { id: 'port_said', name: 'Port Said', nameArabic: 'بورسعيد', fee: 80, deliveryDays: '2-4 Days', deliveryDaysArabic: '2-4 أيام' },
  { id: 'ismailia', name: 'Ismailia', nameArabic: 'الإسماعيلية', fee: 80, deliveryDays: '2-4 Days', deliveryDaysArabic: '2-4 أيام' },
  { id: 'suez', name: 'Suez', nameArabic: 'السويس', fee: 80, deliveryDays: '2-4 Days', deliveryDaysArabic: '2-4 أيام' },
  { id: 'faiyum', name: 'Faiyum', nameArabic: 'الفيوم', fee: 85, deliveryDays: '2-4 Days', deliveryDaysArabic: '2-4 أيام' },
  { id: 'beni_suef', name: 'Beni Suef', nameArabic: 'بني سويف', fee: 85, deliveryDays: '2-4 Days', deliveryDaysArabic: '2-4 أيام' },
  { id: 'minya', name: 'Minya', nameArabic: 'المنيا', fee: 90, deliveryDays: '3-5 Days', deliveryDaysArabic: '3-5 أيام' },
  { id: 'asyut', name: 'Asyut', nameArabic: 'أسيوط', fee: 95, deliveryDays: '3-5 Days', deliveryDaysArabic: '3-5 أيام' },
  { id: 'sohag', name: 'Sohag', nameArabic: 'سوهاج', fee: 95, deliveryDays: '3-5 Days', deliveryDaysArabic: '3-5 أيام' },
  { id: 'qena', name: 'Qena', nameArabic: 'قنا', fee: 100, deliveryDays: '3-5 Days', deliveryDaysArabic: '3-5 أيام' },
  { id: 'luxor', name: 'Luxor', nameArabic: 'الأقصر', fee: 105, deliveryDays: '3-5 Days', deliveryDaysArabic: '3-5 أيام' },
  { id: 'aswan', name: 'Aswan', nameArabic: 'أسوان', fee: 110, deliveryDays: '3-5 Days', deliveryDaysArabic: '3-5 أيام' },
  { id: 'red_sea', name: 'Red Sea (Hurghada / Gouna)', nameArabic: 'البحر الأحمر (الغردقة / الجونة)', fee: 110, deliveryDays: '3-5 Days', deliveryDaysArabic: '3-5 أيام' },
  { id: 'south_sinai', name: 'South Sinai (Sharm / Dahab)', nameArabic: 'جنوب سيناء (شرم الشيخ / دهب)', fee: 115, deliveryDays: '3-5 Days', deliveryDaysArabic: '3-5 أيام' },
  { id: 'north_sinai', name: 'North Sinai (Arish)', nameArabic: 'شمال سيناء (العريش)', fee: 120, deliveryDays: '4-6 Days', deliveryDaysArabic: '4-6 أيام' },
  { id: 'matrouh', name: 'Matrouh / North Coast', nameArabic: 'مطروح والساحل الشمالي', fee: 110, deliveryDays: '3-5 Days', deliveryDaysArabic: '3-5 أيام' },
  { id: 'new_valley', name: 'New Valley (Kharga)', nameArabic: 'الوادي الجديد (الخارجة)', fee: 130, deliveryDays: '4-6 Days', deliveryDaysArabic: '4-6 أيام' },
];

export const INITIAL_STORE_SETTINGS: StoreSettings = {
  contactPhone: '+20 111 950 9756',
  whatsappNumber: '201119509756',
  contactEmail: 'info@rootland.store',
  instagramUrl: '',
  facebookUrl: 'https://facebook.com/rootland.store',
  tiktokUrl: '',
  freeShippingThreshold: 3000,
  metaPixelId: '',
  tiktokPixelId: '',
  ga4MeasurementId: '',
  governorates: ALL_27_EGYPT_GOVERNORATES,
  preorderEnabled: true,
  preorderMaxPerVariant: 20,
  preorderNoteEn: 'Pre-order ships within 14 days.',
  preorderNoteAr: 'يتم شحن الطلب المسبق خلال 14 يوماً.',
  scrollSpeed: 0.25,
};

export const INITIAL_SITE_CONTENT: SiteContent = {
  announcementEn: '',
  announcementAr: '',
  heroTitleEn: '',
  heroTitleAr: '',
  heroSubtitleEn: '',
  heroSubtitleAr: '',
  heroImage: '',
};
