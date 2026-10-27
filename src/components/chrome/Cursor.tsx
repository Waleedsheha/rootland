import { useEffect, useRef } from 'react';
import { gsap, hasFinePointer } from '../../motion/gsap';
import { useLanguage } from '../../context/LanguageContext';
import { RootlandIcon } from '../RootlandLogo';

const HOVER_TARGETS = 'a, button, [role="button"], label, summary, [data-hover]';

/**
 * The RootLand icon follows the pointer. Its stem is drawn in a difference-blend
 * layer, so it inverts whatever is beneath; the clay bar rides a normal layer on
 * top so it keeps its colour. Over interactive elements a 72px inverting disc
 * grows behind the enlarged icon (the icon cuts out of it); over anything marked
 * data-cursor="view" the disc grows to 120px and shows "View". Fine pointers only;
 * touch keeps native behaviour.
 */
export function Cursor() {
  const { t } = useLanguage();
  const dotRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const bar = barRef.current;
    if (!dot || !bar || !hasFinePointer()) return;
    const layers = [dot, bar];

    document.documentElement.classList.add('has-cursor');
    const moves = layers.map((el) => ({
      x: gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' }),
      y: gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' }),
    }));

    const onMove = (e: PointerEvent) => {
      moves.forEach((m) => {
        m.x(e.clientX);
        m.y(e.clientY);
      });
      const target = e.target instanceof Element ? e.target : null;
      // The nearest data-cursor wins, so a turning hoodie (data-cursor="spin") inside a "view" card keeps the small cursor.
      const marked = target?.closest('[data-cursor]');
      const state = marked?.getAttribute('data-cursor') === 'view' ? 'view' : target?.closest(HOVER_TARGETS) ? 'hover' : '';
      layers.forEach((el) => {
        el.style.opacity = '1';
        el.dataset.state = state;
      });
    };
    const onLeave = () => {
      layers.forEach((el) => (el.style.opacity = '0'));
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" style={{ opacity: 0 }} aria-hidden="true">
        <span className="cursor-dot__disc" />
        <RootlandIcon size={40} color="currentColor" barColor="transparent" className="cursor-dot__icon" />
        <span className="cursor-dot__label">{t('cursor.view')}</span>
      </div>
      <div ref={barRef} className="cursor-dot cursor-dot--bar" style={{ opacity: 0 }} aria-hidden="true">
        <RootlandIcon size={40} color="transparent" barColor="#c8642a" className="cursor-dot__icon" />
      </div>
    </>
  );
}
