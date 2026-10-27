import { Product } from '../types';
import { DataService } from './dataService';

export interface ProductFilterOptions {
  category?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sortBy?: 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'rating';
  searchQuery?: string;
}

export class ProductService {
  /** Active products from Supabase, filtered and sorted for search and listing screens. */
  public static async getProducts(filters?: ProductFilterOptions): Promise<Product[]> {
    let result = await DataService.fetchProducts();
    if (!filters) return result;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.nameArabic.includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.colors.some((c) => c.name.toLowerCase().includes(q))
      );
    }

    if (filters.size) {
      result = result.filter((p) => p.sizes.includes(filters.size as any));
    }

    if (filters.color) {
      const cQuery = filters.color.toLowerCase();
      result = result.filter((p) => p.colors.some((c) => c.name.toLowerCase() === cQuery));
    }

    if (filters.minPrice !== undefined) {
      result = result.filter((p) => (p.salePrice || p.price) >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      result = result.filter((p) => (p.salePrice || p.price) <= filters.maxPrice!);
    }

    if (filters.inStockOnly) {
      result = result.filter((p) => p.variants.some((v) => v.inStock && v.stockCount > 0));
    }

    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'price-asc':
          result.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
          break;
        case 'price-desc':
          result.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
          break;
        case 'newest':
          result.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
          break;
        case 'rating':
          result.sort((a, b) => b.rating - a.rating);
          break;
        case 'featured':
        default:
          result.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
          break;
      }
    }

    return result;
  }

  public static async getProductBySlug(slug: string): Promise<Product | undefined> {
    const all = await this.getProducts();
    return all.find((p) => p.slug === slug || p.id === slug);
  }

  public static async getProductById(id: string): Promise<Product | undefined> {
    const all = await this.getProducts();
    return all.find((p) => p.id === id);
  }
}
