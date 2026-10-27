import React, { useRef } from 'react';
import { SEOHead } from '../components/SEOHead';
import { FillRow } from '../components/ui/FillRow';
import { Marquee } from '../components/ui/Marquee';
import { PixelStrip } from '../components/ui/PixelStrip';
import { useClipReveals, useScrollReveals } from '../motion/reveal';
import { useLanguage } from '../context/LanguageContext';

interface AboutPageProps {
  onNavigateShop: () => void;
  isArabic?: boolean;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigateShop }) => {
  const { isArabic } = useLanguage();
  const scopeRef = useRef<HTMLDivElement>(null);
  useScrollReveals(scopeRef, [isArabic]);
  useClipReveals(scopeRef, [isArabic]);

  const name = [
    {
      word: isArabic ? 'الجذر' : 'Root',
      text: isArabic
        ? 'الأصل، العائلة، الحي والشارع الذي نشأت فيه، والقيم الأصيلة التي تبقيك ثابتاً ومتزناً في كل خطوة.'
        : 'Origin, family, the neighbourhood you grew up in, and the values that keep you steady.',
    },
    {
      word: isArabic ? 'الأرض' : 'Land',
      text: isArabic ? 'مصر، الأرض التي نتشاركها جميعاً وننتمي إليها بكل فخر.' : 'Egypt, the ground we share and walk upon every single day.',
    },
  ];

  const commitments = [
    {
      title: isArabic ? 'توصيل القاهرة والجيزة' : 'Cairo delivery',
      text: isArabic
        ? 'توصيل خلال 24-48 ساعة في القاهرة والجيزة و2-4 أيام لباقي المحافظات.'
        : 'Delivered across Cairo and Giza within 24–48 hours. Nationwide in 2–4 business days.',
    },
    {
      title: isArabic ? 'الدفع عند الاستلام' : 'Cash on delivery',
      text: isArabic ? 'ادفع نقداً عند استلام طلبك ومطابقته على باب منزلك.' : 'Pay cash safely at your doorstep upon receiving your package.',
    },
    {
      title: isArabic ? 'استبدال المقاس' : '14-day exchanges',
      text: isArabic ? 'استبدال فوري للمقاس في حال رغبت بمقاس أكبر أو أصغر.' : 'Doorstep size exchange anywhere in Egypt if you need a different size.',
    },
  ];

  return (
    <div ref={scopeRef}>
      <SEOHead
        title={isArabic ? 'قصة روت لاند والاسم' : 'The Story Behind RootLand'}
        description={
          isArabic
            ? 'بدأت روت لاند بواسطة ثلاثة أصدقاء من مصر أرادوا ملابس أساسية راقية تناسب ثقافة المجتمع المصري وجيل اليوم بسعر عادل.'
            : 'RootLand was started by three friends from Egypt who wanted high-end basics that fit Egyptian culture and today’s generation, at a fair price.'
        }
      />

      {/* Title */}
      <header className="gutter pb-[clamp(40px,7vh,80px)]">
        <h1 key={`reveal-1-${isArabic ? 'ar' : 'en'}`} className="t-hero text-fg max-w-[12ch]" data-reveal-lines>
          {isArabic ? 'قصة' : 'The story of'} <span className="text-accent">{isArabic ? 'روت لاند' : 'RootLand'}</span>
        </h1>
        <p className="t-blurb text-mut max-w-[46ch] mt-8" data-reveal>
          {isArabic
            ? 'أساسيات يومية للجنسين صُنعت بصدق في مصر. هوديز سادة بقصة أوفر سايز بدون حبال أو شعارات، بفليس ناعم ومريح.'
            : 'Unisex everyday essentials crafted honestly in Egypt. Plain oversized hoodies with zero drawstrings or loud branding, cut from soft, substantial fleece.'}
        </p>
      </header>

      {/* The question that started it all */}
      <section className="gutter section-lg border-t border-line">
        <p key={`reveal-2-${isArabic ? 'ar' : 'en'}`} className="t-statement text-fg max-w-[26ch]" data-word-fill>
          {isArabic
            ? 'لماذا لا يكون الهودي المصري مريحاً وأنيقاً وبسعر عادل يستحقه'
            : 'Why can’t an Egyptian hoodie feel as good as it looks, and cost what it'}{' '}
          <span className="text-accent">{isArabic ? 'الجميع؟' : 'should?'}</span>
        </p>
        <p className="t-blurb text-mut max-w-[44ch] mt-10" data-reveal>
          {isArabic
            ? 'بدأنا بهودي واحد، واختبرنا القماش بأنفسنا، وبنينا علامتنا حول الناس الذين يرتدونه.'
            : 'We began with one hoodie, tested the fabric ourselves, and built a brand around the people who wear it.'}
        </p>
      </section>

      {/* The founders */}
      <section className="gutter section border-t border-line">
        <div className="grid gap-[clamp(30px,5vw,100px)] lg:grid-cols-2">
          <div className="lg:sticky lg:top-[14vh] self-start">
            <h2 key={`reveal-3-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg" data-reveal-lines>
              {isArabic ? 'ثلاثة أصدقاء من' : 'Three friends from'} <span className="text-accent">{isArabic ? 'مصر.' : 'Egypt.'}</span>
            </h2>
            <p className="t-blurb text-body max-w-[44ch] mt-6" data-reveal>
              {isArabic
                ? 'بدأت روت لاند بواسطة ثلاثة أصدقاء من مصر أرادوا ملابس أساسية راقية تناسب ثقافة المجتمع المصري وجيل اليوم بسعر عادل، ولم يجدوها في السوق.'
                : 'RootLand was started by three friends from Egypt who wanted high-end basics that fit Egyptian culture and today’s generation, at a fair price, and couldn’t find them.'}
            </p>
            <div className="mt-10 border-t border-line pt-5" data-reveal>
              <div>
                <div className="t-label text-fg">{isArabic ? 'قيمنا' : 'Our values'}</div>
                <p className="text-body mt-2 max-w-[40ch]">
                  {isArabic
                    ? 'نحن نقدر كل يد وكل أداة وراء كل قطعة؛ لا نعيد اختراع العجلة، بل نصنع الأساسيات بالشكل الصحيح.'
                    : 'We appreciate every pair of hands and every tool behind each piece; we don’t reinvent the wheel, we make the basics right.'}
                </p>
              </div>
            </div>
          </div>

          <figure>
            <div data-clip className="overflow-hidden bg-ghost-ink">
              <img
                src="/src/assets/images/founders_friends.webp"
                alt={isArabic ? 'ثلاثة أصدقاء من مصر أسسوا روت لاند' : 'Three friends from Egypt who founded RootLand'}
                width={1200}
                height={800}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full aspect-[4/5] object-cover"
              />
            </div>
          </figure>
        </div>
      </section>

      {/* The name */}
      <section className="gutter section border-t border-line">
        <h2 key={`reveal-4-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg mb-12" data-reveal-lines>
          {isArabic ? 'القصة وراء' : 'The story behind the'} <span className="text-accent">{isArabic ? 'الاسم.' : 'name.'}</span>
        </h2>
        <div className="border-b border-line">
          {name.map((item) => (
            <FillRow key={item.word} className="px-4 py-8">
              <div className="grid items-end gap-x-8 gap-y-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <span className="t-giant text-fg leading-[0.85] min-w-0" style={{ fontSize: 'clamp(48px, 9vw, 150px)' }}>
                  {item.word}
                </span>
                <p className="t-blurb text-body max-w-[40ch]">{item.text}</p>
              </div>
            </FillRow>
          ))}
        </div>
        <p key={`reveal-5-${isArabic ? 'ar' : 'en'}`} className="t-statement text-fg max-w-[28ch] mt-16" data-word-fill>
          {isArabic
            ? 'أينما تذهب وكيفما ترتدي ملابسك، فإنك تحمل جذورك معك دائماً، والهودي الذي ترتديه كل يوم بالقرب من جسدك يحمل هذه'
            : 'Wherever you go and however you dress, you carry your roots with you — and the hoodie, worn every day close to the body, carries'}{' '}
          <span className="text-accent">{isArabic ? 'الجذور.' : 'them.'}</span>
        </p>
      </section>

      <Marquee
        words={
          isArabic
            ? ['صُنع بأيدي الناس', 'لأجل الناس', '70% قطن مصري', '30% بوليستر', 'صُنع في مصر', 'بدون شعارات']
            : ['Made by people', 'For people', '70% Egyptian cotton', '30% polyester', 'Made in Egypt', 'No logos']
        }
      />

      <PixelStrip from="night" to="bone" />

      {/* Honest commitments */}
      <section data-surface="bone" className="gutter pt-[clamp(60px,10vh,110px)] pb-[clamp(60px,10vh,110px)]">
        <div className="border-b border-line">
          {commitments.map((c) => (
            <FillRow key={c.title} className="px-4 py-7">
              <div className="grid items-baseline gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <span className="t-row text-fg">{c.title}</span>
                <span className="text-sm text-body hidden md:block">{c.text}</span>
              </div>
              <span className="text-sm text-body md:hidden block mt-2">{c.text}</span>
            </FillRow>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section data-surface="bone" className="gutter pb-[clamp(60px,10vh,110px)]">
        <div className="border-t-2 border-fg pt-10 grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-end">
          <h2 key={`reveal-6-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg" data-reveal-lines>
            {isArabic ? 'اكتشف هودي روت لاند' : 'Discover the'} <span className="text-accent">{isArabic ? 'الأساسي.' : 'essential hoodie.'}</span>
          </h2>
          <div className="md:justify-self-end space-y-5" data-reveal>
            <p className="t-blurb text-body max-w-[36ch]">
              {isArabic ? 'متوفر الآن بلوني الأسود والرمادي الفاتح بمقاسات L وXL وXXL.' : 'Available in Black and White-Grey in sizes L, XL and XXL.'}
            </p>
            <button type="button" onClick={onNavigateShop} className="pill pill--solid">
              {isArabic ? 'تسوق الهوديز' : 'View the hoodies'}
              <span aria-hidden="true" className="rtl:-scale-x-100">
                ↗
              </span>
            </button>
          </div>
        </div>
      </section>

      <PixelStrip from="bone" to="night" />
    </div>
  );
};
