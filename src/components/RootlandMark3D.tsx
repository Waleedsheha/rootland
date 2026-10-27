import { useEffect, useRef } from 'react';
import markUrl from '../assets/rootland-mark-web.glb?url';
import { prefersReducedMotion } from '../motion/gsap';
import type { MarkScene } from '../motion/markScene';

/**
 * The RootLand mark in 3D. rootland-mark-web.glb is rootland-mark-no-plinth.glb (the source) without
 * its unused texture coordinates and with positions and normals stored as 16-bit integers
 * (KHR_mesh_quantization, read natively by GLTFLoader): 514 KB instead of 812 KB, the same render.
 * three.js and the model load only when the box is about a screen away, and it draws only while on
 * screen. Decorative: if WebGL or the model fails, the box stays empty and the error is logged.
 */
export function RootlandMark3D() {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let scene: MarkScene | null = null;
    let disposed = false;
    let visible = false;

    // The mark leans toward the pointer wherever it is on the page.
    const onPointer = (e: PointerEvent) => {
      if (!scene || !visible) return;
      const rect = box.getBoundingClientRect();
      const x = (e.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2);
      const y = (e.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2);
      scene.setPointer(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
    };

    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        near.disconnect();
        import('../motion/markScene')
          .then(({ createMarkScene }) => createMarkScene(box, markUrl, prefersReducedMotion()))
          .then((created) => {
            if (disposed) {
              created.dispose();
              return;
            }
            scene = created;
            scene.setRunning(visible);
          })
          .catch((err) => console.error('[RootlandMark3D] The 3D mark could not be shown:', err));
      },
      { rootMargin: '100% 0px' }
    );
    const onScreen = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (scene) scene.setRunning(visible);
    });

    near.observe(box);
    onScreen.observe(box);
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      disposed = true;
      near.disconnect();
      onScreen.disconnect();
      window.removeEventListener('pointermove', onPointer);
      if (scene) scene.dispose();
    };
  }, []);

  return <div ref={boxRef} aria-hidden="true" className="relative mx-auto aspect-square h-[clamp(180px,28vh,300px)]" />;
}
