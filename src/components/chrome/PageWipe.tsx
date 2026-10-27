import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap, prefersReducedMotion } from '../../motion/gsap';

const COLS = 16;
const ROWS = 9;
const CELLS = Array.from({ length: COLS * ROWS }, (_, i) => i);

/**
 * Pixel-cell wipe on route change: the new page renders under a full cover of
 * night cells that switch off in random order.
 */
export function PageWipe() {
  const { pathname } = useLocation();
  const gridRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const grid = gridRef.current;
    if (!grid || prefersReducedMotion()) return;
    const cells = grid.children;
    gsap.killTweensOf(cells);
    gsap.set(grid, { visibility: 'visible' });
    gsap.set(cells, { opacity: 1 });
    const tween = gsap.to(cells, {
      opacity: 0,
      duration: 0.01,
      ease: 'none',
      stagger: { each: 0.0035, from: 'random' },
      delay: 0.08,
      onComplete: () => {
        gsap.set(grid, { visibility: 'hidden' });
      },
    });
    return () => {
      tween.kill();
    };
  }, [pathname]);

  return (
    <div
      ref={gridRef}
      aria-hidden="true"
      className="fixed inset-0 z-[120] grid pointer-events-none"
      style={{
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        visibility: 'hidden',
      }}
    >
      {CELLS.map((i) => (
        <span key={i} className="bg-night block" style={{ opacity: 0, marginRight: -1, marginBottom: -1 }} />
      ))}
    </div>
  );
}
