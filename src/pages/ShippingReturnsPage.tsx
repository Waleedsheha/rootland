import React, { useRef } from 'react';
import { SEOHead } from '../components/SEOHead';
import { useScrollReveals } from '../motion/reveal';
import { StoreSettingsService } from '../services/storeSettingsService';

interface ShippingReturnsPageProps {
  isArabic?: boolean;
}

export const ShippingReturnsPage: React.FC<ShippingReturnsPageProps> = ({ isArabic = false }) => {
  const settings = StoreSettingsService.getSettingsSync();
  const governorates = settings.governorates;
  const threshold = settings.freeShippingThreshold.toLocaleString('en-US');
  const scopeRef = useRef<HTMLDivElement>(null);
  useScrollReveals(scopeRef, [isArabic]);

  const highlights = [
    {
      title: isArabic ? `شحن مجاني من ${threshold} ج.م` : `Free shipping from ${threshold} EGP`,
      text: isArabic
        ? `يتم تطبيق الشحن المجاني تلقائياً عند وصول قيمة سلة المشتريات إلى ${threshold} جنيه مصري في أي مكان داخل مصر.`
        : `Free courier shipping automatically activates at checkout for all orders reaching ${threshold} EGP across any Egyptian governorate.`,
    },
    {
      title: isArabic ? 'استبدال المقاس عند الباب (14 يوماً)' : '14-day doorstep size exchange',
      text: isArabic
        ? 'المقاس مش مناسبك أو حابب قصة أوسع؟ مندوبنا بيوصلك بالمقاس الجديد ويستلم القديم عند باب بيتك بسهولة.'
        : 'Prefer a boxier or more tailored drop? Our courier swaps the replacement size directly at your doorstep anywhere in Egypt.',
    },
    {
      title: isArabic ? 'الدفع عند الاستلام' : 'Cash on delivery',
      text: isArabic
        ? 'لا شيء تدفعه مقدماً. ادفع المبلغ كاملاً نقداً للمندوب بعد معاينة الهودي.'
        : 'Nothing to pay upfront. Pay the full amount in cash to the courier after checking your hoodie.',
    },
  ];

  const steps = [
    {
      title: isArabic ? 'تواصل عبر واتساب' : 'Contact us on WhatsApp',
      text: isArabic
        ? 'أرسل لنا رقم طلبك والمقاس الجديد المطلوب على رقم الواتساب الرسمي.'
        : 'Send your order reference number and requested replacement size to our concierge WhatsApp.',
    },
    {
      title: isArabic ? 'تجهيز الشحنة البديلة' : 'We prepare the replacement',
      text: isArabic
        ? 'نقوم بفحص وتجهيز المقاس الجديد فوراً وإرساله مع مندوبنا.'
        : 'We prepare your clean replacement piece from fresh stock and book a courier dispatch.',
    },
    {
      title: isArabic ? 'التبديل عند باب بيتك' : 'Doorstep hand-off',
      text: isArabic
        ? 'يسلمك المندوب القطعة الجديدة ويستلم منك القديمة في نفس اللحظة بدون أي مشاوير.'
        : 'The courier hands over the new size and collects the original garment in a single visit.',
    },
  ];

  const whatsapp = `https://wa.me/${settings.whatsappNumber}?text=Hello%20ROOTLAND,%20I%20have%20a%20question%20about%20shipping%20and%20exchanges`;

  return (
    <div ref={scopeRef} className="gutter pb-[clamp(60px,10vh,110px)]">
      <SEOHead
        title={isArabic ? 'سياسة الشحن والاستبدال في 27 محافظة' : 'Shipping & 14-Day Returns — 27 Governorates'}
        description={isArabic ? 'مواعيد وأسعار التوصيل لجميع محافظات مصر، الشحن المجاني، والاستبدال خلال 14 يوماً.' : 'Delivery times and fees for all 27 Egyptian governorates, free shipping, and 14-day size exchange.'}
      />

      <header className="pb-12">
        <h1 key={`reveal-1-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg max-w-[14ch]" data-reveal-lines>
          {isArabic ? 'الشحن والتوصيل' : 'Shipping, delivery &'} <span className="text-accent">{isArabic ? 'والاستبدال.' : 'returns.'}</span>
        </h1>
        <p className="t-blurb text-body max-w-[52ch] mt-6" data-reveal>
          {isArabic
            ? `تغطية شاملة لجميع المحافظات الـ ${governorates.length} · شحن مجاني للطلبات من ${threshold} ج.م · استبدال مجاني للمقاس خلال 14 يوماً`
            : `Covering all ${governorates.length} Egyptian governorates · Free shipping on orders of ${threshold} EGP or more · 14-day doorstep size exchange`}
        </p>
      </header>

      {/* Highlights */}
      <div className="grid gap-x-8 gap-y-8 md:grid-cols-3 border-t-2 border-fg pt-8 mb-[clamp(60px,10vh,110px)]">
        {highlights.map((h, i) => (
          <div key={h.title} data-reveal>
            <h2 className="t-row text-fg">{h.title}</h2>
            <p className="text-body mt-4 max-w-[40ch]">{h.text}</p>
          </div>
        ))}
      </div>

      {/* Governorate directory */}
      <section className="mb-[clamp(60px,10vh,110px)]">
        <h2 key={`reveal-2-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg" data-reveal-lines>
          {isArabic ? `${governorates.length} محافظة،` : `${governorates.length} governorates,`}{' '}
          <span className="text-accent">{isArabic ? 'سعر واحد لكل منها.' : 'one rate each.'}</span>
        </h2>
        <p className="t-blurb text-body max-w-[52ch] mt-6 mb-10" data-reveal>
          {isArabic
            ? 'تصلك شحنات القاهرة والجيزة خلال 24 إلى 48 ساعة، وباقي المحافظات خلال 2 إلى 4 أيام عمل.'
            : 'Cairo & Giza dispatches arrive within 24–48 hours. Delta, Canal, Coastal and Upper Egypt within 2–4 business days.'}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-start sm:min-w-[560px]">
            <thead>
              <tr className="t-label text-mut border-b-2 border-fg">
                <th className="py-3 pe-4 font-semibold text-start">{isArabic ? 'المحافظة' : 'Governorate'}</th>
                <th className="py-3 pe-4 font-semibold text-start">{isArabic ? 'مدة التوصيل' : 'Delivery time'}</th>
                <th className="py-3 pe-4 font-semibold text-start">{isArabic ? 'رسوم الشحن' : 'Rate'}</th>
                <th className="py-3 font-semibold text-start hidden sm:table-cell">{isArabic ? `من ${threshold} ج.م` : `Orders of ${threshold} EGP+`}</th>
              </tr>
            </thead>
            <tbody>
              {governorates.map((gov, idx) => (
                <tr key={gov.id} className="border-b border-line text-fg">
                  <td className="py-3.5 pe-4 font-semibold">{isArabic ? gov.nameArabic : gov.name}</td>
                  <td className="py-3.5 pe-4 text-body">{isArabic ? gov.deliveryDaysArabic || gov.deliveryDays : gov.deliveryDays}</td>
                  <td className="py-3.5 pe-4 t-counter whitespace-nowrap">{isArabic ? `${gov.fee} ج.م` : `${gov.fee} EGP`}</td>
                  <td className="py-3.5 hidden sm:table-cell">
                    <span className="t-tag inline-block border border-line-strong rounded-full px-2.5 py-1">{isArabic ? 'مجاني' : 'Free'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Exchange steps */}
      <section>
        <h2 key={`reveal-3-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg mb-10" data-reveal-lines>
          {isArabic ? 'كيف تطلب استبدال' : 'How to exchange a'} <span className="text-accent">{isArabic ? 'المقاس؟' : 'size.'}</span>
        </h2>
        <ol className="border-t border-line">
          {steps.map((s, i) => (
            <li key={s.title} className="grid gap-4 py-7 border-b border-line md:grid-cols-[48px_minmax(0,1fr)_minmax(0,1.4fr)]" data-reveal>
              <span className="t-counter text-accent">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="t-row text-fg">{s.title}</h3>
              <p className="text-body max-w-[48ch]">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-5">
          <span className="t-blurb text-body">{isArabic ? 'هل تحتاج لمساعدة فورية بخصوص شحنتك؟' : 'Need immediate delivery assistance?'}</span>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="pill pill--solid">
            {isArabic ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}
            <span aria-hidden="true" className="rtl:-scale-x-100">
              ↗
            </span>
          </a>
        </div>
      </section>
    </div>
  );
};
