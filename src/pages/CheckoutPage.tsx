import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, ArrowRight, ArrowLeft, ShoppingBag, Check, Sparkles, MessageCircle, Banknote } from 'lucide-react';
import { Cart, Customer } from '../types';
import { CartService, couponApplies } from '../services/cartService';
import { OrderService } from '../services/orderService';
import { AuthService } from '../services/authService';
import { TrackingService } from '../services/trackingService';
import { StoreSettingsService, GovernorateConfig } from '../services/storeSettingsService';
import { DataService } from '../services/dataService';
import { useToast } from '../components/Toast';
import { SEOHead } from '../components/SEOHead';
import { useLanguage } from '../context/LanguageContext';
import { normalizeImagePath } from '../utils/imageUtils';
import { normalizeEgyptMobile } from '../utils/phone';
import { errorMessage } from '../lib/supabase';
import { couponReasonText } from '../utils/couponText';

export { normalizeEgyptMobile } from '../utils/phone';

interface CheckoutPageProps {
  onContinueShopping: () => void;
  onOpenAuth: () => void;
}

type Step = 1 | 2;
type Field = 'phone' | 'email' | 'fullName' | 'governorate' | 'city' | 'streetAddress';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Same limits as place_order in the database. */
const MAX_LINES = 8;
const MAX_PIECES = 20;

const FIELD_FOR_CODE: Record<string, Field> = {
  INVALID_PHONE: 'phone',
  INVALID_EMAIL: 'email',
  INVALID_NAME: 'fullName',
  INVALID_GOVERNORATE: 'governorate',
  INVALID_ADDRESS: 'streetAddress',
};

