import React, { useEffect, useState } from 'react';

/**
 * Background for HomeworkHome.
 * Uses contain to preserve full artwork and a responsive layer that fills remaining height.
 */
const HomeworkHomeBackground = () => {
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
      {/* Main background image */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden z-0"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          minHeight: '100vh',
          maxHeight: '100vh',
          overflow: 'hidden'
        }}
      >
        <img
          src="/images/img_background.png"
          alt="Background"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            minWidth: '100%',
            minHeight: '100vh',
            maxHeight: '100vh',
            objectFit: 'contain',
            objectPosition: 'center top',
            display: 'block'
          }}
        />
      </div>

     
     
</>
);
};

export default HomeworkHomeBackground;

