import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { lockScroll } from '../motion/SmoothScroll';
import { hasFinePointer } from '../motion/gsap';

interface ZoomViewerProps {
  images: string[];
  index: number;
  alt: string;
  onIndex: (index: number) => void;
  onClose: () => void;
}

/**
 * Full-screen image inspection. The photo is shown at roughly twice the screen
 * width; on a mouse it pans with the cursor, on touch it scrolls natively.
 */
export function ZoomViewer({ images, index, alt, onIndex, onClose }: ZoomViewerProps) {
  const { t } = useLanguage();
  const paneRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    lockScroll(true);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index + 1) % images.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      lockScroll(false);
    };
  }, [index, images.length, onClose, onIndex]);

  // Centre the zoomed photo whenever the image changes.
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    pane.scrollLeft = (pane.scrollWidth - pane.clientWidth) / 2;
    pane.scrollTop = (pane.scrollHeight - pane.clientHeight) / 2;
  }, [index]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pane = paneRef.current;
    if (!pane || !hasFinePointer()) return;
    const rect = pane.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    pane.scrollLeft = x * (pane.scrollWidth - pane.clientWidth);
    pane.scrollTop = y * (pane.scrollHeight - pane.clientHeight);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={alt} data-surface="night" className="fixed inset-0 z-[110]">
      <div ref={paneRef} onPointerMove={onMove} className="absolute inset-0 overflow-auto [scrollbar-width:none]" data-lenis-prevent>
        <img src={images[index]} alt={`${alt} ${index + 1}`} className="block max-w-none w-[200vw] md:w-[180vw]" />
      </div>
      <div className="absolute top-0 inset-x-0 gutter py-[18px] flex items-center justify-between pointer-events-none">
        <span className="t-counter text-bone bg-night/80 rounded-full px-3 py-1.5">
          {String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </span>
        <div className="flex gap-2 pointer-events-auto">
          {images.length > 1 && (
            <>
              <button type="button" className="pill pill--sm !bg-night" onClick={() => onIndex((index - 1 + images.length) % images.length)} aria-label={t('zoom.prev')}>
                <span className="rtl:-scale-x-100">←</span>
              </button>
              <button type="button" className="pill pill--sm !bg-night" onClick={() => onIndex((index + 1) % images.length)} aria-label={t('zoom.next')}>
                <span className="rtl:-scale-x-100">→</span>
              </button>
            </>
          )}
          <button ref={closeRef} type="button" className="pill pill--sm !bg-night" onClick={onClose}>
            <X className="w-4 h-4" />
            {t('nav.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