/** Every order is cash on delivery: the database checks prices, stock and the coupon again. */
export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onContinueShopping, onOpenAuth }) => {
  const { isArabic, formatPrice, formatNumber, lang } = useLanguage();
  const L = (en: string, ar: string) => (isArabic ? ar : en);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const settings = StoreSettingsService.getSettingsSync();

  const [cart, setCart] = useState<Cart>(() => CartService.getCart());
  const [user, setUser] = useState<Customer | null>(() => AuthService.getCurrentUser());
  const [step, setStep] = useState<Step>(1);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorateId, setGovernorateId] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [floorApartment, setFloorApartment] = useState('');
  const [nearestLandmark, setNearestLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [codeInput, setCodeInput] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const gov = settings.governorates.find((g) => g.id === governorateId);
  const couponOn = couponApplies(cart.coupon, cart.subtotal);
  const freeDelivery = cart.subtotal >= cart.freeShippingThreshold || (couponApplies(cart.coupon, cart.subtotal) && cart.coupon.freeShipping);
  const deliveryKnown = Boolean(gov) || freeDelivery;
  const hasPreorder = cart.items.some((i) => i.isPreorder);
  const pieces = cart.items.reduce((s, i) => s + i.quantity, 0);
  const tooBig = cart.items.length > MAX_LINES || cart.items.some((i) => i.quantity > MAX_PIECES);

  const govName = (g: GovernorateConfig) => (isArabic ? g.nameArabic : g.name);
  const govDays = (g: GovernorateConfig) => (isArabic ? g.deliveryDaysArabic : g.deliveryDays);
  const itemName = (i: Cart['items'][number]) => (isArabic ? i.productNameAr || i.productName : i.productName);

  // Fill empty fields from the signed-in account; its last delivery address comes first.
  const prefill = (account: Customer) => {
    const saved = account.addresses[0];
    const keep = (set: React.Dispatch<React.SetStateAction<string>>, value: string | undefined) => {
      if (value) set((current) => current || value);
    };
    keep(setEmail, account.email);
    keep(setFullName, saved ? saved.fullName : account.fullName);
    keep(setPhone, saved ? saved.phone : account.phone);
    if (saved) {
      keep(setGovernorateId, saved.governorateId);
      keep(setCity, saved.city);
      keep(setDistrict, saved.district);
      keep(setStreetAddress, saved.streetAddress);
      keep(setBuildingNumber, saved.buildingNumber);
      keep(setFloorApartment, saved.floorApartment);
      keep(setNearestLandmark, saved.nearestLandmark);
    }
  };

  useEffect(() => {
    const current = AuthService.getCurrentUser();
    if (current) prefill(current);
    if (cart.items.length > 0) TrackingService.trackInitiateCheckout(cart);

    const onAuth = () => {
      const next = AuthService.getCurrentUser();
      setUser(next);
      if (next) prefill(next);
    };
    const onCart = () => setCart(CartService.getCart());
    window.addEventListener('rootland_auth_updated', onAuth);
    window.addEventListener('kemet_cart_updated', onCart);
    return () => {
      window.removeEventListener('rootland_auth_updated', onAuth);
      window.removeEventListener('kemet_cart_updated', onCart);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The bag carries the chosen governorate's fee; none is charged until one is chosen.
  useEffect(() => {
    setCart(CartService.setShippingFee(gov ? gov.fee : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [governorateId]);

  const couponReason = (reason: string, minOrderAmount?: number) => couponReasonText(reason, minOrderAmount, isArabic, formatPrice);

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setCodeLoading(true);
    setCodeError(null);
    try {
      const result = await CartService.applyCoupon(codeInput);
      if (result.success) {
        setCart(result.cart);
        setCodeInput('');
        showToast(L('Code applied', 'تم تطبيق الكود'), result.cart.discountCode, 'success');
      } else {
        setCodeError(couponReason(result.reason, result.minOrderAmount));
      }
    } catch (err) {
      console.error('[CheckoutPage] coupon check failed:', errorMessage(err));
      setCodeError(L('We could not check the code. Try again.', 'تعذر التحقق من الكود. حاول مرة أخرى.'));
    } finally {
      setCodeLoading(false);
    }
  };

  const handleRemoveCode = () => {
    setCart(CartService.removeCoupon());
    setCodeError(null);
  };

  const validate = (): boolean => {
    const next: Partial<Record<Field, string>> = {};
    if (!normalizeEgyptMobile(phone)) {
      next.phone = L('Enter a valid Egyptian mobile, e.g. 01012345678.', 'اكتب رقم موبايل مصري صحيح، مثال: 01012345678.');
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) next.email = L('This email address is not valid.', 'البريد الإلكتروني غير صحيح.');
    if (!fullName.trim()) next.fullName = L('Enter the recipient name.', 'اكتب اسم المستلم.');
    if (!gov) next.governorate = L('Choose your governorate.', 'اختر المحافظة.');
    if (!city.trim()) next.city = L('Enter your city or area.', 'اكتب المدينة أو المنطقة.');
    if (!streetAddress.trim()) next.streetAddress = L('Enter the street address.', 'اكتب عنوان الشارع.');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast(L('Check your details', 'راجع البيانات'), L('Some fields need your attention.', 'بعض الحقول تحتاج إلى تصحيح.'), 'error');
      return;
    }
    setOrderError(null);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const itemLabel = (label: string) => {
    const item = cart.items.find((i) => `${i.productName} ${i.size}` === label);
    return item ? `${itemName(item)} (${item.size})` : label;
  };

  /** After TOTAL_CHANGED: reload prices, fees and the coupon so the summary matches what the database charges. */
  const refreshTotals = async () => {
    const [products] = await Promise.all([DataService.fetchProducts(), StoreSettingsService.getSettings()]);
    CartService.syncPrices(products);
    const current = CartService.getCart();
    if (current.coupon) {
      const result = await CartService.applyCoupon(current.coupon.code);
      if (!result.success) CartService.removeCoupon();
    }
    const fresh = StoreSettingsService.getSettingsSync().governorates.find((g) => g.id === governorateId);
    setCart(CartService.setShippingFee(fresh ? fresh.fee : 0));
  };

  const describeOrderError = (message: string): string => {
    const [code, ...rest] = message.split(':');
    const detail = itemLabel(rest.join(':'));
    switch (code) {
      case 'OUT_OF_STOCK':
        return L(
          `Sorry, ${detail} just sold out. Remove it from your bag, or pre-order it from the product page.`,
          `عذراً، نفدت كمية ${detail} للتو. احذفه من الحقيبة أو اطلبه مسبقاً من صفحة المنتج.`
        );
      case 'BACK_IN_STOCK':
        return L(
          `${detail} is back in stock. Remove the pre-order line and add it again from the product page.`,
          `${detail} متوفر الآن. احذف سطر الطلب المسبق وأضفه مرة أخرى من صفحة المنتج.`
        );
      case 'PREORDER_CLOSED':
        return L(`Pre-orders are closed right now. Remove ${detail} from your bag.`, `الطلب المسبق متوقف حالياً. احذف ${detail} من الحقيبة.`);
      case 'PREORDER_LIMIT':
        return L(`Pre-orders for ${detail} are full. Lower the quantity or remove it.`, `اكتملت الطلبات المسبقة لـ ${detail}. قلّل الكمية أو احذفه.`);
      case 'STOCK_RECORD_MISSING':
      case 'PRODUCT_UNAVAILABLE':
        return L('An item in your bag is no longer sold. Remove it and try again.', 'أحد المنتجات في حقيبتك لم يعد متاحاً. احذفه وحاول مرة أخرى.');
      case 'INVALID_ITEMS':
      case 'INVALID_QUANTITY':
        return L(
          `An order can hold up to ${MAX_LINES} different items and ${MAX_PIECES} pieces of each.`,
          `الطلب الواحد يتسع حتى ${MAX_LINES} منتجات مختلفة و${MAX_PIECES} قطعة من كل منتج.`
        );
      case 'INVALID_PHONE':
        return L('The mobile number is not valid.', 'رقم الموبايل غير صحيح.');
      case 'INVALID_EMAIL':
        return L('The email address is not valid.', 'البريد الإلكتروني غير صحيح.');
      case 'INVALID_NAME':
        return L('Enter the recipient name (up to 120 characters).', 'اكتب اسم المستلم (حتى 120 حرفاً).');
      case 'INVALID_ADDRESS':
        return L('Enter the city and street address.', 'اكتب المدينة وعنوان الشارع.');
      case 'INVALID_GOVERNORATE':
        return L('Choose your governorate again.', 'اختر المحافظة مرة أخرى.');
      case 'INVALID_NOTES':
        return L('Keep the delivery notes under 1000 characters.', 'اجعل ملاحظات التوصيل أقل من 1000 حرف.');
      case 'TOO_MANY_ORDERS':
        return L(
          'This mobile number placed several orders in the last hour. Please try again later, or message us on WhatsApp.',
          'تم تسجيل عدة طلبات بهذا الرقم خلال الساعة الأخيرة. حاول لاحقاً أو راسلنا على واتساب.'
        );
      default:
        return L(
          'We could not place your order. Check your connection and try again, or order on WhatsApp.',
          'تعذر تسجيل طلبك. تأكد من الاتصال وحاول مرة أخرى، أو اطلب عبر واتساب.'
        );
    }
  };

  const handleOrderError = async (message: string) => {
    const code = message.split(':')[0];
    if (code === 'TOTAL_CHANGED') {
      try {
        await refreshTotals();
        setOrderError(
          L(
            'A price or delivery fee changed while you were checking out. Your bag is updated: check the new total and place the order again.',
            'تغيّر سعر أو رسوم توصيل أثناء إتمام الطلب. تم تحديث حقيبتك: راجع الإجمالي الجديد ثم أكّد الطلب مرة أخرى.'
          )
        );
      } catch (err) {
        console.error('[CheckoutPage] totals could not be refreshed:', errorMessage(err));
        setOrderError(L('Prices changed and could not be reloaded. Reload the page and try again.', 'تغيّرت الأسعار وتعذر تحديثها. أعد تحميل الصفحة وحاول مرة أخرى.'));
      }
      return;
    }
    if (code.startsWith('COUPON_')) {
      setCart(CartService.removeCoupon());
      setOrderError(
        `${couponReason(code.slice('COUPON_'.length), cart.coupon?.minOrderAmount)} ${L(
          'The code was removed: check the new total and place the order again.',
          'تمت إزالة الكود: راجع الإجمالي الجديد ثم أكّد الطلب مرة أخرى.'
        )}`
      );
      return;
    }
    const text = describeOrderError(message);
    const field = FIELD_FOR_CODE[code];
    if (field) {
      setErrors({ [field]: text });
      setStep(1);
    }
    setOrderError(text);
  };

  const handlePlaceOrder = async () => {
    if (!gov) {
      setStep(1);
      validate();
      return;
    }
    setPlacing(true);
    setOrderError(null);
    try {
      const items = cart.items.map((i) => {
        if (!i.variantId) throw new Error(`STOCK_RECORD_MISSING:${i.id}`);
        return { variantId: i.variantId, quantity: i.quantity, isPreorder: i.isPreorder === true };
      });
      const order = await OrderService.placeOrder({
        items,
        address: {
          fullName: fullName.trim(),
          phone: normalizeEgyptMobile(phone) as string,
          governorate: gov.id,
          city: city.trim(),
          district: district.trim(),
          streetAddress: streetAddress.trim(),
          buildingNumber: buildingNumber.trim(),
          floorApartment: floorApartment.trim(),
          nearestLandmark: nearestLandmark.trim(),
        },
        email: email.trim().toLowerCase(),
        notes: notes.trim(),
        couponCode: couponApplies(cart.coupon, cart.subtotal) ? cart.coupon.code : '',
        language: lang,
        expectedTotal: cart.total,
      });

      CartService.clearCart();
      TrackingService.trackPurchase(order);
      if (user) {
        AuthService.saveDeliveryAddress(order.shippingAddress).catch((err) => {
          console.error('[CheckoutPage] delivery address could not be saved:', errorMessage(err));
          showToast(
            L('Address not saved', 'لم يتم حفظ العنوان'),
            L('Your order is placed, but this address could not be saved to your account.', 'تم تسجيل طلبك، لكن تعذر حفظ هذا العنوان في حسابك.'),
            'error'
          );
        });
      }
      showToast(L('Order placed', 'تم تسجيل طلبك'), order.orderNumber, 'success');
      navigate(`/order-confirmation/${order.orderNumber}`);
    } catch (err) {
      const message = errorMessage(err);
      console.error('[CheckoutPage] order failed:', message);
      await handleOrderError(message);
      setPlacing(false);
    }
  };

  const inputClass = (field?: Field) =>
    `w-full bg-bg-2 border p-2.5 text-sm text-fg focus:outline-none focus:border-fg ${field && errors[field] ? 'border-err' : 'border-line'}`;
  const labelClass = 'block text-sm text-mut mb-1';
  const FieldError = ({ field }: { field: Field }) =>
    errors[field] ? (
      <p id={`checkout-${field}-error`} className="text-xs text-err mt-1">
        {errors[field]}
      </p>
    ) : null;

  const whatsappText = encodeURIComponent(
    isArabic
      ? `مرحباً روت لاند، أريد الطلب:\n${cart.items.map((i) => `${i.quantity} × ${itemName(i)} - ${i.size}`).join('\n')}`
      : `Hello RootLand, I'd like to order:\n${cart.items.map((i) => `${i.quantity} × ${i.productName} - ${i.size}`).join('\n')}`
  );
  const whatsappLink = `https://wa.me/${settings.whatsappNumber}?text=${whatsappText}`;

  return (
    <div className="gutter pb-[clamp(60px,10vh,110px)] text-fg">
      <SEOHead
        title={L('Checkout', 'إتمام الطلب')}
        description={L(
          'Complete your RootLand order. Cash on delivery to all 27 governorates of Egypt.',
          'أكمل طلبك من روت لاند. الدفع عند الاستلام والتوصيل لجميع محافظات مصر الـ 27.'
        )}
      />

      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <h1 className="t-hero text-fg">{L('Checkout', 'إتمام الطلب')}</h1>
        {cart.items.length > 0 && <span className="t-counter text-mut">0{step} / 02</span>}
      </header>

      {cart.items.length === 0 ? (
        <div className="max-w-md py-10 space-y-5">
          <ShoppingBag className="w-10 h-10 text-mut" aria-hidden="true" />
          <h2 className="font-display text-2xl font-semibold text-fg">{L('Your bag is empty', 'حقيبة التسوق فارغة')}</h2>
          <p className="text-body">{L('Choose your RootLand hoodie before checkout.', 'اختر هودي روت لاند قبل إتمام الطلب.')}</p>
          <button type="button" onClick={onContinueShopping} className="pill pill--solid">
            {L('Shop hoodies', 'تسوق الهوديز')}
          </button>
        </div>
      ) : (
        <>
          {/* Progress */}
          <ol className="flex items-center gap-4 mb-12 max-w-md">
            {[
              { n: 1 as Step, label: L('Delivery details', 'بيانات التوصيل') },
              { n: 2 as Step, label: L('Review and place', 'المراجعة والتأكيد') },
            ].map((s, idx) => (
              <li key={s.n} className="flex items-center gap-3 flex-1">
                <span
                  className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold tabular-nums ${
                    step >= s.n ? 'bg-fg text-bg' : 'bg-line text-mut'
                  }`}
                  aria-hidden="true"
                >
                  {step > s.n ? <Check className="w-4 h-4" /> : `0${s.n}`}
                </span>
                <span className={`text-sm ${step === s.n ? 'text-fg font-semibold' : 'text-mut'}`} aria-current={step === s.n ? 'step' : undefined}>
                  {s.label}
                </span>
                {idx === 0 && <span className="flex-1 h-px bg-line" aria-hidden="true" />}
              </li>
            ))}
          </ol>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7 space-y-8">
              {/* Step 1: contact and address */}
              {step === 1 && (
                <form onSubmit={handleContinue} className="space-y-8" noValidate>
                  <div className="text-sm text-body border border-line p-4">
                    {user ? (
                      <p>{L(`Signed in as ${user.email}. This order will appear in your account.`, `مسجّل الدخول باسم ${user.email}. سيظهر هذا الطلب في حسابك.`)}</p>
                    ) : (
                      <p>
                        {L('Have an account? ', 'لديك حساب؟ ')}
                        <button type="button" onClick={onOpenAuth} className="underline font-semibold text-fg cursor-pointer">
                          {L('Sign in', 'سجّل الدخول')}
                        </button>
                        {L(' to fill in your details and follow this order from your account. Or continue as a guest.', ' لملء بياناتك ومتابعة هذا الطلب من حسابك، أو أكمل كزائر.')}
                      </p>
                    )}
                  </div>

                  <section className="space-y-4">
                    <h2 className="font-display text-xl font-semibold text-fg">{L('Contact details', 'بيانات التواصل')}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="checkout-phone" className={labelClass}>
                          {L('Mobile number *', 'رقم الموبايل *')}
                        </label>
                        <input
                          id="checkout-phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          dir="ltr"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="01012345678"
                          aria-invalid={Boolean(errors.phone)}
                          aria-describedby={errors.phone ? 'checkout-phone-error' : undefined}
                          className={`${inputClass('phone')} font-mono`}
                        />
                        <FieldError field="phone" />
                      </div>
                      <div>
                        <label htmlFor="checkout-email" className={labelClass}>
                          {L('Email (optional)', 'البريد الإلكتروني (اختياري)')}
                        </label>
                        <input
                          id="checkout-email"
                          type="email"
                          autoComplete="email"
                          dir="ltr"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          aria-invalid={Boolean(errors.email)}
                          aria-describedby={errors.email ? 'checkout-email-error' : undefined}
                          className={inputClass('email')}
                        />
                        <FieldError field="email" />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 pt-6 border-t border-line">
                    <h2 className="font-display text-xl font-semibold text-fg">{L('Delivery address', 'عنوان التوصيل')}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="checkout-name" className={labelClass}>
                          {L('Recipient name *', 'اسم المستلم *')}
                        </label>
                        <input
                          id="checkout-name"
                          type="text"
                          autoComplete="name"
                          maxLength={120}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          aria-invalid={Boolean(errors.fullName)}
                          aria-describedby={errors.fullName ? 'checkout-fullName-error' : undefined}
                          className={inputClass('fullName')}
                        />
                        <FieldError field="fullName" />
                      </div>
                      <div>
                        <label htmlFor="checkout-governorate" className={labelClass}>
                          {L('Governorate *', 'المحافظة *')}
                        </label>
                        <select
                          id="checkout-governorate"
                          value={gov ? gov.id : ''}
                          onChange={(e) => setGovernorateId(e.target.value)}
                          aria-invalid={Boolean(errors.governorate)}
                          aria-describedby={errors.governorate ? 'checkout-governorate-error' : undefined}
                          className={`${inputClass('governorate')} cursor-pointer`}
                        >
                          <option value="" disabled>
                            {L('Choose governorate', 'اختر المحافظة')}
                          </option>
                          {settings.governorates.map((g) => (
                            <option key={g.id} value={g.id}>
                              {govName(g)} · {freeDelivery ? L('Free delivery', 'توصيل مجاني') : formatPrice(g.fee)}
                            </option>
                          ))}
                        </select>
                        <FieldError field="governorate" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="checkout-city" className={labelClass}>
                          {L('City / area *', 'المدينة / المنطقة *')}
                        </label>
                        <input
                          id="checkout-city"
                          type="text"
                          autoComplete="address-level2"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder={L('e.g. New Cairo, Zamalek, Smouha', 'مثال: التجمع الخامس، الزمالك، سموحة')}
                          aria-invalid={Boolean(errors.city)}
                          aria-describedby={errors.city ? 'checkout-city-error' : undefined}
                          className={inputClass('city')}
                        />
                        <FieldError field="city" />
                      </div>
                      <div>
                        <label htmlFor="checkout-district" className={labelClass}>
                          {L('District (optional)', 'الحي (اختياري)')}
                        </label>
                        <input
                          id="checkout-district"
                          type="text"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className={inputClass()}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="checkout-street" className={labelClass}>
                        {L('Street address *', 'الشارع والعنوان *')}
                      </label>
                      <input
                        id="checkout-street"
                        type="text"
                        autoComplete="address-line1"
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        placeholder={L('e.g. 14 Brazil St.', 'مثال: 14 شارع البرازيل')}
                        aria-invalid={Boolean(errors.streetAddress)}
                        aria-describedby={errors.streetAddress ? 'checkout-streetAddress-error' : undefined}
                        className={inputClass('streetAddress')}
                      />
                      <FieldError field="streetAddress" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="checkout-building" className={labelClass}>
                          {L('Building no.', 'رقم العمارة')}
                        </label>
                        <input id="checkout-building" type="text" value={buildingNumber} onChange={(e) => setBuildingNumber(e.target.value)} className={inputClass()} />
                      </div>
                      <div>
                        <label htmlFor="checkout-floor" className={labelClass}>
                          {L('Floor / apt.', 'الدور / الشقة')}
                        </label>
                        <input id="checkout-floor" type="text" value={floorApartment} onChange={(e) => setFloorApartment(e.target.value)} className={inputClass()} />
                      </div>
                      <div>
                        <label htmlFor="checkout-landmark" className={labelClass}>
                          {L('Nearest landmark', 'أقرب علامة مميزة')}
                        </label>
                        <input id="checkout-landmark" type="text" value={nearestLandmark} onChange={(e) => setNearestLandmark(e.target.value)} className={inputClass()} />
                      </div>
                    </div>
                  </section>

                  <button type="submit" className="pill pill--solid w-full">
                    <span>{L('Review order', 'مراجعة الطلب')}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                  </button>
                </form>
              )}

              {/* Step 2: review and place */}
              {step === 2 && gov && (
                <div className="space-y-8">
                  <section className="space-y-4">
                    <h2 className="font-display text-xl font-semibold text-fg">{L('Review your order', 'راجع طلبك')}</h2>
                    <dl className="border-t border-line text-sm">
                      <div className="flex justify-between gap-6 py-3 border-b border-line">
                        <dt className="text-mut">{L('Recipient', 'المستلم')}</dt>
                        <dd className="text-fg text-end">
                          {fullName.trim()} · <span dir="ltr">{normalizeEgyptMobile(phone)}</span>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-6 py-3 border-b border-line">
                        <dt className="text-mut">{L('Address', 'العنوان')}</dt>
                        <dd className="text-fg text-end">
                          {[streetAddress, buildingNumber, floorApartment].map((s) => s.trim()).filter(Boolean).join(L(', ', '، '))}
                          <br />
                          {[district, city, govName(gov)].map((s) => s.trim()).filter(Boolean).join(L(', ', '، '))}
                          {nearestLandmark.trim() && (
                            <>
                              <br />
                              <span className="text-mut">
                                {L('Landmark:', 'علامة مميزة:')} {nearestLandmark.trim()}
                              </span>
                            </>
                          )}
                        </dd>
                      </div>
                      {govDays(gov) && (
                        <div className="flex justify-between gap-6 py-3 border-b border-line">
                          <dt className="text-mut">{L('Delivery time', 'مدة التوصيل')}</dt>
                          <dd className="text-fg text-end">{govDays(gov)}</dd>
                        </div>
                      )}
                      {email.trim() && (
                        <div className="flex justify-between gap-6 py-3 border-b border-line">
                          <dt className="text-mut">{L('Email', 'البريد الإلكتروني')}</dt>
                          <dd className="text-fg text-end" dir="ltr">
                            {email.trim().toLowerCase()}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <button type="button" onClick={() => setStep(1)} className="text-sm text-mut hover:text-fg underline cursor-pointer">
                      {L('Edit details', 'تعديل البيانات')}
                    </button>
                  </section>

                  <section className="space-y-3 border border-line p-5">
                    <h2 className="font-display text-xl font-semibold text-fg flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-ok" aria-hidden="true" />
                      <span>{L('Cash on delivery', 'الدفع عند الاستلام')}</span>
                    </h2>
                    <p className="text-sm text-body">
                      {L(
                        `Nothing to pay now. Pay ${formatPrice(cart.total)} in cash to the courier when your order arrives.`,
                        `لا شيء تدفعه الآن. ادفع ${formatPrice(cart.total)} نقداً للمندوب عند وصول طلبك.`
                      )}
                    </p>
                    {hasPreorder && <p className="text-sm text-fg">{L(settings.preorderNoteEn, settings.preorderNoteAr)}</p>}
                  </section>

                  <div>
                    <label htmlFor="checkout-notes" className={labelClass}>
                      {L('Delivery notes (optional)', 'ملاحظات للمندوب (اختياري)')}
                    </label>
                    <textarea
                      id="checkout-notes"
                      rows={2}
                      maxLength={1000}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={L('e.g. Call before arriving', 'مثال: اتصل قبل الوصول')}
                      className={inputClass()}
                    />
                  </div>

                  {tooBig && (
                    <p role="alert" className="p-3 border border-err/50 bg-err/10 text-sm text-err">
                      {L(
                        `An order can hold up to ${MAX_LINES} different items and ${MAX_PIECES} pieces of each. Adjust your bag, or place two orders.`,
                        `الطلب الواحد يتسع حتى ${MAX_LINES} منتجات مختلفة و${MAX_PIECES} قطعة من كل منتج. عدّل حقيبتك أو قسّمها على طلبين.`
                      )}
                    </p>
                  )}

                  {orderError && (
                    <div role="alert" className="p-3 border border-err/50 bg-err/10 text-sm text-err space-y-2">
                      <p>{orderError}</p>
                      <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
                        <MessageCircle className="w-4 h-4" aria-hidden="true" />
                        {L('Order on WhatsApp', 'اطلب عبر واتساب')}
                      </a>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-line">
                    <button type="button" onClick={() => setStep(1)} className="pill pill--sm">
                      <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                      <span>{L('Back', 'رجوع')}</span>
                    </button>
                    <button type="button" disabled={placing || tooBig} onClick={handlePlaceOrder} className="pill pill--solid">
                      <span>{placing ? L('Placing order…', 'جاري تسجيل الطلب…') : L('Place order', 'تأكيد الطلب')}</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <aside data-surface="night" className="lg:col-span-5 lg:sticky lg:top-28 p-6 sm:p-8 space-y-5">
              <h2 className="font-display text-xl font-semibold text-fg pb-3 border-b border-line">
                {L('Order summary', 'ملخص الطلب')} <span className="t-counter text-mut">({formatNumber(pieces)})</span>
              </h2>

              <ul className="divide-y divide-line max-h-72 overflow-y-auto pe-1" data-lenis-prevent>
                {cart.items.map((it) => (
                  <li key={it.id} className="py-3 flex gap-3 text-sm">
                    <div className="w-12 h-14 bg-bg-2 shrink-0 overflow-hidden">
                      <img src={normalizeImagePath(it.image)} alt={itemName(it)} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between gap-1">
                      <div>
                        <h3 className="font-semibold text-fg">{itemName(it)}</h3>
                        <p className="text-xs text-mut">
                          {isArabic ? it.colorNameAr || it.colorName : it.colorName} · {L('Size', 'المقاس')} {it.size} · {L('Qty', 'الكمية')}{' '}
                          {formatNumber(it.quantity)}
                          {it.isPreorder ? ` · ${L('Pre-order', 'طلب مسبق')}` : ''}
                        </p>
                      </div>
                      <span className="t-counter text-fg">{formatPrice(it.unitPrice * it.quantity)}</span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Discount code */}
              <div className="pt-4 border-t border-line">
                {cart.coupon ? (
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="flex items-center gap-1.5 font-mono text-fg">
                        <Sparkles className="w-4 h-4 text-ok" aria-hidden="true" />
                        <span>{cart.coupon.code}</span>
                      </p>
                      {!couponOn && <p className="text-xs text-mut mt-1">{couponReason('MIN_ORDER', cart.coupon.minOrderAmount)}</p>}
                    </div>
                    <button type="button" onClick={handleRemoveCode} className="text-xs text-mut hover:text-fg underline cursor-pointer">
                      {L('Remove', 'إزالة')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCode} className="space-y-1.5">
                    <label htmlFor="checkout-code" className={labelClass}>
                      {L('Discount code', 'كود الخصم')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="checkout-code"
                        type="text"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        autoCapitalize="characters"
                        className="flex-1 min-w-0 bg-bg-2 border border-line px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-fg"
                      />
                      <button type="submit" disabled={codeLoading || !codeInput.trim()} className="pill pill--sm">
                        {codeLoading ? '…' : L('Apply', 'تطبيق')}
                      </button>
                    </div>
                    {codeError && (
                      <p role="alert" className="text-xs text-err">
                        {codeError}
                      </p>
                    )}
                  </form>
                )}
              </div>

              <dl className="pt-4 border-t border-line space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-mut">{L('Subtotal', 'المجموع الفرعي')}</dt>
                  <dd className="t-counter text-fg">{formatPrice(cart.subtotal)}</dd>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-mut">
                      {L('Discount', 'الخصم')} ({cart.discountCode})
                    </dt>
                    <dd className="t-counter text-ok">-{formatPrice(cart.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-mut">
                    {L('Delivery', 'التوصيل')}
                    {gov ? ` (${govName(gov)})` : ''}
                  </dt>
                  <dd className="text-fg">
                    {freeDelivery ? L('Free', 'مجاني') : gov ? <span className="t-counter">{formatPrice(gov.fee)}</span> : L('Choose your governorate', 'اختر المحافظة')}
                  </dd>
                </div>
                {!freeDelivery && (
                  <p className="text-xs text-mut">
                    {L(
                      `Free delivery on orders of ${formatPrice(cart.freeShippingThreshold)} or more.`,
                      `توصيل مجاني للطلبات من ${formatPrice(cart.freeShippingThreshold)} فأكثر.`
                    )}
                  </p>
                )}
                <div className="pt-3 border-t border-line flex justify-between items-baseline gap-4">
                  <dt className="font-semibold text-fg">{L('Total, cash on delivery', 'الإجمالي، الدفع عند الاستلام')}</dt>
                  <dd className="font-display text-2xl font-semibold text-fg tabular-nums">
                    {deliveryKnown ? formatPrice(cart.total) : `${formatPrice(cart.total)} + ${L('delivery', 'التوصيل')}`}
                  </dd>
                </div>
              </dl>

              <div className="pt-4 border-t border-line text-xs text-mut space-y-1">
                <p className="flex items-center gap-1.5 text-fg">
                  <Truck className="w-4 h-4 text-ok" aria-hidden="true" />
                  <span>{L('Delivery by Bosta', 'التوصيل عبر بوسطة')}</span>
                </p>
                {gov && govDays(gov) && (
                  <p>
                    {L(`Estimated delivery to ${gov.name}: ${gov.deliveryDays}.`, `الموعد المتوقع للتوصيل إلى ${gov.nameArabic}: ${govDays(gov)}.`)}
                  </p>
                )}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
};
