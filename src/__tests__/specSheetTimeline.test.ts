import { describe, it, expect } from 'vitest';
import {
  specSheetState,
  phoneSpecSheetState,
  BLACK_RATIO,
  WHITE_RATIO,
  END_W,
  FRAME_W,
  type ChestWidths,
} from '../film/specSheetTimeline';

const CHEST: ChestWidths = [64, 68, 72];

describe('spec sheet choreography (desktop)', () => {
  it('sweeps bone across the frame, then brings night back to the middle', () => {
    expect(specSheetState(0, CHEST).seam).toBe(0);
    expect(specSheetState(0.2, CHEST).seam).toBe(FRAME_W);
    expect(specSheetState(0.6, CHEST).seam).toBe(FRAME_W / 2);
    expect(specSheetState(1, CHEST).seam).toBe(FRAME_W / 2);
  });

  it('steps L → XL → XXL and scales by garment chest width', () => {
    expect(specSheetState(0.5, CHEST).sizeIndex).toBe(0);
    expect(specSheetState(0.66, CHEST).sizeIndex).toBe(1);
    expect(specSheetState(0.75, CHEST).sizeIndex).toBe(2);
    expect(specSheetState(0.5, CHEST).sizeScale).toBe(1);
    expect(specSheetState(0.66, CHEST).sizeScale).toBeCloseTo(68 / 64);
    expect(specSheetState(0.75, CHEST).sizeScale).toBeCloseTo(72 / 64);
  });

  it('does not scale anything when the product has no garment measurements', () => {
    expect(specSheetState(0.75, null).sizeScale).toBe(1);
  });

  it('keeps the off-white on night and the black on bone once night is back', () => {
    for (let p = 0.56; p <= 1; p += 0.01) {
      const s = specSheetState(p, CHEST);
      expect(s.white.x - s.white.width / 2).toBeGreaterThanOrEqual(s.seam);
      expect(s.black.x + s.black.width / 2).toBeLessThanOrEqual(s.seam);
    }
  });

  it('draws length, chest and sleeve in order, and fades them before the labels', () => {
    const at = (p: number) => specSheetState(p, CHEST).dims;
    expect(at(0.27).length.line).toBe(0);
    expect(at(0.33).length.line).toBe(1);
    expect(at(0.33).chest.line).toBeLessThan(1);
    expect(at(0.42).sleeve.line).toBe(1);
    expect(at(0.5).length.labelOpacity).toBe(1);
    expect(at(0.78).opacity).toBe(0);
    expect(specSheetState(0.8, CHEST).labels).toBe(1);
  });

  it('ends with both hoodies side by side above the headline', () => {
    const s = specSheetState(1, CHEST);
    expect(s.headline).toBe(1);
    expect(s.labels).toBe(0);
    expect(s.black).toMatchObject({ x: 320, y: 240, width: END_W });
    expect(s.white).toMatchObject({ x: 960, y: 240, width: END_W });
    expect(specSheetState(0.85, CHEST).headline).toBe(0);
  });
});

describe('spec sheet choreography (phones)', () => {
  const W = 390;
  // Measured heights of the headline block (with its 6vh padding) and the size row at 390 px wide.
  const HEADLINE = 420;
  const STEPPER = 60;

  for (const H of [664, 844]) {
    it(`sweeps bone down and brings night back to the middle at H = ${H}`, () => {
      expect(phoneSpecSheetState(0, W, H, HEADLINE, STEPPER, CHEST).seam).toBe(0);
      expect(phoneSpecSheetState(0.3, W, H, HEADLINE, STEPPER, CHEST).seam).toBe(H);
      expect(phoneSpecSheetState(0.6, W, H, HEADLINE, STEPPER, CHEST).seam).toBe(Math.round(H / 2));
    });

    it(`ends with both hoodies in frame, clear of the headline, at H = ${H}`, () => {
      const s = phoneSpecSheetState(1, W, H, HEADLINE, STEPPER, CHEST);
      const blackH = s.black.width / BLACK_RATIO;
      const whiteH = s.white.width / WHITE_RATIO;
      const blackTop = s.black.y - blackH / 2;
      const blackBottom = s.black.y + blackH / 2;
      const whiteTop = s.white.y - whiteH / 2;
      const whiteBottom = s.white.y + whiteH / 2;
      expect(s.headline).toBe(1);
      expect(blackTop).toBeGreaterThan(0);
      expect(blackBottom).toBeLessThanOrEqual(s.seam);
      expect(whiteTop).toBeGreaterThanOrEqual(s.seam);
      expect(whiteBottom).toBeLessThan(H - HEADLINE);
    });
  }

  it('shrinks the end state on a short screen and caps it on a tall one', () => {
    const short = phoneSpecSheetState(1, W, 664, HEADLINE, STEPPER, CHEST);
    const tall = phoneSpecSheetState(1, W, 844, HEADLINE, STEPPER, CHEST);
    expect(short.black.width / BLACK_RATIO).toBeCloseTo(93, 0);
    expect(tall.black.width / BLACK_RATIO).toBeCloseTo(250 / BLACK_RATIO);
  });

  it('returns the hoodies to their own size while the size row fades', () => {
    const xxl = phoneSpecSheetState(0.73, W, 664, HEADLINE, STEPPER, CHEST);
    const after = phoneSpecSheetState(0.8, W, 664, HEADLINE, STEPPER, CHEST);
    expect(xxl.white.width).toBeCloseTo(230 * (72 / 64));
    expect(after.white.width).toBeCloseTo(230);
  });
});
