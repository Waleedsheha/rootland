import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrackedOrder } from '../types';
import { DataService } from '../services/dataService';
import { StoreSettingsService } from '../services/storeSettingsService';
import { SEOHead } from '../components/SEOHead';
import { useScrollReveals } from '../motion/reveal';
import { useLanguage } from '../context/LanguageContext';
import { normalizeEgyptMobile } from '../utils/phone';
import { normalizeImagePath } from '../utils/imageUtils';
import { orderStatusLabel, orderStep } from '../utils/orderText';
import { errorMessage } from '../lib/supabase';

/** Guest tracking: the order number plus the mobile used at checkout (the database checks both). */
export const TrackOrderPage: React.FC = () => {
  const { isArabic, formatPrice, formatNumber, formatDate } = useLanguage();
  const L = (en: string, ar: string) => (isArabic ? ar : en);
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(() => searchParams.get('order') ?? '');
  const [phone, setPhone] = useState(() => searchParams.get('phone') ?? '');
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scopeRef = useRef<HTMLDivElement>(null);
  useScrollReveals(scopeRef, [isArabic]);

  const settings = StoreSettingsService.getSettingsSync();

  const lookup = async (rawNumber: string, rawPhone: string) => {
    setError(null);
    setFound(null);
    const cleanNumber = rawNumber.trim().replace(/^#/, '').toUpperCase();
    const cleanPhone = normalizeEgyptMobile(rawPhone);
    if (!cleanNumber || !cleanPhone) {
      setError(
        L(
          'Enter your order number and the Egyptian mobile number you used at checkout.',
          'اكتب رقم الطلب ورقم الموبايل المصري الذي استخدمته عند الطلب.'
        )
      );
      return;
    }
    setLoading(true);
    try {
      const order = await DataService.trackOrder(cleanNumber, cleanPhone);
      if (order) {
        setFound(order);
      } else {
        setError(
          L(
            `No order ${cleanNumber} was found for this mobile number. Check both, or ask us on WhatsApp.`,
            `لم نجد الطلب ${cleanNumber} بهذا الرقم. راجع البيانات أو اسألنا على واتساب.`
          )
        );
      }
    } catch (err) {
      console.error('[TrackOrderPage] tracking failed:', errorMessage(err));
      setError(L('We could not reach the store. Check your connection and try again.', 'تعذر الاتصال بالمتجر. تأكد من الاتصال وحاول مرة أخرى.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const qOrder = searchParams.get('order');
    const qPhone = searchParams.get('phone');
    if (qOrder && qPhone) lookup(qOrder, qPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(orderNumber, phone);
  };

  const step = found ? orderStep(found.orderStatus) : 0;
  const closed = found ? step === 0 : false;
  const steps = [
    { title: L('Received', 'تم الاستلام'), desc: L('We have your order', 'استلمنا طلبك') },
    { title: L('Confirmed', 'مؤكد'), desc: L('We confirmed it with you', 'أكدنا الطلب معك') },
    { title: L('Preparing', 'التجهيز'), desc: L('Checked and packed', 'فحص وتغليف') },
    { title: L('With the courier', 'مع شركة الشحن'), desc: L('On the way to you', 'في الطريق إليك') },
    { title: L('Delivered', 'تم التسليم'), desc: L('Paid in cash at the door', 'الدفع نقداً عند الباب') },
  ];
  const whatsappHelp = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
    found ? L(`Hello RootLand, I have a question about order ${found.orderNumber}`, `مرحباً روت لاند، عندي سؤال عن الطلب ${found.orderNumber}`) : L('Hello RootLand, I need help tracking my order', 'مرحباً روت لاند، أحتاج مساعدة في تتبع طلبي')
  )}`;
  const fieldLabel = 'block text-sm text-mut';

  return (
    <div ref={scopeRef} className="gutter pb-[clamp(60px,10vh,110px)]">
      <SEOHead
        title={L('Track your order', 'تتبع طلبك')}
        description={L('Track your RootLand order with your order number and mobile number.', 'تتبع طلبك من روت لاند برقم الطلب ورقم الموبايل.')}
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end pb-12">
        <header>
          <h1 key={`reveal-1-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg max-w-[12ch]" data-reveal-lines>
            {L('Track your', 'تتبع')} <span className="text-accent">{L('order.', 'طلبك.')}</span>
          </h1>
          <p className="t-blurb text-body max-w-[46ch] mt-6" data-reveal>
            {L('Enter your order number and the mobile number you used at checkout.', 'اكتب رقم الطلب ورقم الموبايل الذي استخدمته عند الطلب.')}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-7" data-reveal noValidate>
          <label className="block">
            <span className={fieldLabel}>{L('Order number', 'رقم الطلب')}</span>
            <input
              type="text"
              dir="ltr"
              placeholder="RL-261026-7KQ4"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="field t-counter !text-base"
            />
          </label>
          <label className="block">
            <span className={fieldLabel}>{L('Mobile number used at checkout', 'رقم الموبايل المستخدم عند الطلب')}</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="01012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="field t-counter !text-base"
            />
          </label>
          <button type="submit" disabled={loading} className="pill pill--solid">
            {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" />}
            <span>{L('Track order', 'تتبع الطلب')}</span>
          </button>
        </form>
      </div>

      {error && (
        <div role="alert" className="border-t-2 border-err pt-5 pb-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <p className="text-body max-w-[60ch]">{error}</p>
          <a href={whatsappHelp} target="_blank" rel="noopener noreferrer" className="pill pill--sm">
            {L('Ask us on WhatsApp', 'اسألنا على واتساب')}
          </a>
        </div>
      )}

      {found && (
        <section className="border-t-2 border-fg pt-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="t-section text-fg" dir="ltr">
                {found.orderNumber}
              </h2>
              <p className="text-body mt-4">
                {L('For', 'باسم')} <span className="text-fg">{found.firstName}</span> · {found.city}, {isArabic ? found.governorateAr : found.governorate} ·{' '}
                {formatDate(found.createdAt)}
              </p>
            </div>
            <span
              className={`pill pill--sm pointer-events-none ${closed ? '!border-err !text-err' : found.orderStatus === 'delivered' ? '!border-ok !text-ok' : 'pill--solid'}`}
            >
              {orderStatusLabel(found.orderStatus, isArabic)}
            </span>
          </div>

          {!closed && (
            <ol className="mt-12 grid gap-y-6 md:grid-cols-5 md:gap-x-6">
              {steps.map((s, i) => {
                const n = i + 1;
                const passed = step >= n;
                const current = step === n;
                return (
                  <li
                    key={s.title}
                    aria-current={current ? 'step' : undefined}
                    className={`pt-4 border-t-2 ${current ? 'border-accent' : passed ? 'border-fg' : 'border-line'} ${passed ? '' : 'opacity-50'}`}
                  >
                    <span className={`t-counter ${current ? 'text-accent' : 'text-mut'}`}>{String(n).padStart(2, '0')}</span>
                    <div className="font-semibold text-fg mt-2">{s.title}</div>
                    <p className="text-sm text-body mt-1">{s.desc}</p>
                  </li>
                );
              })}
            </ol>
          )}

          {(found.courier || found.trackingNumber) && (
            <p className="mt-8 text-body">
              {found.courier && (
                <>
                  {L('Courier', 'شركة الشحن')}: <span className="text-fg">{found.courier}</span>
                </>
              )}
              {found.courier && found.trackingNumber && ' · '}
              {found.trackingNumber && (
                <>
                  {L('Tracking number', 'رقم الشحنة')}:{' '}
                  <span className="t-counter text-fg" dir="ltr">
                    {found.trackingNumber}
                  </span>
                </>
              )}
            </p>
          )}
          {found.isPreorder && found.preorderNote && <p className="mt-4 text-body text-fg">{found.preorderNote}</p>}

          <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="border-b border-line">
              {found.items.map((item, i) => (
                <div key={i} className="py-4 border-t border-line grid gap-4 grid-cols-[minmax(0,1fr)_auto] items-center">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-14 bg-bone-2 overflow-hidden shrink-0">
                      <img src={normalizeImagePath(item.image)} alt={item.productName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-fg">{isArabic ? item.productNameAr || item.productName : item.productName}</h3>
                      <p className="text-sm text-body mt-1">
                        {isArabic ? item.colorNameAr || item.colorName : item.colorName} · {L('Size', 'المقاس')} {item.size} · {L('Qty', 'الكمية')}{' '}
                        {formatNumber(item.quantity)}
                        {item.isPreorder ? ` · ${L('Pre-order', 'طلب مسبق')}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="t-counter text-fg">{formatPrice(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>
            <dl className="text-body self-start">
              <div className="flex justify-between py-2 border-b border-line">
                <dt className="text-mut">{L('Subtotal', 'المجموع الفرعي')}</dt>
                <dd className="t-counter text-fg">{formatPrice(found.subtotal)}</dd>
              </div>
              {found.discount > 0 && (
                <div className="flex justify-between py-2 border-b border-line">
                  <dt className="text-mut">{L('Discount', 'الخصم')}</dt>
                  <dd className="t-counter text-ok">-{formatPrice(found.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-line">
                <dt className="text-mut">{L('Delivery', 'التوصيل')}</dt>
                <dd className="text-fg">{found.shippingFee === 0 ? L('Free', 'مجاني') : <span className="t-counter">{formatPrice(found.shippingFee)}</span>}</dd>
              </div>
              <div className="flex justify-between items-baseline pt-4 border-t-2 border-fg mt-2">
                <dt className="font-semibold text-fg">{found.paymentStatus === 'paid' ? L('Paid', 'تم الدفع') : L('Cash on delivery', 'الدفع عند الاستلام')}</dt>
                <dd className="font-display text-[24px] font-semibold text-fg tabular-nums">{formatPrice(found.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-12 border-t border-line pt-6 flex flex-wrap items-center justify-between gap-5">
            <div>
              <h3 className="font-semibold text-fg">{L('Need to change something?', 'تحتاج تغيير شيء؟')}</h3>
              <p className="text-body mt-1">
                {L('To change the address or add a note for the courier, message us on WhatsApp.', 'لتغيير العنوان أو إضافة ملاحظة للمندوب، راسلنا على واتساب.')}
              </p>
            </div>
            <a href={whatsappHelp} target="_blank" rel="noopener noreferrer" className="pill pill--accent">
              {L('Message us on WhatsApp', 'راسلنا على واتساب')}
              <span aria-hidden="true" className="rtl:-scale-x-100">
                ↗
              </span>
            </a>
          </div>
        </section>
      )}
    </div>
  );
};
