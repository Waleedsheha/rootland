import React, { useEffect, useState } from 'react';
import { Product, ProductVariant } from '../../types';
import { DataService } from '../../services/dataService';
import { useToast } from '../../components/Toast';
import { unitsInStock } from '../../utils/productText';
import { Badge, Section, Empty, adminError, fieldClass, thClass, tdClass } from './ui';

/** Live stock per size. Orders take stock automatically; set the count here after a delivery from the workshop or a recount. */
export const InventoryTab: React.FC<{ products: Product[] }> = ({ products }) => (
  <div className="space-y-6">
    {products.length === 0 && (
      <div className="rounded-2xl border border-fg/10 bg-bg-2">
        <Empty>No products in the catalogue.</Empty>
      </div>
    )}
    {products.map((p) => (
      <Section key={p.id} title={p.nameEn || p.name} description={`${unitsInStock(p)} pieces in stock`} flush>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fg/10">
                <th className={`${thClass} text-start`}>Colour</th>
                <th className={`${thClass} text-start`}>Size</th>
                <th className={`${thClass} text-start`}>SKU</th>
                <th className={`${thClass} text-end`}>In stock</th>
                <th className={`${thClass} text-end`}>Set to</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fg/10">
              {p.variants.map((v) => (
                <StockRow key={v.id} variant={v} />
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    ))}
  </div>
);

const StockRow: React.FC<{ variant: ProductVariant }> = ({ variant }) => {
  const { showToast } = useToast();
  const [value, setValue] = useState(String(variant.stockCount));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Follow live changes (orders, other staff) while this row is not being edited.
  useEffect(() => {
    if (!dirty) setValue(String(variant.stockCount));
  }, [variant.stockCount, dirty]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = Number(value);
    if (!Number.isInteger(next) || next < 0 || next > 100000) {
      showToast('Check the number', 'Stock must be a whole number from 0 to 100000.', 'error');
      return;
    }
    setSaving(true);
    try {
      await DataService.setVariantStock(variant.id, next);
      setDirty(false);
      showToast('Stock saved', `${variant.colorName} ${variant.size}: ${next}`, 'success');
    } catch (err) {
      showToast('Could not save stock', adminError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="align-middle transition-colors duration-200 hover:bg-fg/[0.03]">
      <td className={tdClass}>
        <span className="flex items-center gap-2.5 text-fg">
          <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full border border-fg/25" style={{ backgroundColor: variant.colorHex }} />
          {variant.colorName}
        </span>
      </td>
      <td className={`${tdClass} font-semibold text-fg`}>{variant.size}</td>
      <td className={`${tdClass} whitespace-nowrap text-mut`}>{variant.sku}</td>
      <td className={`${tdClass} text-end tabular-nums`}>
        {variant.stockCount === 0 ? (
          <Badge tone="err">Sold out</Badge>
        ) : variant.stockCount <= 3 ? (
          <Badge tone="warn">{variant.stockCount} left</Badge>
        ) : (
          <span className="font-medium text-fg">{variant.stockCount}</span>
        )}
      </td>
      <td className={tdClass}>
        <form onSubmit={handleSave} className="flex items-center justify-end gap-2">
          <input
            type="number"
            min={0}
            max={100000}
            step={1}
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setDirty(true);
            }}
            aria-label={`New stock for ${variant.colorName} ${variant.size}`}
            className={`${fieldClass} !w-24 !py-1.5 text-end tabular-nums`}
          />
          <button type="submit" disabled={!dirty || saving} className="pill pill--sm">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </td>
    </tr>
  );
};
