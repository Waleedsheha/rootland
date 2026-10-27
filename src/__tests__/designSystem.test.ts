import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { en } from '../i18n/en';
import { ar } from '../i18n/ar';

const root = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf-8');

// Generic families and operating-system stacks that would act as fallback fonts.
const GENERIC_FONT = /font-family\s*:[^;}]*\b(sans-serif|serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace|-apple-system|BlinkMacSystemFont|Arial|Helvetica|Tahoma|Georgia|Segoe UI|Roboto)\b/i;

describe('design system guards', () => {
  it('English and Arabic dictionaries carry the same keys', () => {
    const enKeys = Object.keys(en).sort();
    const arKeys = Object.keys(ar).sort();
    expect(enKeys.filter((k) => !(k in ar))).toEqual([]);
    expect(arKeys.filter((k) => !(k in en))).toEqual([]);
  });

  it('declares no fallback or generic font families in source styles', () => {
    for (const file of ['src/index.css', 'src/styles/preflight.css', 'index.html']) {
      expect(read(file)).not.toMatch(GENERIC_FONT);
    }
  });

  it('loads every brand face the stylesheet names', () => {
    const html = read('index.html');
    expect(html).toContain('switzer@400,500,600,700');
    expect(html).toContain('Readex+Pro:wght@400;500;600;700');
    expect(html).toContain('display=block');
  });

  it('ships the hero cut-outs in both image folders, as small WebP files', () => {
    for (const name of ['hoodie_cutout_black.webp', 'hoodie_cutout_offwhite.webp']) {
      for (const dir of ['src/assets/images', 'public/src/assets/images']) {
        const file = path.join(root, dir, name);
        expect(fs.existsSync(file)).toBe(true);
        expect(fs.statSync(file).size / 1024).toBeLessThan(180);
      }
    }
  });
});
