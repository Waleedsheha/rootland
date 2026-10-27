import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: 'website' | 'product';
  productData?: {
    price: number;
    currency: string;
    inStock: boolean;
  };
}

const DEFAULT_TITLE_EN = 'ROOTLAND — Unisex · Made in Egypt · Essential Plain Hoodies';
const DEFAULT_DESC_EN =
  'Honest unisex essentials crafted in Egypt. Essential oversized plain hoodies in soft, substantial fleece (70% Egyptian cotton, 30% polyester).';

const DEFAULT_TITLE_AR = 'روت لاند | هوديز سادة أساسية للجنسين · صنع في مصر';
const DEFAULT_DESC_AR =
  'أساسيات يومية مريحة للجنسين صُنعت بصدق في مصر. قماش فليس ناعم وعملي من 70% قطن مصري و30% بوليستر.';

const DEFAULT_IMAGE = 'https://rootland.store/src/assets/images/lifestyle_rooftop_sunset.webp';
const BASE_URL = 'https://rootland.store';

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  ogImage,
  ogType = 'website',
  productData,
}) => {
  const location = useLocation();
  const { lang, isArabic } = useLanguage();

  useEffect(() => {
    const brandSuffix = isArabic ? 'روت لاند' : 'ROOTLAND';
    const defaultTitle = isArabic ? DEFAULT_TITLE_AR : DEFAULT_TITLE_EN;
    const defaultDesc = isArabic ? DEFAULT_DESC_AR : DEFAULT_DESC_EN;

    const finalTitle = title ? `${title} | ${brandSuffix}` : defaultTitle;
    const finalDesc = description || defaultDesc;
    const finalImage = ogImage?.startsWith('http')
      ? ogImage
      : ogImage
      ? `${BASE_URL}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`
      : DEFAULT_IMAGE;
    const canonical = `${BASE_URL}${location.pathname === '/' ? '' : location.pathname}`;

    // 1. Update Title
    document.title = finalTitle;

    // Helper to set or create meta
    const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      let el = document.querySelector(`meta[${attribute}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attribute, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Standard Meta
    setMeta('name', 'description', finalDesc);

    // 3. Canonical Link
    let canonEl = document.querySelector('link[rel="canonical"]');
    if (!canonEl) {
      canonEl = document.createElement('link');
      canonEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonEl);
    }
    canonEl.setAttribute('href', canonical);

    // 4. OpenGraph
    setMeta('property', 'og:title', finalTitle);
    setMeta('property', 'og:description', finalDesc);
    setMeta('property', 'og:image', finalImage);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:site_name', isArabic ? 'روت لاند' : 'ROOTLAND');
    setMeta('property', 'og:locale', isArabic ? 'ar_EG' : 'en_EG');

    // 5. Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', finalTitle);
    setMeta('name', 'twitter:description', finalDesc);
    setMeta('name', 'twitter:image', finalImage);

    // 6. JSON-LD Structured Data
    let scriptEl = document.getElementById('schema-ld-json') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'schema-ld-json';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }

    if (ogType === 'product' && productData) {
      scriptEl.textContent = JSON.stringify({
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: title || (isArabic ? 'هودي روت لاند الأساسي' : 'ROOTLAND Essential Plain Hoodie'),
        image: finalImage,
        description: finalDesc,
        brand: {
          '@type': 'Brand',
          name: 'ROOTLAND',
        },
        offers: {
          '@type': 'Offer',
          priceCurrency: productData.currency,
          price: productData.price,
          availability: productData.inStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url: canonical,
          seller: {
            '@type': 'Organization',
            name: isArabic ? 'مشغل روت لاند مصر' : 'ROOTLAND Egypt Atelier',
          },
        },
      });
    } else {
      scriptEl.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'ROOTLAND',
        url: BASE_URL,
        logo: `${BASE_URL}/src/assets/images/hero_hoodie_campaign_man.webp`,
        description: defaultDesc,
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'EG',
          addressLocality: 'Cairo',
        },
      });
    }
  }, [title, description, ogImage, ogType, location.pathname, productData, lang, isArabic]);

  return null;
};
