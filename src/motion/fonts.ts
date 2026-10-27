/**
 * Brand faces must be ready before the app paints: RootLand ships no fallback
 * font, so a missing face is surfaced as an error instead of being replaced by
 * an operating-system font.
 */
const SAMPLE = 'RootLand 0123456789 روت لاند';

export const BRAND_FACES = [
  '400 16px "Switzer"',
  '500 16px "Switzer"',
  '600 16px "Switzer"',
  '700 16px "Switzer"',
  '400 16px "Readex Pro"',
  '500 16px "Readex Pro"',
  '600 16px "Readex Pro"',
  '700 16px "Readex Pro"',
] as const;

export async function loadBrandFonts(): Promise<void> {
  const loaded = await Promise.all(BRAND_FACES.map((face) => document.fonts.load(face, SAMPLE)));
  const missing = BRAND_FACES.filter((_, i) => loaded[i].length === 0);
  if (missing.length > 0) {
    throw new Error(`Brand fonts failed to load: ${missing.join(', ')}`);
  }
}
