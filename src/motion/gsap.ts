import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/** The one easing curve: cubic-bezier(.83,0,.17,1). */
export const EASE = 'power4.inOut';
/** Reveals settle out of motion rather than in and out of it. */
export const EASE_OUT = 'power3.out';

export const DUR = {
  colour: 0.3,
  move: 0.5,
  reveal: 1,
} as const;

gsap.defaults({ ease: EASE, duration: DUR.move });

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
export const FULL_MOTION = '(prefers-reduced-motion: no-preference)';
export const FINE_POINTER = '(hover: hover) and (pointer: fine)';

export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION).matches;
}

export function hasFinePointer(): boolean {
  return window.matchMedia(FINE_POINTER).matches;
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
