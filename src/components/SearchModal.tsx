import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { Product } from '../types';
import { ProductService } from '../services/productService';
import { useLanguage } from '../context/LanguageContext';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onViewAllResults: (query: string) => void;
  isArabic?: boolean;
}

/** Search as a night sheet from the top: one large field, popular searches, then the matching hoodies. */
export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onViewAllResults,
}) => {
  const { t, formatPrice, isArabic } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    const runSearch = async () => {
      if (query.trim().length === 0) {
        const all = await ProductService.getProducts();
        setResults(all.slice(0, 3));
      } else {
        const filtered = await ProductService.getProducts({ searchQuery: query });
        setResults(filtered);
      }
    };
    runSearch();
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      onViewAllResults(query);
      onClose();
    }
  };

  const quickSearchTags = isArabic
    ? ['هودي روت لاند', 'أسود', 'أبيض', 'أوفر سايز', 'قطن مصري']
    : ['RootLand Hoodie', 'Black', 'White', 'Oversized', 'Egyptian Cotton'];

  return (
    <div className="fixed inset-0 z-[105] flex items-start justify-center">
      <div className="popup-scrim fixed inset-0 bg-night/85 cursor-pointer" onClick={onClose} />

      <div
        data-surface="night"
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-label={t('search.placeholder')}
        className="popup-panel relative z-10 w-full border-b border-line"
      >
        <div className="gutter mx-auto max-w-[1180px] pb-8 pt-6 sm:pb-10 sm:pt-10">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-fg transition-colors hover:border-fg cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="group relative mt-4">
            <Search className="pointer-events-none absolute start-0 top-1/2 h-6 w-6 -translate-y-1/2 text-mut" aria-hidden="true" />
            <input
              type="search"
              autoFocus
              placeholder={t('search.placeholder')}
              aria-label={t('search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="field-line w-full rounded-none border-0 border-b border-line-strong bg-transparent py-4 pe-12 ps-11 font-display text-[clamp(28px,4.4vw,56px)] font-semibold leading-none tracking-[-0.03em] text-fg placeholder:text-mut focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute end-0 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-mut transition-colors hover:text-fg cursor-pointer"
                aria-label={t('common.delete')}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left scale-x-0 bg-clay transition-transform duration-500 ease-out-rl group-focus-within:scale-x-100 rtl:origin-right"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="me-2 text-sm text-mut">{t('search.quickSearches')}</span>
            {quickSearchTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                className="rounded-full border border-line px-4 py-1.5 text-sm text-fg transition-colors hover:border-fg cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="mt-8 max-h-[min(46vh,460px)] overflow-y-auto border-t border-line">
            {results.length === 0 ? (
              <p className="py-10 text-body">{t('search.noResults', { query })}</p>
            ) : (
              <ul>
                {results.map((product) => {
                  const prodName = isArabic ? (product.nameAr || product.nameArabic) : (product.nameEn || product.name);
                  const colours = product.colors.map((c) => (isArabic ? (c.nameAr || c.name) : (c.nameEn || c.name))).join(' · ');
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProduct(product);
                          onClose();
                        }}
                        className="group flex w-full items-center gap-5 border-b border-line py-4 text-start cursor-pointer"
                      >
                        <span className="h-20 w-16 shrink-0 overflow-hidden bg-night-2">
                          <img src={product.primaryImage} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-[20px] font-semibold leading-tight tracking-[-0.02em] text-fg">
                            {prodName}
                          </span>
                          <span className="mt-1 block text-sm text-mut">{colours}</span>
                        </span>
                        <span className="t-counter shrink-0 text-fg">{formatPrice(product.salePrice || product.price)}</span>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-mut transition-transform duration-300 group-hover:translate-x-1 group-hover:text-fg rtl:rotate-180 rtl:group-hover:-translate-x-1"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {query.trim().length > 0 && results.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-mut">
              <span>{t('search.pressEnter')}</span>
              <button
                type="button"
                onClick={() => {
                  onViewAllResults(query);
                  onClose();
                }}
                className="inline-flex items-center gap-2 text-fg underline underline-offset-4 cursor-pointer"
              >
                <span>{t('search.seeAll', { count: results.length })}</span>
                <CornerDownLeft className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
