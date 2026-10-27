import React, { useRef, useState } from 'react';
import { gsap, EASE, hasFinePointer } from '../../motion/gsap';

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  body: React.ReactNode;
}

/**
 * Hover-to-open accordion (click/tap toggles too). Bodies animate height to
 * auto over 0.7s; the head nudges inward and its sign flips + / −.
 */
export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const bodies = useRef<Record<string, HTMLDivElement | null>>({});

  const animate = (id: string, opening: boolean) => {
    const el = bodies.current[id];
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.to(el, { height: opening ? 'auto' : 0, duration: 0.7, ease: EASE });
  };

  const show = (id: string) => {
    if (open === id) return;
    if (open) animate(open, false);
    animate(id, true);
    setOpen(id);
  };
  const hide = (id: string) => {
    animate(id, false);
    setOpen((current) => (current === id ? null : current));
  };

  return (
    <div className="border-b border-line">
      {items.map((item, index) => {
        const isOpen = open === item.id;
        return (
          <div
            key={item.id}
            className={index === 0 ? 'border-t-2 border-fg' : 'border-t border-line'}
            onPointerEnter={() => hasFinePointer() && show(item.id)}
            onPointerLeave={() => hasFinePointer() && hide(item.id)}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`acc-${item.id}`}
              onClick={() => (isOpen ? hide(item.id) : show(item.id))}
              className="grid w-full items-center gap-4 py-7 text-start cursor-pointer"
              style={{ gridTemplateColumns: 'minmax(0,1fr) 32px' }}
            >
              <span
                className="t-title transition-[padding] duration-500 ease-rl"
                style={{ paddingInlineStart: isOpen ? 14 : 0 }}
              >
                {item.title}
              </span>
              <span aria-hidden="true" className="text-[30px] leading-none text-fg text-center font-light">
                {isOpen ? '−' : '+'}
              </span>
            </button>
            <div
              id={`acc-${item.id}`}
              ref={(el) => {
                bodies.current[item.id] = el;
              }}
              className="overflow-hidden"
              style={{ height: 0 }}
              role="region"
              aria-hidden={!isOpen}
            >
              <div className="pb-8 ps-0 sm:ps-[64px]">{item.body}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
