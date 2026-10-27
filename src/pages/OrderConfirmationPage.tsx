import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Order } from '../types';
import { OrderService } from '../services/orderService';
import { AuthService } from '../services/authService';
import { StoreSettingsService } from '../services/storeSettingsService';
import { SEOHead } from '../components/SEOHead';
import { useLanguage } from '../context/LanguageContext';
import { normalizeImagePath } from '../utils/imageUtils';
import { orderStatusLabel } from '../utils/orderText';
import { errorMessage } from '../lib/supabase';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

export const OrderConfirmationPage: React.FC = () => {
  const { isArabic, formatPrice, formatNumber } = useLanguage();
  const L = (en: string, ar: string) => (isArabic ? ar : en);
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const settings = StoreSettingsService.getSettingsSync();
  const signedIn = Boolean(AuthService.getCurrentUser());

  useEffect(() => {
    if (!orderId) {
      setState('missing');
      return;
    }
    let active = true;
    setState('loading');
    OrderService.findOrder(orderId)
      .then((found) => {
        if (!active) return;
        setOrder(found);
        setState(found ? 'ready' : 'missing');
      })
      .catch((err) => {
        console.error('[OrderConfirmationPage] order could not be loaded:', errorMessage(err));
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  if (state === 'loading') {
    return (
      <div className="gutter min-h-[50vh] flex items-end pb-[clamp(60px,10vh,110px)]">
        <div className="flex items-center gap-4">
          <span className="w-5 h-5 border-2 border-fg border-t-transparent animate-spin rounded-full" />
          <span className="text-sm text-mut">{L('Loading your order…', 'جاري تحميل طلبك…')}</span>
        </div>
      </div>
    );
  }

  if (state !== 'ready' || !order) {
    return (
      <div className="gutter pb-[clamp(60px,10vh,110px)]">
        <SEOHead title={L('Order not found', 'الطلب غير موجود')} description={L('Find your RootLand order.', 'ابحث عن طلبك من روت لاند.')} />
        <h1 className="t-section text-fg max-w-[16ch]">
          {state === 'error' ? L('We could not load this order.', 'تعذر تحميل هذا الطلب.') : L('Order not found.', 'لم يتم العثور على الطلب.')}
        </h1>
        <p className="t-blurb text-body mt-6 max-w-[48ch]">
          {state === 'error'
            ? L('Check your connection and reload the page.', 'تأكد من الاتصال ثم أعد تحميل الصفحة.')
            : L(
                'This page shows orders placed in this browser or in your account. Track any order with its number and your mobile number.',
                'تعرض هذه الصفحة الطلبات المسجلة من هذا المتصفح أو من حسابك. تتبع أي طلب برقمه ورقم موبايلك.'
              )}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/track-order" className="pill pill--solid">
            {L('Track order', 'تتبع الطلب')}
          </Link>
          <Link to="/shop" className="pill">
            {L('Shop', 'تسوق')}
          </Link>
        </div>
      </div>
    );
  }

  const address = order.shippingAddress;
  const closed = order.orderStatus === 'cancelled' || order.orderStatus === 'refused' || order.orderStatus === 'returned';
  const itemLines = order.items
    .map((i) => `${i.quantity} × ${isArabic ? i.productNameAr || i.productName : i.productName} (${i.size})${i.isPreorder ? L(' - pre-order', ' - طلب مسبق') : ''}`)
    .join('\n');
  const whatsappMessage = encodeURIComponent(
    isArabic
      ? `مرحباً روت لاند، طلبي رقم ${order.orderNumber}\n${itemLines}\nالاسم: ${address.fullName}\nالإجمالي عند الاستلام: ${formatPrice(order.total)}`
      : `Hello RootLand, my order is ${order.orderNumber}\n${itemLines}\nName: ${address.fullName}\nTotal on delivery: ${formatPrice(order.total)}`
  );
  const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${whatsappMessage}`;
  const trackUrl = `/track-order?order=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(order.customerPhone)}`;

  const payment = [
    [L('Payment', 'الدفع'), L('Cash on delivery', 'الدفع عند الاستلام')],
    [L('Status', 'الحالة'), orderStatusLabel(order.orderStatus, isArabic)],
    [
      order.paymentStatus === 'paid' ? L('Paid', 'تم الدفع') : L('Pay the courier', 'تدفع للمندوب'),
      formatPrice(order.total),
    ],
  ];

  return (
    <div className="gutter pb-[clamp(60px,10vh,110px)]">
      <SEOHead
        title={L(`Order ${order.orderNumber}`, `طلب رقم ${order.orderNumber}`)}
        description={L('Your RootLand order was received.', 'تم استلام طلبك من روت لاند.')}
      />

      <header className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end pb-10">
        <div>
          <h1 className="t-section text-fg max-w-[14ch]">
            {closed ? (
              orderStatusLabel(order.orderStatus, isArabic)
            ) : (
              <>
                {L('We received your', 'استلمنا')} <span className="text-accent">{L('order.', 'طلبك.')}</span>
              </>
            )}
          </h1>
          <p className="mt-8 text-sm text-mut">
            {L('Order number', 'رقم الطلب')}{' '}
            <span className="t-title text-fg block mt-2" dir="ltr">
              {order.orderNumber}
            </span>
          </p>
        </div>

        <div className="space-y-5">
          {!closed && (
            <p className="t-blurb text-body max-w-[42ch]">
              {L(
                `Nothing to pay now. Pay ${formatPrice(order.total)} in cash to the courier when your order arrives. We will contact you before delivery.`,
                `لا شيء تدفعه الآن. ادفع ${formatPrice(order.total)} نقداً للمندوب عند وصول طلبك. سنتواصل معك قبل التوصيل.`
              )}
            </p>
          )}
          {order.isPreorder && order.preorderNote && <p className="text-body text-fg">{order.preorderNote}</p>}
          <div className="flex flex-wrap gap-3">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="pill pill--accent">
              {L('Message us on WhatsApp', 'راسلنا على واتساب')}
              <span aria-hidden="true" className="rtl:-scale-x-100">
                ↗
              </span>
            </a>
            <Link to={trackUrl} className="pill">
              {L('Track order', 'تتبع الطلب')}
            </Link>
            {signedIn && (
              <Link to="/account/orders" className="pill">
                {L('My orders', 'طلباتي')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-10 md:grid-cols-2 border-t-2 border-fg pt-8">
        <section>
          <h2 className="font-display text-xl font-semibold text-fg mb-4">{L('Delivery address', 'عنوان التوصيل')}</h2>
          <div className="text-body space-y-1">
            <p className="text-fg">{address.fullName}</p>
            <p className="t-counter" dir="ltr">
              {address.phone}
            </p>
            <p>{[address.streetAddress, address.buildingNumber, address.floorApartment].filter(Boolean).join(L(', ', '، '))}</p>
            <p>{[address.district, address.city, isArabic ? address.governorateAr : address.governorate].filter(Boolean).join(L(', ', '، '))}</p>
            {address.nearestLandmark && (
              <p className="text-mut">
                {L('Landmark:', 'علامة مميزة:')} {address.nearestLandmark}
              </p>
            )}
            {order.notes && (
              <p className="text-mut">
                {L('Notes:', 'ملاحظات:')} {order.notes}
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-fg mb-4">{L('Payment', 'الدفع')}</h2>
          <dl>
            {payment.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5 border-b border-line text-body">
                <dt className="text-mut">{label}</dt>
                <dd className="text-fg text-end">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-fg mb-2">{L('Items', 'المنتجات')}</h2>
        <div className="border-b border-line">
          {order.items.map((item, i) => (
            <div key={i} className="py-4 border-t border-line grid gap-4 grid-cols-[minmax(0,1fr)_auto] items-center">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-16 bg-bone-2 overflow-hidden shrink-0">
                  <img src={normalizeImagePath(item.image)} alt={item.productName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-fg">{isArabic ? item.productNameAr || item.productName : item.productName}</h3>
                  <p className="text-sm text-body mt-1">
                    {isArabic ? item.colorNameAr || item.colorName : item.colorName} · {L('Size', 'المقاس')} {item.size} · {L('Qty', 'الكمية')} {formatNumber(item.quantity)}
                    {item.isPreorder ? ` · ${L('Pre-order', 'طلب مسبق')}` : ''}
                  </p>
                </div>
              </div>
              <span className="t-counter text-fg">{formatPrice(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
        </div>

        <dl className="mt-6 max-w-sm ms-auto text-body">
          <div className="flex justify-between py-2 border-b border-line">
            <dt className="text-mut">{L('Subtotal', 'المجموع الفرعي')}</dt>
            <dd className="t-counter text-fg">{formatPrice(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between py-2 border-b border-line">
              <dt className="text-mut">
                {L('Discount', 'الخصم')}
                {order.couponCode ? ` (${order.couponCode})` : ''}
              </dt>
              <dd className="t-counter text-ok">-{formatPrice(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-line">
            <dt className="text-mut">{L('Delivery', 'التوصيل')}</dt>
            <dd className="text-fg">{order.shippingFee === 0 ? L('Free', 'مجاني') : <span className="t-counter">{formatPrice(order.shippingFee)}</span>}</dd>
          </div>
          <div className="flex justify-between items-baseline pt-4 border-t-2 border-fg mt-2">
            <dt className="font-semibold text-fg">{L('Total', 'الإجمالي')}</dt>
            <dd className="font-display text-[26px] font-semibold tracking-[-0.02em] text-fg tabular-nums">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-12">
        <Link to="/shop" className="pill">
          {L('Continue shopping', 'متابعة التسوق')}
        </Link>
      </div>
    </div>
  );
};
