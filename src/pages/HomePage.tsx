import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Product, Review } from '../types';
import { SEOHead } from '../components/SEOHead';
import { DataService } from '../services/dataService';
import { useLanguage } from '../context/LanguageContext';
import { SiteContentService, StoreSettingsService } from '../services/storeSettingsService';
import { HeroSpecSheet } from '../components/home/HeroSpecSheet';
import { TheTwo } from '../components/home/TheTwo';
import { BuiltPlain } from '../components/home/BuiltPlain';
import { Marquee } from '../components/ui/Marquee';
import { PixelStrip } from '../components/ui/PixelStrip';
import { Accordion, AccordionItem } from '../components/ui/Accordion';
import { useScrollReveals } from '../motion/reveal';

const FIT_VOTE_AR: Record<Review['fitVote'], string> = {
  'Runs Small': 'أصغر من المعتاد',
  'True to Size': 'مطابق للمقاس',
  'Runs Large': 'أكبر من المعتاد',
};

interface HomePageProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onNavigate: (route: string, param?: string) => void;
  onOpenAIFit: () => void;
  isArabic?: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({ products, onSelectProduct, onNavigate, onOpenAIFit }) => {
  const { t, isArabic, dir, formatPrice } = useLanguage();
  const [publishedReviews, setPublishedReviews] = useState<Review[]>([]);
  const [reviewsError, setReviewsError] = useState(false);
  const [siteContent, setSiteContent] = useState(() => SiteContentService.getContentSync());
  const [settings, setSettings] = useState(() => StoreSettingsService.getSettingsSync());
  const scopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    SiteContentService.getContent().then(setSiteContent);
    StoreSettingsService.getSettings().then(setSettings);
    const onContent = () => setSiteContent(SiteContentService.getContentSync());
    const onSettings = () => setSettings(StoreSettingsService.getSettingsSync());
    window.addEventListener('rootland_content_updated', onContent);
    window.addEventListener('rootland_settings_updated', onSettings);
    return () => {
      window.removeEventListener('rootland_content_updated', onContent);
      window.removeEventListener('rootland_settings_updated', onSettings);
    };
  }, []);

  useEffect(() => {
    // Only real published reviews are shown; the section stays hidden until one is published.
    const unsubscribe = DataService.subscribeToPublishedReviews(
      (reviews) => {
        setPublishedReviews(reviews);
        setReviewsError(false);
      },
      (message) => {
        console.error('[HomePage] reviews could not be loaded:', message);
        setReviewsError(true);
      }
    );
    return () => unsubscribe();
  }, []);

  useScrollReveals(scopeRef, [isArabic, products.length, publishedReviews.length]);

  const sizesOffered = Array.from(new Set(products.flatMap((p) => p.sizes)));

  const tags = (list: string[]) => (
    <div className="flex flex-wrap gap-2 mt-5">
      {list.map((tag) => (
        <span key={tag} className="t-tag text-body border border-line-strong rounded-full px-3.5 py-1.5">
          {tag}
        </span>
      ))}
    </div>
  );

  const ordering: AccordionItem[] = [
    {
      id: 'fit',
      title: t('home.ordFitTitle'),
      body: (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <p className="text-body max-w-[44ch]">{t('home.ordFitBody')}</p>
          <div className="md:justify-self-end">
            <button type="button" className="pill" onClick={onOpenAIFit}>
              {t('menu.fit')}
            </button>
            {tags(sizesOffered)}
          </div>
        </div>
      ),
    },
    {
      id: 'cod',
      title: t('home.ordCodTitle'),
      body: <p className="text-body max-w-[44ch]">{t('home.ordCodBody')}</p>,
    },
    {
      id: 'exchange',
      title: t('home.ordExchangeTitle'),
      body: <p className="text-body max-w-[44ch]">{t('footer.pillar3Desc')}</p>,
    },
    {
      id: 'delivery',
      title: t('home.ordDeliveryTitle'),
      body: (
        <p className="text-body max-w-[44ch]">
          {t('home.ordDeliveryBody', { amount: formatPrice(settings.freeShippingThreshold) })}
        </p>
      ),
    },
  ];

  return (
    <div>
      <SEOHead
        title={t('home.seoTitle')}
        description={t('home.seoDesc')}
        ogImage="/src/assets/images/lifestyle_rooftop_sunset.webp"
      />

      <HeroSpecSheet
        products={products}
        title={SiteContentService.pick(siteContent, 'heroTitle', isArabic, t('home.heroTitle'))}
        subtitle={SiteContentService.pick(siteContent, 'heroSubtitle', isArabic, t('home.heroDesc'))}
        ctaLabel={t('home.heroCta')}
        onShop={() => onNavigate('shop')}
        onOpenFit={onOpenAIFit}
        onSelectProduct={onSelectProduct}
      />

      <PixelStrip from="hero-split" to="night" />

      <div ref={scopeRef}>
        <TheTwo products={products} onSelectProduct={onSelectProduct} />

        <PixelStrip from="night" to="bone" />

        <BuiltPlain />

        <div data-surface="night">
          <Marquee words={t('home.marquee').split('|')} />
        </div>

        <PixelStrip from="night" to="bone" />

        {/* Fit & ordering */}
        <section data-surface="bone" className="gutter section">
          <h2 key={`reveal-1-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg mb-12" data-reveal-lines>
            {t('home.ordTitle')} <span className="text-accent">{t('home.ordTitleAccent')}</span>
          </h2>
          <Accordion items={ordering} />
        </section>

        {/* Closing call to the shop */}
        <section data-surface="bone" className="gutter section pt-0 flex flex-col items-center text-center">
          <h2 key={`reveal-3-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg max-w-[18ch]" data-reveal-lines>
            {t('home.readyTitle')} <span className="text-accent">{t('home.readyTitleAccent')}</span>
          </h2>
          <button type="button" onClick={() => onNavigate('shop')} className="pill pill--accent mt-10">
            <span>{t('home.readyCta')}</span>
            <ArrowRight className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </button>
        </section>

        <PixelStrip from="bone" to="night" />

        {/* Verified customer reviews */}
        {reviewsError && publishedReviews.length === 0 && (
          <section data-surface="night" className="gutter py-10">
            <p role="alert" className="text-body">
              {isArabic ? 'تعذر تحميل التقييمات. أعد تحميل الصفحة للمحاولة مرة أخرى.' : 'Reviews could not be loaded. Reload the page to try again.'}
            </p>
          </section>
        )}
        {publishedReviews.length > 0 && (
          <section data-surface="night" className="gutter section">
            <h2 key={`reveal-2-${isArabic ? 'ar' : 'en'}`} className="t-section text-fg mb-10" data-reveal-lines>
              {isArabic ? 'ما يقوله من يرتدون' : 'What wearers'}{' '}
              <span className="text-accent">{isArabic ? 'روت لاند' : 'say'}</span>
            </h2>
            <div className="border-b border-line">
              {publishedReviews.map((review) => (
                <article
                  key={review.id}
                  data-reveal
                  className="grid gap-4 py-8 border-t border-line md:grid-cols-[48px_minmax(0,2fr)_minmax(0,1fr)]"
                >
                  <span className="t-counter text-accent" aria-label={`${review.rating}/5`}>
                    {'★'.repeat(review.rating)}
                  </span>
                  <div>
                    {review.title && <h3 className="t-title text-fg mb-3">&ldquo;{review.title}&rdquo;</h3>}
                    <p className="text-body max-w-[60ch]">{review.comment}</p>
                  </div>
                  <div className="text-sm text-mut md:text-end space-y-1">
                    <div className="text-fg">{review.authorName}</div>
                    {review.location && <div>{review.location}</div>}
                    <div>
                      {review.sizePurchased && <>{isArabic ? `مقاس ${review.sizePurchased}` : `Size ${review.sizePurchased}`} · </>}
                      {isArabic ? FIT_VOTE_AR[review.fitVote] : review.fitVote}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

