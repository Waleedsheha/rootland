import React from 'react';
import { Product } from '../types';

export const FALLBACK_PRODUCT_IMAGE = '/src/assets/images/hoodie_essential_black.webp';

/**
 * Normalizes any image path, ensuring legacy .jpg references are converted to .webp,
 * and empty/missing paths fallback to the primary garment asset.
 */
export function normalizeImagePath(path?: string | null): string {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return FALLBACK_PRODUCT_IMAGE;
  }

  const trimmed = path.trim();

  // Convert old .jpg extensions for known atelier assets to .webp
  if (trimmed.endsWith('.jpg')) {
    return trimmed.replace(/\.jpg$/, '.webp');
  }

  return trimmed;
}

/**
 * Robust image error handler to prevent empty broken boxes.
 * Sets the image element src to the fallback image.
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback: string = FALLBACK_PRODUCT_IMAGE
): void {
  const target = event.currentTarget;
  if (!target) return;

  // Prevent infinite loops if fallback also triggers an error
  if (!target.dataset.hasFallenBack) {
    target.dataset.hasFallenBack = 'true';
    target.src = fallback;
  }
}

/**
 * Sanitizes a product object to ensure all image URLs (primary, secondary, gallery)
 * point to existing WebP files and never missing/null paths.
 */
export function sanitizeProduct(product: Product): Product {
  if (!product) return product;

  return {
    ...product,
    primaryImage: normalizeImagePath(product.primaryImage),
    secondaryImage: product.secondaryImage
      ? normalizeImagePath(product.secondaryImage)
      : normalizeImagePath(product.primaryImage),
    gallery: Array.isArray(product.gallery) && product.gallery.length > 0
      ? product.gallery.map(normalizeImagePath)
      : [normalizeImagePath(product.primaryImage)],
  };
}
