import React, { useRef } from 'react';
import { useScrollReveals } from '../../motion/reveal';

export interface LegalSection {
  title: string;
  paragraphs: string[];
  /** Short bullet facts shown under the paragraphs. */
  points?: string[];
}

interface LegalPageProps {
  title: React.ReactNode;
  meta: string;
  sections: LegalSection[];
  /** Re-run reveals when this changes (language). */
  revealKey: unknown;
}

/**
 * Reading layout for the policy pages: numbered sections, each a hairline row
 * with the heading in the start column and the text at a comfortable measure.
 */
export function LegalPage({ title, meta, sections, revealKey }: LegalPageProps) {
  const scopeRef = useRef<HTMLDivElement>(null);
  useScrollReveals(scopeRef, [revealKey]);

  return (
    <div ref={scopeRef} className="gutter pb-[clamp(60px,10vh,110px)]">
      <header className="pb-10">
        <h1 key={String(revealKey)} className="t-section text-fg max-w-[16ch]" data-reveal-lines>
          {title}
        </h1>
        <p className="t-label text-mut mt-6">{meta}</p>
      </header>

      <div className="border-b border-line">
        {sections.map((section, i) => (
          <section key={section.title} className="grid gap-4 py-10 border-t border-line md:grid-cols-[48px_minmax(0,1fr)_minmax(0,1.6fr)]" data-reveal>
            <span className="t-counter text-accent">{String(i + 1).padStart(2, '0')}</span>
            <h2 className="t-title text-fg md:pe-8">{section.title}</h2>
            <div className="space-y-5 text-body max-w-[68ch]">
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {section.points && (
                <ul className="pt-2 border-t border-line">
                  {section.points.map((point) => (
                    <li key={point} className="flex items-baseline gap-3 py-2.5 border-b border-line text-fg">
                      <span aria-hidden="true" className="w-2 h-2 rounded-full bg-accent shrink-0 translate-y-[-1px]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
