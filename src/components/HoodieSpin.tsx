import React, { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '../motion/gsap';
import type { SpinSet } from '../data/spin';

interface HoodieSpinProps {
  spin: SpinSet;
  alt: string;
}

/**
 * A hoodie that turns. With a mouse, moving across it turns it (one sweep across = one full turn)
 * and it eases back to the front when the mouse leaves; on touch screens a sideways drag turns it
 * while an up-and-down swipe still scrolls. Frames load when the viewer nears the screen, at the
 * size it is shown. Fills its positioned parent.
 */
export function HoodieSpin({ spin, alt }: HoodieSpinProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const st = useRef({
    /** Frame width in use; 0 until the viewer nears the screen. */
    size: 0,
    loaded: [] as boolean[],
    /** Continuous turn position in frames (wraps every spin.frames). */
    pos: 0,
    shown: -1,
    lastX: 0,
    downX: 0,
    pointerDown: false,
    dragged: false,
  });

  const url = (size: number, index: number) => `${spin.base}/${size}/${String(index + 1).padStart(3, '0')}.webp`;

  const render = () => {
    const s = st.current;
    const img = imgRef.current;
    if (!img || !s.size) return;
    const n = spin.frames;
    const target = ((Math.round(s.pos) % n) + n) % n;
    // While frames are still arriving, show the nearest one that has.
    let pick = -1;
    for (let d = 0; d < n && pick < 0; d++) {
      for (const candidate of [target - d, target + d]) {
        const i = ((candidate % n) + n) % n;
        if (s.loaded[i]) {
          pick = i;
          break;
        }
      }
    }
    if (pick < 0 || pick === s.shown) return;
    s.shown = pick;
    img.src = url(s.size, pick);
  };

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const s = st.current;
    let cancelled = false;

    const load = (i: number, then?: () => void) => {
      const frame = new Image();
      frame.onload = () => {
        if (cancelled) return;
        s.loaded[i] = true;
        render();
        then?.();
      };
      frame.onerror = () => console.error(`[HoodieSpin] frame did not load: ${url(s.size, i)}`);
      frame.src = url(s.size, i);
    };

    const start = () => {
      // The frame is contained in the box, so its shown width (in device pixels) picks the size.
      const shownWidth = Math.min(box.clientWidth, box.clientHeight * (spin.width / spin.height)) * window.devicePixelRatio;
      const fitting = spin.sizes.filter((w) => w >= shownWidth);
      s.size = fitting.length > 0 ? fitting[0] : spin.sizes[spin.sizes.length - 1];
      s.loaded = new Array(spin.frames).fill(false);
      s.shown = -1;
      // The front first, so the card never twitches to a neighbouring frame while the rest arrive.
      load(0, () => {
        for (let i = 1; i < spin.frames; i++) load(i);
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        start();
      },
      { rootMargin: '400px 0px' }
    );
    io.observe(box);
    return () => {
      cancelled = true;
      io.disconnect();
      gsap.killTweensOf(s);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin.base]);

  const turnBy = (dx: number, width: number) => {
    const s = st.current;
    gsap.killTweensOf(s);
    s.pos += (dx / width) * spin.frames;
    render();
  };

  const onPointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    st.current.lastX = e.clientX;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    const dx = e.clientX - s.lastX;
    s.lastX = e.clientX;
    // A mouse turns it by moving; touch and pen only while pressed.
    if (e.pointerType !== 'mouse' && !s.pointerDown) return;
    turnBy(dx, e.currentTarget.clientWidth);
    if (s.pointerDown && Math.abs(e.clientX - s.downX) > 6) s.dragged = true;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    s.pointerDown = true;
    s.dragged = false;
    s.downX = e.clientX;
    s.lastX = e.clientX;
    if (e.pointerType !== 'mouse') e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerUp = () => {
    st.current.pointerDown = false;
  };

  const onPointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    s.pointerDown = false;
    if (e.pointerType !== 'mouse') return;
    // Back to the front, the short way round.
    const front = Math.round(s.pos / spin.frames) * spin.frames;
    if (prefersReducedMotion()) {
      s.pos = front;
      render();
      return;
    }
    gsap.to(s, { pos: front, duration: 0.7, ease: 'power3.out', onUpdate: render });
  };

  const onClickCapture = (e: React.MouseEvent) => {
    const s = st.current;
    if (!s.dragged) return;
    // The drag turned the hoodie: it should not also open the product.
    e.preventDefault();
    e.stopPropagation();
    s.dragged = false;
  };

  return (
    <div
      ref={boxRef}
      data-cursor="spin"
      className="absolute inset-0 select-none"
      style={{ touchAction: 'pan-y' }}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
      onClickCapture={onClickCapture}
    >
      {/* Sync decoding: with async, the browser may paint the card empty for a moment each time a frame is swapped in. */}
      <img
        ref={imgRef}
        src={url(spin.sizes[0], 0)}
        alt={alt}
        width={spin.width}
        height={spin.height}
        loading="lazy"
        decoding="sync"
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain pointer-events-none"
      />
    </div>
  );
}
