/**
 * 360° turns of the hoodies: transparent WebP frames in public/spin/<colour>/<width>/<nnn>.webp
 * (frame 001 faces front). Made from the 1529×2048 renders at 480, 720 and 960 px wide
 * (WebP quality 80 with lossless alpha: lossy alpha made the outlines jagged and speckled).
 */
export interface SpinSet {
  /** Folder under public/, e.g. "/spin/black" */
  base: string;
  frames: number;
  /** Frame size in the source renders (sets the aspect ratio) */
  width: number;
  height: number;
  /** Widths available in the folder, smallest first */
  sizes: readonly number[];
  /** Backdrop the cut-out sits on: the black hoodie on bone, the off-white on night (as in the home hero) */
  stage: 'bone' | 'night';
}

const SIZES = [480, 720, 960] as const;

/** By product slug. */
export const PRODUCT_SPINS: Record<string, SpinSet> = {
  'rootland-essential-hoodie-black': { base: '/spin/black', frames: 90, width: 1529, height: 2048, sizes: SIZES, stage: 'bone' },
  'rootland-essential-hoodie-whitegrey': { base: '/spin/white', frames: 90, width: 1529, height: 2048, sizes: SIZES, stage: 'night' },
};
