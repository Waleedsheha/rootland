import React, { useState, useEffect } from 'react';
import { Heart, ShoppingBag, Check } from 'lucide-react';
import { Product } from '../types';
import { AuthService } from '../services/authService';
import { CartService } from '../services/cartService';
import { TrackingService } from '../services/trackingService';
import { useToast } from './Toast';
import { normalizeImagePath, handleImageError, FALLBACK_PRODUCT_IMAGE } from '../utils/imageUtils';
import { useLanguage } from '../context/LanguageContext';
import { PRODUCT_SPINS } from '../data/spin';
import { HoodieSpin } from './HoodieSpin';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  isArabic?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
}) => {
  const { t, isArabic } = useLanguage();
  const { showToast } = useToast();
  const [isHovered, setIsHovered] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L' | 'XL' | 'XXL'>('L');
  const [isWishlisted, setIsWishlisted] = useState<boolean>(() =>
    AuthService.isInWishlist(product.id)
  );
  const [quickAddSuccess, setQuickAddSuccess] = useState(false);

  const selectedColor = product.colors[selectedColorIndex] || product.colors[0];
  /** Hoodies with a 360° turn show it instead of the photo. */
  const spin = PRODUCT_SPINS[product.slug];

  const rawDisplayImage =
    isHovered && product.secondaryImage ? product.secondaryImage : product.primaryImage;
  const currentDisplayImage = normalizeImagePath(rawDisplayImage);

  const [displaySrc, setDisplaySrc] = useState(currentDisplayImage);

  useEffect(() => {
    setDisplaySrc(currentDisplayImage);
  }, [currentDisplayImage]);

  const productName = isArabic ? (product.nameAr || product.nameArabic) : (product.nameEn || product.name);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    const added = AuthService.toggleWishlist(product.id);
    setIsWishlisted(added);
    showToast(
      added ? t('toast.wishlistAdded') : t('toast.wishlistRemoved'),
      productName,
      'info'
    );
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const matchingVariant = product.variants.find(
      (v) => v.colorName === selectedColor.name && v.size === selectedSize
    );

    const available = matchingVariant ? Math.max(0, matchingVariant.stockCount) : 0;
    if (!matchingVariant || available <= 0) {
      // Sold out: open the product page where the pre-order option is shown
      onSelect(product);
      return;
    }
    const alreadyInCart = CartService.getCart()
      .items.filter((i) => i.variantId === matchingVariant.id && !i.isPreorder)
      .reduce((sum, i) => sum + i.quantity, 0);
    if (alreadyInCart + 1 > available) {
      showToast(
        isArabic ? 'الكمية غير متاحة' : 'Not enough stock',
        isArabic ? `المتاح من هذا المقاس ${available} قطعة فقط.` : `Only ${available} of this size available.`,
        'error'
      );
      return;
    }

    const newItem = {
      productId: product.id,
      variantId: matchingVariant.id,
      productName: product.nameEn || product.name,
      productNameAr: product.nameAr || product.nameArabic,
      colorNameAr: selectedColor.nameAr || matchingVariant.colorArabicName,
      maxQuantity: available,
      productSlug: product.slug,
      image: normalizeImagePath(product.primaryImage),
      colorName: selectedColor.name,
      colorHex: selectedColor.hex,
      size: selectedSize,
      unitPrice: product.salePrice || product.price,
      quantity: 1,
      sku: matchingVariant.sku,
    };

    CartService.addItem(newItem);
    TrackingService.trackAddToCart({ ...newItem, id: `${newItem.productId}-${newItem.colorName}-${newItem.size}` });

    setQuickAddSuccess(true);
    showToast(t('toast.addedToBag'), `${productName} (${selectedSize})`, 'success');
    setTimeout(() => setQuickAddSuccess(false), 1600);
  };

  return (
    <div
      onClick={() => onSelect(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-cursor="view"
      className="group flex flex-col cursor-pointer"
    >
      {/* Image Container */}
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden ${
          spin ? (spin.stage === 'bone' ? 'bg-bone' : 'bg-night-2') : 'bg-ghost-ink'
        }`}
      >
        {spin ? (
          <HoodieSpin spin={spin} alt={productName} />
        ) : (
          <img
            src={displaySrc}
            alt={productName}
            width={1200}
            height={896}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              if (displaySrc !== FALLBACK_PRODUCT_IMAGE) {
                setDisplaySrc(FALLBACK_PRODUCT_IMAGE);
              }
              handleImageError(e, FALLBACK_PRODUCT_IMAGE);
            }}
            className="w-full h-full object-cover object-center transition-transform duration-[1200ms] ease-out-rl group-hover:scale-[1.04]"
          />
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? t('productCard.removeFromWishlist') : t('productCard.addToWishlist')}
          className="absolute top-3 end-3 w-10 h-10 rounded-full flex items-center justify-center bg-night text-bone hover:bg-clay hover:text-night transition-colors cursor-pointer"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-clay text-clay' : ''}`} />
        </button>

        {/* Quick Size Selection on Hover */}
        <div
          onClick={(e) => e.stopPropagation()}
          data-surface="night"
          className="absolute bottom-0 inset-x-0 p-3 flex items-center justify-between gap-2 !bg-night/90 translate-y-full group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-500 ease-rl"
        >
          <div className="flex items-center gap-1">
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSize(s)}
                aria-pressed={selectedSize === s}
                className={`t-counter min-w-9 h-8 px-2 rounded-full border transition-colors cursor-pointer ${
                  selectedSize === s ? 'border-bone bg-bone text-night' : 'border-line-strong text-bone hover:border-bone'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button onClick={handleQuickAdd} disabled={quickAddSuccess} className="pill pill--sm">
            {quickAddSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t('productCard.added')}</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{t('productCard.quickAddBag')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Product Metadata Section */}
      <div className="pt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 items-baseline">
        <h3 className="t-title text-fg">{productName}</h3>
        {/* Color Dots */}
        <div className="flex items-center gap-3 sm:gap-1.5 justify-self-end">
          {product.colors.map((c, idx) => (
            <button
              key={c.name}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedColorIndex(idx);
              }}
              className={`w-6 h-6 sm:w-3.5 sm:h-3.5 rounded-full border border-line-strong transition-transform cursor-pointer ${
                selectedColorIndex === idx ? 'ring-1 ring-offset-2 ring-offset-bg ring-fg' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c.hex }}
              title={isArabic ? (c.nameAr || c.name) : (c.nameEn || c.name)}
              aria-label={`Select color ${c.name}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
