import React from 'react';
import './MayurMehtaLogo.css';

/**
 * MayurMehtaLogo: Official vector brand logo component using mayur_mehta_logo.svg
 * 
 * Supports:
 * - Full brand presentation: 9 circles + vertical dividing line + MAYUR MEHTA + cursive design
 * - Symbol presentation (variant="symbol"): 9 touching circles in a 3x3 grid
 * - Flexible color tokens: 'taupe' (#7B6F62), 'charcoal' (#2E2E2E), 'white' (#FFFFFF), 'brass' (#B08D57), or custom hex/CSS vars
 * - Standard architectural suite sizing: 'xs', 'sm', 'md', 'lg', 'xl', 'hero'
 */
/**
 * MayurMehtaSymbol: Pure vector 3x3 (9 touching circles) brand mark
 * Center is at (56, 56) in a 112x112 viewBox so it can smoothly rotate 360° continuously without clipping!
 */
export function MayurMehtaSymbol({
  size = 36,
  color = '#7B6F62',
  strokeWidth = 2.4,
  animated = true,
  className = '',
  style = {}
}) {
  const resolved =
    color === 'taupe' ? '#7B6F62' :
    color === 'charcoal' ? '#2E2E2E' :
    color === 'stone' ? '#B7AFA6' :
    color === 'white' ? '#FFFFFF' :
    color === 'black' ? '#1A1A1A' :
    color === 'brass' ? '#B08D57' :
    color;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 112 112"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`mm-nine-circles-symbol ${animated ? 'animated is-rotating' : ''} ${className}`}
      style={{ display: 'block', flexShrink: 0, color: resolved, overflow: 'visible', ...style }}
      aria-label="Mayur Mehta Design 9 Circles Symbol"
    >
      <g className="mm-circles-rotating-group">
        {/* Row 1 */}
        <circle cx="28" cy="28" r="13.2" stroke="currentColor" strokeWidth={strokeWidth} />
        <circle cx="56" cy="28" r="13.2" stroke="currentColor" strokeWidth={strokeWidth} />
        <circle cx="84" cy="28" r="13.2" stroke="currentColor" strokeWidth={strokeWidth} />

        {/* Row 2 */}
        <circle cx="28" cy="56" r="13.2" stroke="currentColor" strokeWidth={strokeWidth} />
        <circle cx="56" cy="56" r="13.2" stroke="currentColor" strokeWidth={strokeWidth} />
        <circle cx="84" cy="56" r="13.2" stroke="currentColor" strokeWidth={strokeWidth} />

        {/* Row 3 */}
        <circle cx="28" cy="84" r="13.2" stroke="currentColor" strokeWidth={strokeWidth} />
        <circle cx="56" cy="84" r="13.2" stroke="currentColor" strokeWidth={strokeWidth} />
        <circle cx="84" cy="84" r="13.2" stroke="currentColor" strokeWidth={strokeWidth} />
      </g>
    </svg>
  );
}

export function MayurMehtaLogo({
  variant = 'primary', // 'primary' | 'horizontal' | 'compact' | 'symbol'
  size = 'md',         // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero' | 'sidebar'
  color = '#7B6F62',   // Primary Taupe by default, or hex / 'charcoal' / 'white' / 'brass'
  animated = true,     // Smooth rotation for symbol
  showTagline = true,
  className = '',
  style = {},
  onClick
}) {
  // Resolve color presets
  const resolvedColor =
    color === 'taupe' ? '#7B6F62' :
    color === 'charcoal' ? '#2E2E2E' :
    color === 'stone' ? '#B7AFA6' :
    color === 'white' ? '#FFFFFF' :
    color === 'black' ? '#1A1A1A' :
    color === 'brass' ? '#B08D57' :
    color;

  const isSymbolOnly = variant === 'symbol';

  // Sizing configurations based on 694x272 (aspect ratio ~2.5515 for full, 1:1 for symbol)
  const sizeMap = {
    sidebar: { width: isSymbolOnly ? 30 : 72, height: isSymbolOnly ? 30 : 28 },
    xs: { width: isSymbolOnly ? 18 : 92, height: isSymbolOnly ? 18 : 36 },
    sm: { width: isSymbolOnly ? 24 : 128, height: isSymbolOnly ? 24 : 50 },
    md: { width: isSymbolOnly ? 32 : 170, height: isSymbolOnly ? 32 : 66 },
    lg: { width: isSymbolOnly ? 42 : 220, height: isSymbolOnly ? 42 : 86 },
    xl: { width: isSymbolOnly ? 54 : 280, height: isSymbolOnly ? 54 : 110 },
    hero: { width: isSymbolOnly ? 72 : 340, height: isSymbolOnly ? 72 : 133 }
  };

  const numericSize = typeof size === 'number' ? size : !isNaN(Number(size)) ? Number(size) : null;
  const current = numericSize
    ? { width: numericSize, height: numericSize }
    : sizeMap[size] || sizeMap.md;

  const isPureWhite = resolvedColor.toUpperCase() === '#FFFFFF' || resolvedColor.toLowerCase() === 'white';

  return (
    <div
      className={`mayur-mehta-vector-brand size-${size} variant-${variant} ${className}`}
      title="Mayur Mehta Design"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      {isSymbolOnly ? (
        <MayurMehtaSymbol
          size={current.width}
          color={resolvedColor}
          strokeWidth={current.width <= 26 ? 3.0 : current.width <= 32 ? 2.6 : 2.4}
          animated={animated}
        />
      ) : isPureWhite ? (
        <img
          src="/mayur_mehta_logo.svg"
          alt="Mayur Mehta Design"
          className="mm-master-img"
          style={{
            display: 'block',
            width: `${current.width}px`,
            height: `${current.height}px`,
            objectFit: 'contain',
          }}
        />
      ) : (
        <span
          className="mm-brand-full"
          style={{
            display: 'inline-block',
            width: `${current.width}px`,
            height: `${current.height}px`,
            backgroundColor: resolvedColor,
            WebkitMaskImage: 'url(/mayur_mehta_logo.svg)',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center center',
            WebkitMaskSize: 'contain',
            maskImage: 'url(/mayur_mehta_logo.svg)',
            maskRepeat: 'no-repeat',
            maskPosition: 'center center',
            maskSize: 'contain',
          }}
          role="img"
          aria-label="Mayur Mehta Design"
        />
      )}
    </div>
  );
}

export default MayurMehtaLogo;
