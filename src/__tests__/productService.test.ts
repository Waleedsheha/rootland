import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tests must never reach the production database: any use of the Supabase client throws.
vi.mock('../lib/supabase', () => ({
  supabase: new Proxy(
    {},
    {
      get: () => {
        throw new Error('Tests must not reach the database');
      },
    }
  ),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

import { ProductService } from '../services/productService';
import { DataService } from '../services/dataService';
import { INITIAL_PRODUCTS } from '../data/products';

describe('ProductService (launch catalogue from src/data/products.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(DataService, 'fetchProducts').mockImplementation(async () => structuredClone(INITIAL_PRODUCTS));
  });

  it('returns the 2 launch hoodies when no filters are applied', async () => {
    const products = await ProductService.getProducts();
    expect(products).toHaveLength(2);
    expect(products.map((p) => p.price).sort((a, b) => a - b)).toEqual([999, 1250]);
  });

  it('only offers sizes L, XL and XXL', async () => {
    const products = await ProductService.getProducts();
    for (const p of products) {
      expect(p.sizes).toEqual(['L', 'XL', 'XXL']);
      expect(p.variants.map((v) => v.size)).toEqual(['L', 'XL', 'XXL']);
    }
  });

  it('sorts hoodies by price ascending and descending', async () => {
    const asc = (await ProductService.getProducts({ sortBy: 'price-asc' })).map((p) => p.salePrice || p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = (await ProductService.getProducts({ sortBy: 'price-desc' })).map((p) => p.salePrice || p.price);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it('never claims a GSM weight or 100% cotton in product copy', async () => {
    const products = await ProductService.getProducts();
    const text = JSON.stringify(products);
    expect(text).not.toMatch(/\b(480|500|520)\s?GSM/i);
    expect(text).not.toMatch(/100%\s*(Giza|Egyptian|cotton)/i);
    expect(text).toMatch(/70% Egyptian cotton, 30% polyester/);
  });
});
