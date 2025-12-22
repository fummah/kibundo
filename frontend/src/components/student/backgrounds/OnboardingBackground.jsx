import React, { useEffect, useState } from 'react';

/**
 * Background for Onboarding screens.
 * Uses:
 * - Main background from Figma node 1-293 (img_background.png)
 * - Clouds from Figma node 8-331 (img_component_4.svg)
 * - Gradient layer from Figma node 8-394 at the bottom
 */
const OnboardingBackground = () => {
  // Track orientation to adjust layer sizing
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(orientation: portrait)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = (e) => setIsPortrait(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const layerTop = isPortrait
    ? 'clamp(200px, 32.75vw, 262px)'
    : 'clamp(220px, 35vw, 320px)';
  const layerHeight = isPortrait
    ? 'calc(100vh - clamp(200px, 32.75vw, 262px))'
    : 'calc(100vh - clamp(220px, 35vw, 320px))';
  const layerMinHeight = 'clamp(400px, 67.25vw, 538px)';

  return (
    <>
      {/* Main background image from Figma node 1-293 - full viewport */}
      <div 
        className="absolute inset-0 overflow-hidden z-0"
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        <img
          src="/images/img_background.png"
          alt="Background"
          className="absolute w-full h-full"
          style={{
            top: '0px',
            left: '0px',
            objectFit: 'cover',
            objectPosition: 'center center',
            width: '100%',
            height: '100%'
          }}
        />
      </div>

      {/* Clouds Background Component from Figma node 8-331 - responsive */}
      <div 
        className="absolute z-[1]"
        style={{ 
          left: '0px',
          top: '0px',
          width: '100%', 
          height: 'clamp(200px, 51.25vh, 410px)',
          opacity: 0.3
        }}
      >
        <img
          src="/images/img_component_4.svg"
          alt="Clouds"
          className="w-full h-full object-cover opacity-30"
          style={{
            width: '100%',
            height: '100%'
          }}
        />
      </div>

      {/* Sand layer - positioned from middle to bottom, not overlapping */}
      <img
        src="/images/img_home_background_layer.svg"
        alt="Background layer"
        className="absolute left-0 w-full z-0"
        style={{
          top: layerTop,
          height: layerHeight,
          minHeight: layerMinHeight,
          maxHeight: 'calc(100vh - ' + layerTop + ')',
          objectFit: 'cover',
          objectPosition: 'center bottom'
        }}
      />
    </>
  );
};

export default OnboardingBackground;

