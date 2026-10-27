/**
 * Scroll choreography for the "Spec sheet" home hero, as pure functions of scroll
 * progress p (0–1 across the pin).
 *
 * Desktop positions are in DESIGN PIXELS of a 1280×720 frame. The component maps them
 * to the viewport: x * (W / 1280), y * (H / 720), sizes * min(W / 1280, H / 720).
 *
 *  0.00–0.03  scroll hint fades
 *  0.03–0.18  bone sweeps across the whole screen; the wordmark re-inks at the seam
 *  0.13–0.26  ROOT, then LAND, lift out of their line masks
 *  0.20–0.30  the black hoodie rises onto the bone "sheet"
 *  0.28–0.42  garment length, chest and sleeve draw on (L values count up)
 *  0.44–0.56  night slides back to the 50% seam carrying the off-white;
 *             the sheet shrinks into the bone half
 *  0.54–0.58  size row appears on night
 *  0.60–0.64  → XL      0.68–0.72  → XXL   (both hoodies scale by chest width)
 *  0.74–0.78  measurements and size row fade
 *  0.76–0.87  product labels
 *  0.84–0.94  both hoodies settle above the headline
 *  0.88–0.96  headline + CTAs
 */

export const FRAME_W = 1280;
export const FRAME_H = 720;

/** Black cut-out (hoodie_cutout_black.webp) is 1111×779; off-white is 1200×812. */
export const BLACK_W = 1111;
export const BLACK_H = 779;
export const BLACK_RATIO = BLACK_W / BLACK_H;
export const WHITE_RATIO = 1200 / 812;
/** Sheet width of the black hoodie while it is measured, and the off-white's hold width. */
export const SHEET_W = 600;
export const WHITE_W = 440;
export const END_W = 370;
/** The black hoodie rises onto the sheet from this far below its place (design px). */
export const RISE_FROM = 560;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
/** power4.inOut — the site's EASE (≈ cubic-bezier(.83,0,.17,1)). */
export const quint = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);
/** power3.out — the site's EASE_OUT. */
export const out4 = (t: number) => 1 - Math.pow(1 - t, 4);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type SizeIndex = 0 | 1 | 2;
/** Garment chest width (flat, cm) of L, XL and XXL. */
export type ChestWidths = readonly [number, number, number];

export interface DimState {
  /** 0–1 dash progress of the dimension line. */
  line: number;
  /** 0–1 dash progress of the extension lines (start slightly earlier). */
  extension: number;
  /** End ticks show once the line is drawn. */
  ticks: boolean;
  labelOpacity: number;
  /** While drawing, the L value counts up; afterwards the value of the active size. */
  countUp: number;
}

export interface HoodieBox {
  /** Centre, design px. */
  x: number;
  y: number;
  /** Rendered width, design px. */
  width: number;
}

export interface SpecSheetState {
  /** Bone covers [0, seam] of the frame width (design px). Mirror for RTL. */
  seam: number;
  hint: number;
  /** Exit progress of ROOT and LAND (0 in place → 1 lifted out, translateY −105%). */
  wordmarkExit: [number, number];
  black: HoodieBox & { rise: number };
  white: HoodieBox & { visible: boolean };
  dims: { length: DimState; chest: DimState; sleeve: DimState; opacity: number };
  sizeIndex: SizeIndex;
  /** Chest width of the active size / chest width of L. */
  sizeScale: number;
  stepper: { opacity: number; rise: number };
  labels: number;
  headline: number;
}

function dim(p: number, a: number, b: number, fade: number): DimState {
  const line = easeInOut(ramp(p, a, b));
  return {
    line,
    extension: easeInOut(ramp(p, a - 0.02, a + 0.03)),
    ticks: line > 0.98,
    labelOpacity: ramp(p, b - 0.01, b + 0.02) * fade,
    countUp: line,
  };
}

/** The size beats shared by both layouts. */
function sizeBeats(p: number, chest: ChestWidths | null) {
  const toXL = quint(ramp(p, 0.6, 0.64));
  const toXXL = quint(ramp(p, 0.68, 0.72));
  const sizeIndex: SizeIndex = toXXL > 0.5 ? 2 : toXL > 0.5 ? 1 : 0;
  // Without garment measurements there is no size to step through, so nothing scales.
  const sizeScale = chest ? (chest[0] + (chest[1] - chest[0]) * toXL + (chest[2] - chest[1]) * toXXL) / chest[0] : 1;
  return { sizeIndex, sizeScale };
}

