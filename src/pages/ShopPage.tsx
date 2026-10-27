import React, { useState, useMemo, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import { useLanguage } from '../context/LanguageContext';
import { useScrollReveals } from '../motion/reveal';

interface ShopPageProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onOpenAIFit: () => void;
  initialFilter?: string;
  isArabic?: boolean;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  products,
  onSelectProduct,
  onOpenAIFit,
  initialFilter,
}) => {
  const { t, isArabic } = useLanguage();
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [selectedFit, setSelectedFit] = useState<string>(initialFilter || 'all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');
  const scopeRef = useRef<HTMLDivElement>(null);

  // Extract available colors dynamically
  const availableColors = useMemo(() => {
    const colorSet = new Set<string>();
    products.forEach((p) => p.colors.forEach((c) => colorSet.add(c.name)));
    return Array.from(colorSet);
  }, [products]);

  // Filter and sort items
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedSize !== 'all') {
      list = list.filter((p) => p.sizes.includes(selectedSize as any));
    }

    if (selectedColor !== 'all') {
      list = list.filter((p) => p.colors.some((c) => c.name === selectedColor));
    }

    if (selectedFit !== 'all') {
      if (selectedFit === 'oversized') {
        list = list.filter((p) => p.slug.includes('essential') || p.tags.includes('Oversized'));
      }
    }

    if (inStockOnly) {
      list = list.filter((p) => p.variants.some((v) => v.inStock));
    }

    switch (sortBy) {
      case 'price-asc':
        list.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
        break;
      case 'price-desc':
        list.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
        break;
      case 'newest':
        list.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
        break;
      case 'featured':
      default:
        list.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
        break;
    }

    return list;
  }, [products, selectedSize, selectedColor, selectedFit, inStockOnly, sortBy]);

  const handleResetFilters = () => {
    setSelectedSize('all');
    setSelectedColor('all');
    setSelectedFit('all');
    setInStockOnly(false);
    setSortBy('featured');
  };

  useScrollReveals(scopeRef, [isArabic]);

  const hasActiveFilters =
    selectedSize !== 'all' ||
    selectedColor !== 'all' ||
    selectedFit !== 'all' ||
    inStockOnly;

  const chip = (active: boolean) =>
    `pill pill--sm shrink-0 ${active ? '!bg-fg !text-bg !border-fg' : ''}`;

  return (
    <div className="gutter pb-[clamp(60px,10vh,110px)]" ref={scopeRef}>
      <SEOHead
        title={t('shop.seoTitle')}
        description={t('shop.seoDesc')}
        ogImage="/src/assets/images/lifestyle_rooftop_sunset.webp"
      />

      {/* Header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between pb-10">
        <div>
          <h1 key={`reveal-1-${isArabic ? 'ar' : 'en'}`} className="t-hero text-fg" data-reveal-lines>
            {t('shop.title')}
          </h1>
          <p className="t-blurb text-mut mt-5 max-w-[46ch]" data-reveal>
            {t('shop.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="t-counter text-mut">
            {String(filteredProducts.length).padStart(2, '0')} / {String(products.length).padStart(2, '0')}
          </span>
          <button type="button" onClick={onOpenAIFit} className="pill pill--sm">
            {t('nav.aiFit')}
          </button>
        </div>
      </header>

      {/* Filter bar */}
      <div
        className="flex items-center gap-2 overflow-x-auto border-y border-line py-4 mb-10 [scrollbar-width:none]"
        role="toolbar"
        aria-label={t('shop.refine')}
      >
        <span className="t-label text-mut shrink-0 pe-1">{t('shop.sizeTitle')}</span>
        {['all', 'L', 'XL', 'XXL'].map((sz) => (
          <button key={sz} type="button" aria-pressed={selectedSize === sz} onClick={() => setSelectedSize(sz)} className={chip(selectedSize === sz)}>
            {sz === 'all' ? t('common.all') : sz}
          </button>
        ))}
        <span className="w-px h-6 bg-line shrink-0 mx-2" aria-hidden="true" />
        <span className="t-label text-mut shrink-0 pe-1">{t('shop.colorTitle')}</span>
        <button type="button" aria-pressed={selectedColor === 'all'} onClick={() => setSelectedColor('all')} className={chip(selectedColor === 'all')}>
          {t('shop.colorAll')}
        </button>
        {availableColors.map((c) => {
          const colorLabel = isArabic ? (c === 'Black' ? 'أسود' : c === 'White-Grey' ? 'رمادي فاتح' : c) : c;
          return (
            <button key={c} type="button" aria-pressed={selectedColor === c} onClick={() => setSelectedColor(c)} className={chip(selectedColor === c)}>
              {colorLabel}
            </button>
          );
        })}
        <span className="w-px h-6 bg-line shrink-0 mx-2" aria-hidden="true" />
        <button type="button" aria-pressed={inStockOnly} onClick={() => setInStockOnly(!inStockOnly)} className={chip(inStockOnly)}>
          {t('shop.inStockOnly')}
        </button>
        <label className="pill pill--sm shrink-0 ms-auto gap-2">
          <span className="text-mut">{t('shop.sortBy')}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="featured">{t('shop.sortFeatured')}</option>
            <option value="newest">{t('shop.sortNewest')}</option>
            <option value="price-asc">{t('shop.sortPriceAsc')}</option>
            <option value="price-desc">{t('shop.sortPriceDesc')}</option>
          </select>
        </label>
        {hasActiveFilters && (
          <button type="button" onClick={handleResetFilters} className="pill pill--sm shrink-0">
            <RotateCcw className="w-3 h-3" />
            {t('shop.reset')}
          </button>
        )}
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="border-t border-line py-20 text-center space-y-4">
          <h2 className="t-title text-fg">{t('shop.emptyTitle')}</h2>
          <p className="text-mut max-w-sm mx-auto">{t('shop.emptyDesc')}</p>
          <button type="button" onClick={handleResetFilters} className="pill">
            {t('shop.reset')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-14">
          {filteredProducts.map((p) => (
            <div key={p.id} data-reveal>
              <ProductCard product={p} onSelect={onSelectProduct} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
