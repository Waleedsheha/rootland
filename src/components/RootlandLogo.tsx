import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'dark' | 'light' | 'monochrome';
}

/**
 * Pixel-accurate SVG representation of the ROOTLAND Root Glyph
 * Based on the brand identity sheet:
 * "Simplified for embroidery — 6 bold, well-spaced lines, no fine detail"
 * Vertical dark stem, horizontal ochre/terracotta soil bar, 3 sprout tips, 2-3 deep root tendrils.
 */
export const RootlandIcon: React.FC<{
  className?: string;
  color?: string;
  barColor?: string;
  size?: number;
}> = ({
  className = '',
  color = '#141311',
  barColor = '#B86A2E',
  size = 28,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="ROOTLAND emblem"
    >
      {/* Terracotta horizontal soil line */}
      <line
        x1="22"
        y1="38"
        x2="78"
        y2="38"
        stroke={barColor}
        strokeWidth="6.5"
        strokeLinecap="round"
      />

      {/* Main central vertical stem */}
      <line
        x1="50"
        y1="22"
        x2="50"
        y2="82"
        stroke={color}
        strokeWidth="6.5"
        strokeLinecap="round"
      />

      {/* Top sprout left tip */}
      <line
        x1="50"
        y1="28"
        x2="40"
        y2="18"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* Top sprout right tip */}
      <line
        x1="50"
        y1="28"
        x2="60"
        y2="18"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* Bottom root - left branch */}
      <line
        x1="50"
        y1="56"
        x2="28"
        y2="76"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Bottom root - right branch */}
      <line
        x1="50"
        y1="64"
        x2="76"
        y2="78"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const RootlandAppIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full bg-clay flex items-center justify-center shrink-0 ${className}`}
    >
      <RootlandIcon size={Math.round(size * 0.72)} color="#0c0c0c" barColor="#0c0c0c" />
    </div>
  );
};

export const RootlandLogo: React.FC<LogoProps> = ({
  className = '',
  iconOnly = false,
  size = 'md',
  variant = 'dark',
}) => {
  const isLight = variant === 'light';
  const textColor = isLight ? 'text-white' : 'text-[#141311]';
  const iconColor = isLight ? '#FFFFFF' : '#141311';
  const barColor = isLight ? '#D98236' : '#B86A2E';

  const iconSize = size === 'sm' ? 20 : size === 'md' ? 26 : size === 'lg' ? 34 : 44;
  const textSize =
    size === 'sm'
      ? 'text-lg tracking-[0.14em]'
      : size === 'md'
      ? 'text-xl sm:text-2xl tracking-[0.16em]'
      : size === 'lg'
      ? 'text-3xl sm:text-4xl tracking-[0.18em]'
      : 'text-5xl sm:text-6xl tracking-[0.2em]';

  if (iconOnly) {
    return <RootlandIcon size={iconSize} color={iconColor} barColor={barColor} className={className} />;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      <RootlandIcon size={iconSize} color={iconColor} barColor={barColor} />
      <span
        style={{ fontFamily: 'var(--font-display)' }}
        className={`font-bold font-serif uppercase ${textSize} ${textColor} leading-none`}
      >
        ROOTLAND
      </span>
    </div>
  );
};
