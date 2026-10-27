import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap';
import { StoreSettingsService } from '../services/storeSettingsService';

let lenis: Lenis | null = null;

/** The running smooth-scroll instance, or null when native scrolling is in use. */
export function getLenis(): Lenis | null {
  return lenis;
}

/** Jump to the top without animation, keeping Lenis and native scroll in sync. */
export function resetScroll(): void {
  if (lenis) {
    lenis.scrollTo(0, { immediate: true, force: true });
  } else {
    window.scrollTo(0, 0);
  }
}

let locks = 0;

/**
 * Pause or resume page scrolling (menu, drawers, viewers, loader). Calls are
 * counted, so every lockScroll(true) must be paired with one lockScroll(false);
 * the page scrolls again only when the last holder releases.
 */
export function lockScroll(locked: boolean): void {
  locks = Math.max(0, locks + (locked ? 1 : -1));
  const held = locks > 0;
  if (lenis) {
    if (held) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = held ? 'hidden' : '';
}

/**
 * Smooth wheel scrolling driven by GSAP's ticker so ScrollTrigger scrubs stay in
 * lock-step. Touch keeps native scrolling. Off under reduced motion.
 * The wheel speed is the owner's "Scroll speed" (Admin → Store settings).
 */
export function SmoothScroll({ enabled }: { enabled: boolean }) {
  const [speed, setSpeed] = useState(() => StoreSettingsService.getSettingsSync().scrollSpeed);

  useEffect(() => {
    const onSettings = () => setSpeed(StoreSettingsService.getSettingsSync().scrollSpeed);
    window.addEventListener('rootland_settings_updated', onSettings);
    return () => window.removeEventListener('rootland_settings_updated', onSettings);
  }, []);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;

    const instance = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Distance of each wheel or trackpad step, as a share of the browser's usual one.
      wheelMultiplier: speed,
    });
    lenis = instance;
    // A holder may have locked scrolling before smooth scroll started (child effects run first).
    if (locks > 0) instance.stop();

    instance.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis = null;
    };
  }, [enabled, speed]);

  return null;
}
