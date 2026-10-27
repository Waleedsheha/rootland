/** Endless band of words alternating light / accent; reverses direction in RTL. */
export function Marquee({ words }: { words: string[] }) {
  const sequence = [...words, ...words];
  return (
    <div className="marquee border-y border-line" style={{ paddingBlock: 'clamp(14px, 2.4vh, 24px)' }} aria-hidden="true">
      <div className="marquee__track">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0">
            {sequence.map((word, i) => (
              <span key={`${copy}-${i}`} className={`t-marquee px-[0.45em] ${i % 2 === 0 ? 'text-fg' : 'text-accent'}`}>
                {word}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
