import { Product } from '../types';

/** Product name in the active language (same field resolution the product card and page use). */
export function productName(product: Product, isArabic: boolean): string {
  return isArabic ? (product.nameAr || product.nameArabic) : (product.nameEn || product.name);
}

/** Colour name of a product colour entry in the active language. */
export function colourName(colour: Product['colors'][number], isArabic: boolean): string {
  return isArabic ? (colour.nameAr || colour.name) : (colour.nameEn || colour.name);
}

/** Price the customer pays right now. */
export function activePrice(product: Product): number {
  return product.salePrice && product.salePrice < product.price ? product.salePrice : product.price;
}

/** Total units in stock across every variant. */
export function unitsInStock(product: Product): number {
  return product.variants.reduce((sum, v) => sum + (v.inStock ? v.stockCount : 0), 0);
}
