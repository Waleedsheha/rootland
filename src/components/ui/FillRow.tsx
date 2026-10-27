import React, { useRef } from 'react';
import { gsap, EASE } from '../../motion/gsap';

interface FillRowProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'button' | 'a';
  href?: string;
  onClick?: () => void;
  /** Called whenever the row fills (pointer enter or focus). */
  onEnter?: () => void;
  ariaLabel?: string;
}

/**
 * Hairline row whose accent layer rises from the bottom edge on hover and
 * collapses from the top on leave; every text node flips to night meanwhile.
 */
export function FillRow({ children, className = '', as = 'div', href, onClick, onEnter, ariaLabel }: FillRowProps) {
  const fillRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);

  const enter = () => {
    onEnter?.();
    gsap.killTweensOf(fillRef.current);
    gsap.set(fillRef.current, { transformOrigin: '50% 100%' });
    gsap.to(fillRef.current, { scaleY: 1, duration: 0.45, ease: EASE });
    rowRef.current?.setAttribute('data-filled', 'true');
  };
  const leave = () => {
    gsap.killTweensOf(fillRef.current);
    gsap.set(fillRef.current, { transformOrigin: '50% 0%' });
    gsap.to(fillRef.current, { scaleY: 0, duration: 0.45, ease: EASE });
    rowRef.current?.removeAttribute('data-filled');
  };

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={rowRef}
      href={href}
      onClick={onClick}
      aria-label={ariaLabel}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocus={enter}
      onBlur={leave}
      className={`fill-row relative isolate block w-full text-start border-t border-line ${className}`}
    >
      <span
        ref={fillRef}
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-clay"
        style={{ transform: 'scaleY(0)' }}
      />
      {children}
    </Tag>
  );
}
