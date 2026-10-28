import React from 'react';
import './ParametricBackground.css';

/**
 * Parametric architectural vector ribbon background.
 * Generates smooth CAD-style undulating wireframe curves inspired by architectural parametric facades.
 */
export function ParametricBackground() {
  // Generate 24 stepped bezier curves for the left ribbon cluster
  const leftCurves = Array.from({ length: 24 }).map((_, i) => {
    const t = i / 23;
    const startX = -80 + i * 18;
    const startY = 960 - i * 12;
    const cp1X = 60 + i * 22;
    const cp1Y = 560 - i * 16;
    const cp2X = 320 + i * 14;
    const cp2Y = 220 + i * 18;
    const endX = 40 + i * 20;
    const endY = -60 + i * 6;

    const cp3X = 420 - i * 10;
    const cp3Y = 740 - i * 18;
    const cp4X = 140 + i * 12;
    const cp4Y = 320 - i * 8;

    return (
      <path
        key={`left-${i}`}
        d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
        className="parametric-curve left-curve"
        style={{
          strokeOpacity: 0.12 + t * 0.22,
          animationDelay: `${i * 0.08}s`
        }}
      />
    );
  });

  // Secondary cross-ribbon on left for volumetric depth
  const leftCrossCurves = Array.from({ length: 18 }).map((_, i) => {
    const t = i / 17;
    const startX = -40 + i * 16;
    const startY = 200 + i * 28;
    const cp1X = 220 + i * 14;
    const cp1Y = 400 + i * 10;
    const cp2X = 340 - i * 8;
    const cp2Y = 680 - i * 14;
    const endX = 60 + i * 18;
    const endY = 980;

    return (
      <path
        key={`left-cross-${i}`}
        d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
        className="parametric-curve left-cross-curve"
        style={{
          strokeOpacity: 0.08 + t * 0.16
        }}
      />
    );
  });

  // Generate 26 stepped bezier curves for the right ribbon cluster
  const rightCurves = Array.from({ length: 26 }).map((_, i) => {
    const t = i / 25;
    const startX = 680 + i * 36;
    const startY = -60;
    const cp1X = 980 + i * 24;
    const cp1Y = 160 + i * 18;
    const cp2X = 1480 - i * 12;
    const cp2Y = 460 + i * 14;
    const endX = 1100 + i * 22;
    const endY = 980;

    return (
      <path
        key={`right-${i}`}
        d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
        className="parametric-curve right-curve"
        style={{
          strokeOpacity: 0.12 + t * 0.24,
          animationDelay: `${i * 0.06}s`
        }}
      />
    );
  });

  // Flowing top-to-bottom right wave fan
  const rightFanCurves = Array.from({ length: 20 }).map((_, i) => {
    const t = i / 19;
    const startX = 1200 + i * 22;
    const startY = -40;
    const cp1X = 1520 - i * 14;
    const cp1Y = 320 + i * 20;
    const cp2X = 1380 + i * 10;
    const cp2Y = 680 - i * 16;
    const endX = 1680;
    const endY = 820 - i * 24;

    return (
      <path
        key={`right-fan-${i}`}
        d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
        className="parametric-curve right-fan-curve"
        style={{
          strokeOpacity: 0.09 + t * 0.18
        }}
      />
    );
  });

  return (
    <div className="parametric-bg-container" aria-hidden="true">
      <svg
        className="parametric-svg-canvas"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="curveGradLeft" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7B6F62" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#B7AFA6" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#E8E3DB" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="curveGradRight" x1="50%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B7AFA6" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#7B6F62" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#E8E3DB" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <g className="parametric-group left-group" stroke="url(#curveGradLeft)" strokeWidth="1.1">
          {leftCurves}
          {leftCrossCurves}
        </g>

        <g className="parametric-group right-group" stroke="url(#curveGradRight)" strokeWidth="1.1">
          {rightCurves}
          {rightFanCurves}
        </g>
      </svg>

      {/* Soft center ambient radial mask so content in the center is crystal clear */}
      <div className="parametric-center-glow" />
    </div>
  );
}

export default ParametricBackground;
