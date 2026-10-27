import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Product } from '../../types';
import { DataService } from '../../services/dataService';
import { useToast } from '../../components/Toast';
import { normalizeImagePath } from '../../utils/imageUtils';
import { activePrice, unitsInStock } from '../../utils/productText';
import { Badge, Section, Empty, Tone, adminError, egp, fieldClass, selectClass, labelClass, iconButtonClass, useConfirm } from './ui';

interface ProductsTabProps {
  products: Product[];
  productsState: 'loading' | 'ready' | 'error';
}

const STATUS_TEXT: Record<NonNullable<Product['status']>, string> = {
  active: 'On sale',
  draft: 'Draft (hidden)',
  hidden: 'Hidden',
};

const STATUS_TONE: Record<NonNullable<Product['status']>, Tone> = {
  active: 'ok',
  draft: 'neutral',
  hidden: 'warn',
};

export const ProductsTab: React.FC<ProductsTabProps> = ({ products, productsState }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = editingId ? products.find((p) => p.id === editingId) : undefined;

  if (productsState !== 'ready') return null;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
      <div className={editing ? 'hidden xl:block' : ''}>
        <Section title="Catalogue" count={products.length} flush>
          {products.length === 0 ? (
            <Empty>No products in the catalogue.</Empty>
          ) : (
            <ul className="divide-y divide-fg/10">
              {products.map((p) => {
                const status = p.status ?? 'active';
                const active = p.id === editingId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setEditingId(p.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`flex w-full items-center gap-4 px-5 py-3.5 text-start transition-colors duration-200 cursor-pointer sm:px-6 ${
                        active ? 'bg-fg/[0.06]' : 'hover:bg-fg/[0.03]'
                      }`}
                    >
                      <img src={normalizeImagePath(p.primaryImage)} alt="" className="h-16 w-14 shrink-0 rounded-lg bg-bg object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">{p.nameEn || p.name}</span>
                        <span className="mt-0.5 block text-xs text-mut">
                          {egp(activePrice(p))} · {unitsInStock(p)} in stock
                        </span>
                      </span>
                      <Badge tone={STATUS_TONE[status]}>{STATUS_TEXT[status]}</Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-fg/10 px-5 py-4 text-xs leading-relaxed text-mut sm:px-6">
            Photos ship with the website files; ask the developer to change them. Stock is set in Inventory.
          </p>
        </Section>
      </div>

      {editing ? (
        <ProductEditor key={editing.id} product={editing} onDone={() => setEditingId(null)} />
      ) : (
        <p className="hidden rounded-2xl border border-dashed border-fg/20 px-8 py-16 text-center text-sm leading-relaxed text-body xl:block">
          Choose a hoodie to edit its name, text, price or visibility.
        </p>
      )}
    </div>
  );
};

const subheadClass = 'text-sm font-semibold text-fg';
const blockClass = 'px-5 py-5 sm:px-6';

const ProductEditor: React.FC<{ product: Product; onDone: () => void }> = ({ product, onDone }) => {
  const { showToast } = useToast();
  const confirmAction = useConfirm();
  const [nameEn, setNameEn] = useState(product.nameEn || product.name);
  const [nameAr, setNameAr] = useState(product.nameAr || product.nameArabic);
  const [taglineEn, setTaglineEn] = useState(product.taglineEn || product.tagline);
  const [taglineAr, setTaglineAr] = useState(product.taglineAr ?? '');
  const [descriptionEn, setDescriptionEn] = useState(product.descriptionEn || product.description);
  const [descriptionAr, setDescriptionAr] = useState(product.descriptionAr || product.descriptionArabic || '');
  const [price, setPrice] = useState(String(product.price));
  const [salePrice, setSalePrice] = useState(product.salePrice !== undefined ? String(product.salePrice) : '');
  const [status, setStatus] = useState<NonNullable<Product['status']>>(product.status ?? 'active');
  const [isNewArrival, setIsNewArrival] = useState(Boolean(product.isNewArrival));
  const [isBestSeller, setIsBestSeller] = useState(Boolean(product.isBestSeller));
  const [isLimited, setIsLimited] = useState(Boolean(product.isLimited));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const priceValue = Number(price);
    const saleValue = salePrice.trim() === '' ? undefined : Number(salePrice);
    if (!nameEn.trim() || !nameAr.trim()) return setError('Enter the product name in English and Arabic.');
    if (!Number.isInteger(priceValue) || priceValue <= 0) return setError('The price must be a whole number of pounds above 0.');
    if (saleValue !== undefined && (!Number.isInteger(saleValue) || saleValue <= 0 || saleValue >= priceValue)) {
      return setError('The sale price must be a whole number below the price, or empty for no sale.');
    }
    if (
      status !== 'active' &&
      !(await confirmAction(`Take “${nameEn.trim()}” off the store? Customers will not see it until it is on sale again.`, 'Take it off the store'))
    ) {
      return;
    }

    setSaving(true);
    try {
      await DataService.updateProduct({
        ...product,
        name: nameEn.trim(),
        nameEn: nameEn.trim(),
        nameArabic: nameAr.trim(),
        nameAr: nameAr.trim(),
        tagline: taglineEn.trim(),
        taglineEn: taglineEn.trim(),
        taglineAr: taglineAr.trim(),
        description: descriptionEn.trim(),
        descriptionEn: descriptionEn.trim(),
        descriptionArabic: descriptionAr.trim(),
        descriptionAr: descriptionAr.trim(),
        price: priceValue,
        salePrice: saleValue,
        status,
        isNewArrival,
        isBestSeller,
        isLimited,
      });
      showToast('Product saved', nameEn.trim(), 'success');
    } catch (err) {
      setError(adminError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      noValidate
      className="rounded-2xl border border-fg/10 bg-bg-2 xl:sticky xl:top-6 xl:max-h-[calc(100svh-48px)] xl:overflow-y-auto"
    >
      <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-[-0.015em] text-fg">{product.nameEn || product.name}</h2>
          <p className="mt-1 truncate text-xs text-mut">
            {product.id} · /product/{product.slug}
          </p>
        </div>
        <button type="button" onClick={onDone} aria-label="Close the editor" className={iconButtonClass}>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="divide-y divide-fg/10 border-t border-fg/10">
        <div className={`space-y-4 ${blockClass}`}>
          <h3 className={subheadClass}>Name and text</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="p-name-en" className={labelClass}>
                Name (English)
              </label>
              <input id="p-name-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="p-name-ar" className={labelClass}>
                Name (Arabic)
              </label>
              <input id="p-name-ar" dir="rtl" lang="ar" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="p-tag-en" className={labelClass}>
                Tagline (English)
              </label>
              <input id="p-tag-en" value={taglineEn} onChange={(e) => setTaglineEn(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="p-tag-ar" className={labelClass}>
                Tagline (Arabic)
              </label>
              <input id="p-tag-ar" dir="rtl" lang="ar" value={taglineAr} onChange={(e) => setTaglineAr(e.target.value)} className={fieldClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="p-desc-en" className={labelClass}>
                Description (English)
              </label>
              <textarea id="p-desc-en" rows={4} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} className={fieldClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="p-desc-ar" className={labelClass}>
                Description (Arabic)
              </label>
              <textarea id="p-desc-ar" rows={4} dir="rtl" lang="ar" value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} className={fieldClass} />
            </div>
          </div>
        </div>

        <div className={`space-y-4 ${blockClass}`}>
          <h3 className={subheadClass}>Price and visibility</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="p-price" className={labelClass}>
                Price (EGP)
              </label>
              <input id="p-price" type="number" min={1} step={1} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="p-sale" className={labelClass}>
                Sale price (EGP, optional)
              </label>
              <input id="p-sale" type="number" min={1} step={1} inputMode="numeric" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="p-status" className={labelClass}>
                Visibility
              </label>
              <select id="p-status" value={status} onChange={(e) => setStatus(e.target.value as NonNullable<Product['status']>)} className={selectClass}>
                {(Object.keys(STATUS_TEXT) as NonNullable<Product['status']>[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_TEXT[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-mut">
            Price changes apply to new orders straight away. Bags that already hold this hoodie update to the new price, and checkout charges the price in the
            database.
          </p>
        </div>

        <fieldset className={`space-y-3 ${blockClass}`}>
          <legend className={`float-left mb-3 w-full ${subheadClass}`}>Badges and sorting</legend>
          <div className="clear-left flex flex-wrap gap-x-6 gap-y-2 text-sm text-body">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={isNewArrival} onChange={(e) => setIsNewArrival(e.target.checked)} className="accent-fg" />
              New arrival
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={isBestSeller} onChange={(e) => setIsBestSeller(e.target.checked)} className="accent-fg" />
              Best seller
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={isLimited} onChange={(e) => setIsLimited(e.target.checked)} className="accent-fg" />
              Limited run
            </label>
          </div>
          <p className="text-xs leading-relaxed text-mut">New arrival or best seller shows the launch drop badge and moves the hoodie up in those shop sorts.</p>
        </fieldset>

        <div className={`flex flex-wrap items-center justify-between gap-3 ${blockClass}`}>
          {error && (
            <p role="alert" className="text-sm text-err">
              {error}
            </p>
          )}
          <button type="submit" disabled={saving} className="pill pill--solid ms-auto">
            {saving ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </div>
    </form>
  );
};
