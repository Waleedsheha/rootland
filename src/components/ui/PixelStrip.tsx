import { useRef } from 'react';
import { gsap, useGSAP, FULL_MOTION } from '../../motion/gsap';

type Surface = 'night' | 'bone';

const COLS = 24;
const ROWS = 4;
const CELLS = Array.from({ length: COLS * ROWS }, (_, i) => i);

/**
 * `hero-split` continues the home hero's last frame on landscape screens: bone on
 * the start half, night on the end half. Phones end the hero on night, so there
 * is nothing to flip and the strip is not shown.
 */
const HERO_SPLIT =
  'max-md:hidden portrait:hidden bg-[linear-gradient(to_right,var(--color-bone)_50%,var(--color-night)_50%)] rtl:bg-[linear-gradient(to_left,var(--color-bone)_50%,var(--color-night)_50%)]';

/**
 * Sits at every polarity flip. The strip is painted in the previous surface and
 * its 96 cells switch on, in random order, in the colour of the next surface as
 * it scrolls through the viewport.
 */
export function PixelStrip({ from, to }: { from: Surface | 'hero-split'; to: Surface }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const cells = ref.current?.children;
      if (!cells) return;
      const mm = gsap.matchMedia();
      mm.add(FULL_MOTION, () => {
        gsap.fromTo(
          cells,
          { opacity: 0 },
          {
            opacity: 1,
            ease: 'steps(1)',
            stagger: { each: 0.012, from: 'random' },
            scrollTrigger: { trigger: ref.current, start: 'top 90%', end: 'bottom 35%', scrub: 0.3 },
          },
        );
      });
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-surface={from === 'hero-split' ? to : from}
      className={`grid w-full ${from === 'hero-split' ? HERO_SPLIT : ''}`}
      style={{
        height: 'clamp(160px, 28vh, 300px)',
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
      }}
    >
      {CELLS.map((i) => (
        <span
          key={i}
          className={`block ${to === 'bone' ? 'bg-bone' : 'bg-night'}`}
          style={{ marginRight: -1, marginBottom: -1 }}
        />
      ))}
    </div>
  );
}
