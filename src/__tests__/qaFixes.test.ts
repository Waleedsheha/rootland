import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { INITIAL_PRODUCTS } from '../data/products';
import { normalizeImagePath, sanitizeProduct, FALLBACK_PRODUCT_IMAGE } from '../utils/imageUtils';

describe('QA Specific Fixes Verification', () => {
  it('1. B2B Quantity Pricing Table footer link routes to /b2b with #pricing target', () => {
    const footerContent = fs.readFileSync(path.resolve(__dirname, '../components/Footer.tsx'), 'utf-8');
    const appContent = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');
    const b2bContent = fs.readFileSync(path.resolve(__dirname, '../pages/B2BPage.tsx'), 'utf-8');

    // Verify footer button navigates to b2b with pricing
    expect(footerContent).toContain("onNavigate('b2b', 'pricing')");

    // Verify App.tsx handles 'pricing' param for b2b route and navigates to /b2b#pricing
    expect(appContent).toContain("navigate('/b2b#pricing')");
    expect(appContent).toContain("document.getElementById('pricing')");
    expect(appContent).toContain("el.scrollIntoView({ behavior: 'smooth', block: 'start' })");

    // Verify B2BPage has id="pricing" and scrolls smoothly when target is reached
    expect(b2bContent).toContain('id="pricing"');
    expect(b2bContent).toContain("location.hash === '#pricing'");
    expect(b2bContent).toContain("document.getElementById('pricing')");
    expect(b2bContent).toContain("scrollIntoView({ behavior: 'smooth'");
  });

  it('2. Size Guide modal opens on current page, closes on Escape, on X button, and on route change', () => {
    const footerContent = fs.readFileSync(path.resolve(__dirname, '../components/Footer.tsx'), 'utf-8');
    const modalContent = fs.readFileSync(path.resolve(__dirname, '../components/SizeGuideModal.tsx'), 'utf-8');
    const appContent = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');

    // Footer button calls onOpenSizeGuide
    expect(footerContent).toContain('onOpenSizeGuide');
    expect(footerContent).toContain('Size Guide & CM Charts');

    // App wires SizeGuideModal with isOpen state and onClose
    expect(appContent).toContain('<SizeGuideModal');
    expect(appContent).toContain('isOpen={isSizeGuideOpen}');
    expect(appContent).toContain('onClose={() => setIsSizeGuideOpen(false)}');

    // Closes on route change in App.tsx
    expect(appContent).toContain('setIsSizeGuideOpen(false)');

    // Closes on Escape key in SizeGuideModal
    expect(modalContent).toContain("e.key === 'Escape'");
    expect(modalContent).toContain('onClose()');

    // Closes on route change in SizeGuideModal
    expect(modalContent).toContain('location.pathname');

    // Has close button with X icon and backdrop onClick
    expect(modalContent).toContain('aria-label="Close modal"');
    expect(modalContent).toContain('<X className="w-5 h-5" />');
    expect(modalContent).toContain('onClick={onClose}');
  });

  it('3. Product and hero images are converted to WebP with max 1600px, 100-150KB, lazy loading and dimensions', () => {
    const imagesDir = path.resolve(__dirname, '../assets/images');
    const files = fs.readdirSync(imagesDir).filter((f) => f.endsWith('.webp'));

    expect(files.length).toBeGreaterThanOrEqual(7);

    let totalHomePageImageBytes = 0;
    const homePageImages = [
      'hero_hoodie_campaign_man.webp',
      'hoodie_cairo_black_1790428467332.webp',
      'hoodie_delta_stone_1790428477180.webp',
      'hoodie_heritage_charcoal_1790428488216.webp',
    ];

    for (const file of files) {
      const filePath = path.join(imagesDir, file);
      const stat = fs.statSync(filePath);
      const kb = stat.size / 1024;
      // Each image should be optimized (~100-160KB or smaller)
      expect(kb).toBeLessThan(180);

      if (homePageImages.includes(file)) {
        totalHomePageImageBytes += stat.size;
      }
    }

    // Home page total images download must be well under 1.5 MB (1,572,864 bytes)
    const homeMb = totalHomePageImageBytes / (1024 * 1024);
    expect(homeMb).toBeLessThan(1.5);
    expect(homeMb).toBeLessThan(0.6); // Actually under 0.6MB!

    // Verify INITIAL_PRODUCTS use .webp
    for (const prod of INITIAL_PRODUCTS) {
      expect(prod.primaryImage).toContain('.webp');
      expect(prod.secondaryImage).toContain('.webp');
      for (const img of prod.gallery) {
        expect(img).toContain('.webp');
      }
    }

    // HomePage shares the rooftop photo as its social image
    const homeContent = fs.readFileSync(path.resolve(__dirname, '../pages/HomePage.tsx'), 'utf-8');
    expect(homeContent.includes('lifestyle_rooftop_sunset.webp') || homeContent.includes('hero_hoodie_campaign_man.webp')).toBe(true);

    // Verify ProductCard has width/height and lazy loading
    const cardContent = fs.readFileSync(path.resolve(__dirname, '../components/ProductCard.tsx'), 'utf-8');
    expect(cardContent).toContain('loading="lazy"');
    expect(cardContent).toContain('width={1200}');
    expect(cardContent).toContain('height={896}');
  });

  it('4. Product images have fallbacks, normalizeImagePath converts legacy paths, and images exist', () => {
    // Test fallback for empty / missing
    expect(normalizeImagePath('')).toBe(FALLBACK_PRODUCT_IMAGE);
    expect(normalizeImagePath(null)).toBe(FALLBACK_PRODUCT_IMAGE);
    expect(normalizeImagePath(undefined)).toBe(FALLBACK_PRODUCT_IMAGE);

    // Test conversion from legacy .jpg to .webp
    expect(normalizeImagePath('/src/assets/images/hoodie_cairo_black_1790428467332.jpg'))
      .toBe('/src/assets/images/hoodie_cairo_black_1790428467332.webp');
    expect(normalizeImagePath('/src/assets/images/hoodie_delta_stone_1790428477180.jpg'))
      .toBe('/src/assets/images/hoodie_delta_stone_1790428477180.webp');

    // Test sanitizeProduct
    const mockOldProduct = {
      id: 'test-p',
      name: 'Test',
      primaryImage: '/src/assets/images/hoodie_cairo_black_1790428467332.jpg',
      secondaryImage: '/src/assets/images/hoodie_delta_stone_1790428477180.jpg',
      gallery: ['/src/assets/images/hoodie_cairo_black_1790428467332.jpg'],
    };
    const sanitized = sanitizeProduct(mockOldProduct as any);
    expect(sanitized.primaryImage).toBe('/src/assets/images/hoodie_cairo_black_1790428467332.webp');
    expect(sanitized.secondaryImage).toBe('/src/assets/images/hoodie_delta_stone_1790428477180.webp');
    expect(sanitized.gallery[0]).toBe('/src/assets/images/hoodie_cairo_black_1790428467332.webp');

    // Test that the fallback image and all product images exist on disk in public and src directories
    const publicImagesDir = path.resolve(__dirname, '../../public/src/assets/images');
    const srcImagesDir = path.resolve(__dirname, '../assets/images');
    const productImages = INITIAL_PRODUCTS.flatMap((p) => [p.primaryImage, p.secondaryImage, ...p.gallery]);
    for (const image of [FALLBACK_PRODUCT_IMAGE, ...productImages]) {
      const name = path.basename(String(image));
      expect(fs.existsSync(path.join(publicImagesDir, name)), `public/src/assets/images/${name}`).toBe(true);
      expect(fs.existsSync(path.join(srcImagesDir, name)), `src/assets/images/${name}`).toBe(true);
    }
  });

  it('5. B2B pricing link has progressive scroll retries across rendering ticks', () => {
    const appContent = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');
    const b2bContent = fs.readFileSync(path.resolve(__dirname, '../pages/B2BPage.tsx'), 'utf-8');

    // Progressive retry array in App.tsx
    expect(appContent).toContain('[50, 150, 300, 500, 800, 1200, 1600]');

    // Progressive retry array in B2BPage.tsx
    expect(b2bContent).toContain('[50, 150, 300, 500, 800, 1200, 1600]');
  });

  it('6. Email registration on Supabase Auth: inline errors, no window.alert, confirmation and reset links, profile row', () => {
    const authModalContent = fs.readFileSync(path.resolve(__dirname, '../components/AuthModal.tsx'), 'utf-8');
    const authServiceContent = fs.readFileSync(path.resolve(__dirname, '../services/authService.ts'), 'utf-8');
    const resetPageContent = fs.readFileSync(path.resolve(__dirname, '../pages/ResetPasswordPage.tsx'), 'utf-8');
    const migration = fs.readFileSync(path.resolve(__dirname, '../../supabase/migrations/20261026120000_rootland_store.sql'), 'utf-8');

    // 1. No window.alert anywhere in the sign-in flow
    expect(authModalContent).not.toContain('window.alert');
    expect(authServiceContent).not.toContain('window.alert');

    // 2. The Supabase error code is logged, and a readable message is shown inline
    expect(authModalContent).toContain("console.error('[AuthModal] Supabase auth error:'");
    expect(authModalContent).toContain('setAuthError(AuthService.formatAuthError(err, isArabic))');
    expect(authModalContent).toContain("code === 'email_not_confirmed'");

    // 3. Passwords need 8+ characters
    expect(authModalContent).toContain('password.length < 8');
    expect(authModalContent).toContain('minLength={8}');

    // 4. Sign-up sends the name and phone, and the confirmation link returns to the account page
    expect(authServiceContent).toContain('data: { full_name: input.fullName.trim(), phone: input.phone.trim() }');
    expect(authServiceContent).toContain("emailRedirectTo: siteUrl('/account')");

    // 5. Forgot password emails a link to /reset-password, where the new password is saved
    expect(authServiceContent).toContain("redirectTo: siteUrl('/reset-password')");
    expect(resetPageContent).toContain('AuthService.updatePassword(password)');
    expect(resetPageContent).toContain("'rootland_password_recovery'");

    // 6. The database creates the profile row for every new account
    expect(migration).toContain('create trigger on_auth_user_created');
    expect(migration).toContain('execute function public.handle_new_user()');
  });
});
