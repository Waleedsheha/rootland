import { RefObject } from 'react';
import { gsap, ScrollTrigger, SplitText, useGSAP, EASE_OUT, FULL_MOTION, REDUCED_MOTION } from './gsap';

/**
 * Scroll reveals for everything inside `scope`:
 *  [data-reveal]        fade + rise 24px when it reaches 88% of the viewport
 *  [data-reveal-lines]  lines slide up out of overflow masks
 *  [data-word-fill]     words fill from 14% to full opacity, scrubbed by scroll
 *  [data-count]         numbers count up to their data-count value
 * Reduced motion keeps opacity fades only.
 *
 * SplitText replaces the text of [data-reveal-lines] and [data-word-fill] elements with its own
 * wrappers, so React can no longer change that text in place. Give each of them a key that changes
 * with the language and is unique among its siblings (key={`reveal-1-${isArabic ? 'ar' : 'en'}`}):
 * React then rebuilds the element with the new text and the next run splits it.
 */
export function useScrollReveals(scope: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      mm.add(FULL_MOTION, () => {
        root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.from(el, {
            y: 24,
            opacity: 0,
            duration: 1,
            ease: EASE_OUT,
            clearProps: 'transform,opacity',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          });
        });

        root.querySelectorAll<HTMLElement>('[data-reveal-lines]').forEach((el) => {
          SplitText.create(el, {
            type: 'lines',
            mask: 'lines',
            autoSplit: true,
            onSplit(self) {
              return gsap.from(self.lines, {
                yPercent: 110,
                duration: 1.1,
                ease: EASE_OUT,
                stagger: 0.12,
                scrollTrigger: { trigger: el, start: 'top 88%', once: true },
              });
            },
          });
        });

        root.querySelectorAll<HTMLElement>('[data-word-fill]').forEach((el) => {
          SplitText.create(el, {
            type: 'words',
            autoSplit: true,
            onSplit(self) {
              return gsap.fromTo(
                self.words,
                { opacity: 0.14 },
                {
                  opacity: 1,
                  ease: 'none',
                  stagger: 0.1,
                  scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 45%', scrub: true },
                },
              );
            },
          });
        });

        root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
          const target = Number(el.dataset.count);
          const counter = { value: 0 };
          el.textContent = '0';
          gsap.to(counter, {
            value: target,
            duration: 1.6,
            ease: EASE_OUT,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            onUpdate: () => {
              el.textContent = Math.round(counter.value).toLocaleString('en-US');
            },
          });
        });
      });

      mm.add(REDUCED_MOTION, () => {
        root.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-lines]').forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            duration: 0.6,
            ease: 'none',
            clearProps: 'opacity',
            scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          });
        });
      });

      ScrollTrigger.refresh();
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  );
}

/**
 * Photo reveals for everything inside `scope`:
 *  [data-clip]   the frame opens from an inset clip as it scrolls into view
 *  [data-drift]  the element drifts vertically against the scroll (parallax)
 * The image inside a [data-clip] frame also settles from a slight zoom.
 */
export function useClipReveals(scope: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add(FULL_MOTION, () => {
        root.querySelectorAll<HTMLElement>('[data-clip]').forEach((figure) => {
          const img = figure.querySelector('img');
          gsap.fromTo(
            figure,
            { clipPath: 'inset(18% 8% 18% 8%)' },
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              ease: 'none',
              scrollTrigger: { trigger: figure, start: 'top 95%', end: 'top 35%', scrub: true },
            },
          );
          if (img) {
            gsap.fromTo(
              img,
              { scale: 1.22, yPercent: -6 },
              {
                scale: 1,
                yPercent: 6,
                ease: 'none',
                scrollTrigger: { trigger: figure, start: 'top bottom', end: 'bottom top', scrub: true },
              },
            );
          }
        });
        root.querySelectorAll<HTMLElement>('[data-drift]').forEach((el, i) => {
          gsap.fromTo(
            el,
            { yPercent: i % 2 === 0 ? 10 : -4 },
            {
              yPercent: i % 2 === 0 ? -10 : 8,
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
            },
          );
        });
      });
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  );
}