/**
 * Desktop and landscape. `chest` is the black hoodie's garment chest widths for
 * L, XL and XXL, or null when the product has none (the size beats then show nothing).
 */
export function specSheetState(progress: number, chest: ChestWidths | null): SpecSheetState {
  const p = clamp01(progress);
  const sweep = quint(ramp(p, 0.03, 0.18));
  const back = quint(ramp(p, 0.44, 0.56));
  const settle = quint(ramp(p, 0.84, 0.94));
  const { sizeIndex, sizeScale } = sizeBeats(p, chest);
  const fade = 1 - ramp(p, 0.74, 0.78);

  // The sheet: centred and measured, then it moves into the bone half.
  const sheetScale = lerp(1, 450 / SHEET_W, back) * sizeScale;
  const black = {
    x: lerp(lerp(640, 315, back), 320, settle),
    y: lerp(lerp(400, 360, back), 240, settle),
    width: lerp(SHEET_W * sheetScale, END_W, settle),
    rise: out4(ramp(p, 0.2, 0.3)),
  };

  // The off-white rides in with the night panel.
  const ride = (1 - back) * (FRAME_W / 2);
  const white = {
    x: 960 + ride,
    y: lerp(330, 240, settle),
    width: lerp(WHITE_W * sizeScale, END_W, settle),
    visible: back > 0,
  };

  return {
    seam: FRAME_W * sweep - (FRAME_W / 2) * back,
    hint: 1 - ramp(p, 0.005, 0.03),
    wordmarkExit: [quint(ramp(p, 0.13, 0.23)), quint(ramp(p, 0.16, 0.26))],
    black,
    white,
    dims: {
      length: dim(p, 0.28, 0.33, fade),
      chest: dim(p, 0.32, 0.37, fade),
      sleeve: dim(p, 0.36, 0.42, fade),
      opacity: fade,
    },
    sizeIndex,
    sizeScale,
    stepper: { opacity: ramp(p, 0.54, 0.58) * fade, rise: ramp(p, 0.54, 0.58) },
    labels: ramp(p, 0.76, 0.79) * (1 - ramp(p, 0.84, 0.87)),
    headline: ramp(p, 0.88, 0.96),
  };
}

/** Label anchor in cut-out px. `align` places the label horizontally; `edge` is the side of the label on the anchor. */
export interface DimAnchor {
  x: number;
  y: number;
  align: 'start' | 'center';
  edge: 'top' | 'bottom';
}

/**
 * Dimension geometry in black cut-out pixel space (1111×779), measured from the
 * cut-out's alpha. Render it in an SVG with viewBox "0 0 1111 779" laid exactly
 * over the image, overflow visible.
 */
export const DIMS = {
  length: {
    line: 'M-50 212V763',
    extensions: ['M425 212H-70', 'M340 763H-70'],
    ticks: 'M-60 212H-40M-60 763H-40',
    /** Bottom-left corner, above the top extension line. */
    anchor: { x: -50, y: 196, align: 'start', edge: 'bottom' } as DimAnchor,
  },
  chest: {
    line: 'M306 590H808',
    extensions: [] as string[],
    ticks: 'M306 580V600M808 580V600',
    /** Bottom-centre, on the garment: use night-surface ink even on bone. */
    anchor: { x: 557, y: 574, align: 'center', edge: 'bottom' } as DimAnchor,
  },
  sleeve: {
    line: 'M769.7 234.3L1119 555.5',
    extensions: ['M748 257.9L776.5 226.9', 'M1097.4 579.1L1125.8 548.1'],
    ticks: 'M776.5 227L762.9 241.6M1125.8 548.2L1112.2 562.8',
    /** Bottom-left, outside the right sleeve. */
    anchor: { x: 962, y: 377, align: 'start', edge: 'bottom' } as DimAnchor,
  },
};

