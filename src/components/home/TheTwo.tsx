import { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { ProductCard } from '../ProductCard';

interface TheTwoProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

/** The collection as two cards, the same cards the shop page uses. */
export function TheTwo({ products, onSelectProduct }: TheTwoProps) {
  const { t, isArabic } = useLanguage();

  return (
    <section data-surface="night" className="gutter section" aria-labelledby="the-two-title">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
        <div>
          <h2 key={`reveal-1-${isArabic ? 'ar' : 'en'}`} id="the-two-title" className="t-section text-fg" data-reveal-lines>
            {t('home.twoTitle')} <span className="text-accent">{t('home.twoTitleAccent')}</span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-14">
        {products.map((product) => (
          <div key={product.id} data-reveal>
            <ProductCard product={product} onSelect={onSelectProduct} />
          </div>
        ))}
      </div>
    </section>
  );
}
