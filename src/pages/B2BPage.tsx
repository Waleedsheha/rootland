import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { B2BService } from '../services/b2bService';
import { StoreSettingsService } from '../services/storeSettingsService';
import { useToast } from '../components/Toast';
import { SEOHead } from '../components/SEOHead';
import { FillRow } from '../components/ui/FillRow';
import { PixelStrip } from '../components/ui/PixelStrip';
import { useScrollReveals } from '../motion/reveal';

interface B2BPageProps {
  isArabic?: boolean;
}

export const B2BPage: React.FC<B2BPageProps> = ({ isArabic = false }) => {
  const { showToast } = useToast();
  const location = useLocation();
  const { section } = useParams<{ section?: string }>();

  useEffect(() => {
    const scrollToPricing = () => {
      const el = document.getElementById('pricing') || document.getElementById('pricing-tiers');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      }
      return false;
    };

    const isPricingTarget =
      location.hash === '#pricing' ||
      location.hash === '#pricing-tiers' ||
      location.hash === '#calculator' ||
      section === 'calculator' ||
      section === 'pricing' ||
      section === 'pricing-tiers' ||
      (typeof window !== 'undefined' && (window.location.hash === '#pricing' || window.location.hash === '#pricing-tiers'));

    if (isPricingTarget) {
      scrollToPricing();
      const delays = [50, 150, 300, 500, 800, 1200, 1600];
      const timers = delays.map((ms) => setTimeout(scrollToPricing, ms));
      return () => {
        timers.forEach(clearTimeout);
      };
    }
  }, [location.hash, location.pathname, section]);

  // Quote Form State
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState<any>('Restaurant / Café');
  const [employeeCount, setEmployeeCount] = useState('20-50');
  const [estimatedQuantity, setEstimatedQuantity] = useState(100);
  const [productType, setProductType] = useState<any>('RootLand Hoodie Black');
  const [preferredColors, setPreferredColors] = useState('Black, White-Grey');
  const [brandingTechnique, setBrandingTechnique] = useState<any>('Custom Printed Logo');
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState(
    () => new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState(false);
  const L = (en: string, ar: string) => (isArabic ? ar : en);
  const scopeRef = useRef<HTMLDivElement>(null);
  useScrollReveals(scopeRef, [isArabic, submittedLeadId]);

  const sectors = [
    { title: L('Restaurants & cafés', 'المطاعم والكافيهات'), text: L('Comfortable team hoodies in soft fleece that handle daily washing.', 'هوديز مريحة لفريق العمل من فليس ناعم يتحمل الغسيل اليومي.') },
    { title: L('Hotels & resorts', 'الفنادق والمنتجعات'), text: L('Staff basics and guest merchandise with your logo.', 'ملابس أساسية للموظفين وهدايا للضيوف بشعارك.') },
    { title: L('Companies & startups', 'الشركات والشركات الناشئة'), text: L('Team hoodies people actually wear outside the office.', 'هوديز للفريق يحب الناس ارتداءها خارج المكتب أيضاً.') },
    { title: L('Schools & universities', 'المدارس والجامعات'), text: L('Graduation and student activity hoodies in a unisex oversized fit.', 'هوديز التخرج والأنشطة الطلابية بقصة أوفر سايز للجنسين.') },
    { title: L('Events & festivals', 'الفعاليات والمهرجانات'), text: L('Merchandise and staff hoodies for events across Egypt.', 'هوديز للفعاليات وفرق العمل في كل مصر.') },
    { title: L('Brands & studios', 'العلامات التجارية والاستوديوهات'), text: L('Plain blanks ready for your own logo and designs.', 'هوديز سادة جاهزة لشعارك وتصميماتك.') },
  ];
  const howItWorks = [
    { title: L('From 100 pieces', 'من 100 قطعة'), text: L('Mix colors and sizes (L, XL, XXL) in one order.', 'يمكنك الجمع بين الألوان والمقاسات (L و XL و XXL) في طلب واحد.') },
    { title: L('Your custom logo', 'شعارك الخاص'), text: L('Printed or embroidered. Send your logo after the request and we share a mock-up first.', 'طباعة أو تطريز. أرسل شعارك بعد الطلب وسنرسل لك شكلاً مبدئياً أولاً.') },
    { title: L('Price per piece drops with quantity', 'سعر القطعة يقل كلما زادت الكمية'), text: L('You get a written quote for your exact quantity, logo and delivery date.', 'تحصل على عرض سعر مكتوب حسب الكمية والشعار وموعد التسليم.') },
  ];
  const whatsappNumber = StoreSettingsService.getSettingsSync().whatsappNumber;

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(false);
    if (!companyName.trim() || !contactPerson.trim() || !phone.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast(L('Missing details', 'بيانات ناقصة'), L('Please fill in all required fields.', 'يرجى إكمال جميع الحقول المطلوبة.'), 'error');
      return;
    }
    if (estimatedQuantity < 100) {
      showToast(L('Minimum 100 pieces', 'الحد الأدنى 100 قطعة'), L('Business orders start from 100 pieces.', 'طلبات الشركات تبدأ من 100 قطعة.'), 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await B2BService.submitQuoteRequest({
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        businessType,
        employeeCount,
        estimatedQuantity,
        productType,
        preferredColors,
        brandingTechnique,
        requiredDeliveryDate,
        additionalRequirements,
        hasLogoArtwork: brandingTechnique !== 'Plain (No Logo)',
      });
      setSubmittedLeadId(res.leadId);
      showToast(L('Request received', 'تم استلام طلبك'), res.leadId, 'success');
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={scopeRef}>
      <SEOHead
        title={isArabic ? 'طلبات الشركات والكميات B2B' : 'B2B & Corporate Custom Hoodies'}
        description={
          isArabic
            ? 'هوديز موحدة عالية الجودة للشركات مع شعارك المخصص وأسعار جملة مدرجة حسب الكميات. الحد الأدنى 100 قطعة من 70% قطن مصري و30% بوليستر.'
            : 'Premium corporate merchandise, team hoodies, and custom branded apparel crafted from soft, substantial fleece (70% Egyptian cotton, 30% polyester) in Egypt. Tiered quantity pricing starting at 100 units.'
        }
      />
      {/* 1. B2B HERO SECTION */}
      <section className="gutter pb-6">
        <div className="space-y-7 max-w-4xl">
          <h1 className="t-section text-fg">
            {isArabic
              ? 'هوديز موحدة لشركتك، كافيهك، أو علامتك التجارية'
              : 'Custom Brand Hoodies & Bulk Apparel for Egyptian Teams'}
          </h1>
          <p className="t-blurb text-mut max-w-xl">
            {isArabic
              ? 'حد أدنى للطلب 100 قطعة مع إضافة شعارك المخصص وأسعار جملة متدرجة حسب الكميات. نوفر هوديز سادة عالية الجودة من 70% قطن مصري و30% بوليستر بفليس ناعم ومريح.'
              : 'Minimum order 100 pieces with your custom logo and tiered bulk pricing. We supply high quality unisex plain hoodies in soft, substantial fleece (70% Egyptian cotton, 30% polyester) for companies, cafés, tech teams, and creative brands.'}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href="#quote-form" className="pill pill--accent">
              <span>{isArabic ? 'طلب تسعيرة رسمية' : 'Request a Business Quote'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </a>
            <a href="#pricing-tiers" className="pill">
              {isArabic ? 'جدول أسعار الكميات' : 'Wholesale Tiers & Lead Times'}
            </a>
          </div>
        </div>
      </section>

      {/* 2. SECTORS */}
      <section className="gutter section border-t border-line">
        <h2 key={`reveal-1-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg mb-10" data-reveal-lines>
          {L('Hoodies for teams, brands and', 'هوديز للفرق والعلامات')} <span className="text-accent">{L('events.', 'والفعاليات.')}</span>
        </h2>
        <div className="border-b border-line">
          {sectors.map((s) => (
            <FillRow key={s.title} className="px-4 py-7">
              <div className="grid items-baseline gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <span className="t-row text-fg">{s.title}</span>
                <span className="text-sm text-mut hidden md:block">{s.text}</span>
              </div>
              <span className="text-sm text-mut md:hidden block mt-2">{s.text}</span>
            </FillRow>
          ))}
        </div>
      </section>

      {/* 3. HOW BULK ORDERS WORK */}
      <section id="pricing" className="gutter section border-t border-line scroll-mt-24">
        <div id="pricing-tiers" />
        <h2 key={`reveal-2-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg" data-reveal-lines>
          {L('How orders', 'كيف تعمل')} <span className="text-accent">{L('work.', 'الطلبات.')}</span>
        </h2>
        <div className="mt-12 grid md:grid-cols-3 border-t-2 border-fg">
          {howItWorks.map((item, i) => (
            <div key={item.title} className="py-8 md:pe-8 border-b border-line md:border-b-0 md:border-e md:last:border-e-0 md:[&:not(:first-child)]:ps-8" data-reveal>
              <span className="t-counter text-accent">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="t-row text-fg mt-3">{item.title}</h3>
              <p className="text-body mt-4 max-w-[36ch]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <PixelStrip from="night" to="bone" />

      {/* 4. QUOTE FORM */}
      <section id="quote-form" data-surface="bone" className="gutter section-lg scroll-mt-24">
        {submittedLeadId ? (
          <div className="max-w-3xl">
            <p className="t-counter text-mut mb-6" dir="ltr">
              {submittedLeadId}
            </p>
            <h2 className="t-section text-fg">
              {L('We received your', 'استلمنا')} <span className="text-accent">{L('request.', 'طلبك.')}</span>
            </h2>
            <p className="t-blurb text-body max-w-[52ch] mt-6">
              {L(
                `Thank you, ${contactPerson}. We will contact you about ${companyName} with a quote. You can send your logo on WhatsApp now.`,
                `شكراً ${contactPerson}. سنتواصل معك بخصوص ${companyName} بعرض السعر. يمكنك إرسال شعارك على واتساب الآن.`
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`B2B ${submittedLeadId} – ${companyName}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pill pill--accent"
              >
                {L('Send logo on WhatsApp', 'أرسل الشعار على واتساب')}
              </a>
              <button type="button" onClick={() => setSubmittedLeadId(null)} className="pill">
                {L('Send another request', 'إرسال طلب آخر')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitQuote} noValidate className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <div className="lg:sticky lg:top-[14vh] self-start">
              <h2 key={`reveal-3-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg" data-reveal-lines>
                {L('Request a', 'اطلب عرض')} <span className="text-accent">{L('quote.', 'سعر.')}</span>
              </h2>
              <p className="t-blurb text-body max-w-[36ch] mt-6">{L('Tell us what you need. We reply with a written quote by phone or WhatsApp.', 'أخبرنا بما تحتاجه وسنرد بعرض سعر مكتوب بالهاتف أو واتساب.')}</p>
            </div>

            <div className="space-y-12">
              <fieldset className="space-y-7">
                <legend className="t-label text-fg mb-2 flex items-center gap-3">
                  <span className="t-counter text-accent">01</span>
                  {L('Company and contact', 'الشركة وبيانات التواصل')}
                </legend>
                <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
                  {[
                    { label: L('Company name', 'اسم الشركة'), value: companyName, set: setCompanyName, type: 'text' },
                    { label: L('Contact person', 'اسم المسؤول'), value: contactPerson, set: setContactPerson, type: 'text' },
                    { label: L('Work email', 'البريد الإلكتروني'), value: email, set: setEmail, type: 'email' },
                    { label: L('Phone / WhatsApp', 'الهاتف / واتساب'), value: phone, set: setPhone, type: 'tel' },
                  ].map((f) => (
                    <label key={f.label} className="block">
                      <span className="t-label text-mut">{f.label} *</span>
                      <input
                        type={f.type}
                        required
                        dir={f.type === 'email' || f.type === 'tel' ? 'ltr' : undefined}
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        className="field"
                      />
                    </label>
                  ))}
                  <label className="block">
                    <span className="t-label text-mut">{L('Business type', 'نوع النشاط')}</span>
                    <select value={businessType} onChange={(e) => setBusinessType(e.target.value as typeof businessType)} className="field cursor-pointer">
                      {[
                        ['Restaurant / Café', 'مطعم / كافيه'],
                        ['Hotel / Hospitality', 'فندق / ضيافة'],
                        ['Tech Startup / Corporate', 'شركة / شركة ناشئة'],
                        ['School / University', 'مدرسة / جامعة'],
                        ['Event / Festival', 'فعالية / مهرجان'],
                        ['Fitness / Gym', 'جيم / رياضة'],
                        ['Retail / Fashion Brand', 'علامة أزياء / متجر'],
                        ['Other', 'أخرى'],
                      ].map(([value, ar]) => (
                        <option key={value} value={value}>
                          {isArabic ? ar : value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="t-label text-mut">{L('Team size', 'عدد الفريق')}</span>
                    <select value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} className="field cursor-pointer">
                      {['10-20', '20-50', '50-150', '150-500', '500+'].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </fieldset>

              <div aria-hidden="true" className="border-t border-line" />
              <fieldset className="space-y-7">
                <legend className="t-label text-fg mb-2 flex items-center gap-3">
                  <span className="t-counter text-accent">02</span>
                  {L('What you need', 'تفاصيل الطلب')}
                </legend>
                <div className="grid gap-x-8 gap-y-7 sm:grid-cols-3">
                  <label className="block">
                    <span className="t-label text-mut">{L('Hoodie', 'الهودي')}</span>
                    <select value={productType} onChange={(e) => setProductType(e.target.value as typeof productType)} className="field cursor-pointer">
                      {[
                        ['RootLand Hoodie Black', 'هودي روت لاند أسود'],
                        ['RootLand Hoodie White', 'هودي روت لاند أبيض'],
                        ['Both colors', 'اللونان'],
                      ].map(([value, ar]) => (
                        <option key={value} value={value}>
                          {isArabic ? ar : value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="t-label text-mut">{L('Quantity (min. 100)', 'الكمية (100 على الأقل)')} *</span>
                    <input
                      type="number"
                      min={100}
                      max={10000}
                      value={estimatedQuantity}
                      onChange={(e) => setEstimatedQuantity(Number(e.target.value))}
                      className="field t-counter !text-base"
                    />
                  </label>
                  <label className="block">
                    <span className="t-label text-mut">{L('Needed by', 'مطلوب قبل')}</span>
                    <input type="date" value={requiredDeliveryDate} onChange={(e) => setRequiredDeliveryDate(e.target.value)} className="field" />
                  </label>
                </div>
                <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
                  <label className="block">
                    <span className="t-label text-mut">{L('Colors and sizes', 'الألوان والمقاسات')}</span>
                    <input
                      type="text"
                      value={preferredColors}
                      onChange={(e) => setPreferredColors(e.target.value)}
                      placeholder={L('e.g. 60 black, 40 white-grey', 'مثال: 60 أسود، 40 رمادي فاتح')}
                      className="field"
                    />
                  </label>
                  <label className="block">
                    <span className="t-label text-mut">{L('Logo', 'الشعار')}</span>
                    <select value={brandingTechnique} onChange={(e) => setBrandingTechnique(e.target.value as typeof brandingTechnique)} className="field cursor-pointer">
                      {[
                        ['Custom Printed Logo', 'شعار مطبوع'],
                        ['Custom Embroidered Logo', 'شعار مطرز'],
                        ['Plain (No Logo)', 'سادة بدون شعار'],
                      ].map(([value, ar]) => (
                        <option key={value} value={value}>
                          {isArabic ? ar : value}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="t-label text-mut">{L('Notes', 'ملاحظات')}</span>
                  <textarea
                    rows={3}
                    value={additionalRequirements}
                    onChange={(e) => setAdditionalRequirements(e.target.value)}
                    placeholder={L('Logo position, packaging, anything else we should know', 'مكان الشعار، التغليف، أو أي تفاصيل أخرى')}
                    className="field resize-none"
                  />
                </label>
              </fieldset>

              {submitError && (
                <p role="alert" className="border-t-2 border-err pt-4 text-err">
                  {L('We could not send your request. Please try again or contact us on WhatsApp.', 'تعذر إرسال طلبك. حاول مرة أخرى أو تواصل معنا على واتساب.')}{' '}
                  <a className="underline" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </p>
              )}

              <div className="border-t border-line pt-8 flex flex-wrap items-center justify-between gap-5">
                <span className="text-body">{L('We reply by phone or WhatsApp.', 'نرد عليك بالهاتف أو واتساب.')}</span>
                <button type="submit" disabled={submitting} className="pill pill--solid">
                  <span>{submitting ? L('Sending…', 'جاري الإرسال…') : L('Send request', 'إرسال الطلب')}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      <PixelStrip from="bone" to="night" />
    </div>
  );
};