/** Phones draw on a smaller hoodie, so the end ticks are longer there; the chest label moves under the hem. */
export const PHONE_DIMS = {
  length: { ticks: 'M-64 212H-36M-64 763H-36', anchor: { x: -50, y: 196, align: 'start', edge: 'bottom' } as DimAnchor },
  chest: { ticks: 'M306 576V604M808 576V604', anchor: { x: 557, y: 800, align: 'center', edge: 'top' } as DimAnchor },
};

/** Maps a point in black cut-out pixels to the hoodie box's space. */
export function cutoutToFrame(box: HoodieBox, ux: number, uy: number) {
  const k = box.width / BLACK_W;
  return { x: box.x + (ux - BLACK_W / 2) * k, y: box.y + (uy - BLACK_H / 2) * k };
}

/** The phone design frame. */
export const PHONE_W = 390;
export const PHONE_H = 664;

export interface PhoneSpecSheetState {
  seam: number;
  hint: number;
  wordmarkExit: [number, number];
  /** `rise` 0 → 1: the black hoodie comes up from 0.8 H below its place. */
  black: HoodieBox & { rise: number };
  white: HoodieBox & { visible: boolean };
  dims: { length: DimState; chest: DimState; opacity: number };
  sizeIndex: SizeIndex;
  stepper: { opacity: number; rise: number };
  labels: number;
  headline: number;
}

/**
 * Phones and portrait screens: the same beats with a horizontal seam. Bone covers
 * [0, seam] vertically. Designed for a 390 × 664 stage; x positions follow the
 * stage width and sizes the tighter of width and height. All values are CSS px.
 * `headlineHeight` (including its 6vh bottom padding) and `stepperHeight` are
 * measured from the rendered blocks.
 */
export function phoneSpecSheetState(
  progress: number,
  W: number,
  H: number,
  headlineHeight: number,
  stepperHeight: number,
  chest: ChestWidths | null,
): PhoneSpecSheetState {
  const p = clamp01(progress);
  const kx = W / PHONE_W;
  const kw = Math.min(kx, H / PHONE_H);
  const sweep = quint(ramp(p, 0.03, 0.18));
  const back = quint(ramp(p, 0.44, 0.56));
  const settle = quint(ramp(p, 0.84, 0.94));
  const { sizeIndex, sizeScale } = sizeBeats(p, chest);
  // On phones the hoodies return to their own size while the size row fades.
  const size = lerp(sizeScale, 1, quint(ramp(p, 0.74, 0.8)));
  const fade = 1 - ramp(p, 0.74, 0.78);

  const mid = Math.round(H * 0.5);
  const stepTop = H - 0.08 * H - stepperHeight;
  const avail = Math.max(140, H - headlineHeight - 18 - 20);
  // End state: the seam sits where the headline leaves room; black just above it, off-white just below.
  const S = 20 + avail / 2;
  const h = Math.min(avail / 2 - 10, (250 * kw) / BLACK_RATIO);

  const black = {
    x: lerp(lerp(210 * kx, 205 * kx, back), W / 2, settle),
    y: lerp(lerp(H * 0.5 + 12, mid / 2 + 10, back), S - 6 - h / 2, settle),
    width: lerp(lerp(320, 250, back) * kw * size, h * BLACK_RATIO, settle),
    rise: out4(ramp(p, 0.2, 0.3)),
  };
  const white = {
    x: W / 2,
    y: lerp((mid + stepTop) / 2 + (1 - back) * (H - mid), S + 6 + h / 2, settle),
    width: lerp(230 * kw * size, h * WHITE_RATIO, settle),
    visible: back > 0,
  };

  return {
    seam: lerp(H * sweep - (H - mid) * back, S, settle),
    hint: 1 - ramp(p, 0.005, 0.03),
    wordmarkExit: [quint(ramp(p, 0.13, 0.23)), quint(ramp(p, 0.16, 0.26))],
    black,
    white,
    dims: { length: dim(p, 0.28, 0.33, fade), chest: dim(p, 0.32, 0.38, fade), opacity: fade },
    sizeIndex,
    stepper: { opacity: ramp(p, 0.54, 0.58) * fade, rise: ramp(p, 0.54, 0.58) },
    labels: ramp(p, 0.76, 0.79) * (1 - ramp(p, 0.84, 0.87)),
    headline: ramp(p, 0.88, 0.96),
  };
}
