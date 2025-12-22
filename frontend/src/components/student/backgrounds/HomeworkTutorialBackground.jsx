import React, { useEffect, useState } from 'react';

/**
 * Background for Homework Tutorial (HomeworkExplainer).
 * Uses contain to avoid cropping and fills viewport height.
 */
const HomeworkTutorialBackground = () => {
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
    ? 'clamp(250px, 48.625vw, 320px)'
    : 'clamp(250px, 48.625vw, 389px)';
  const layerHeight = isPortrait
    ? 'calc(100vh - clamp(250px, 48.625vw, 320px))'
    : 'calc(100vh - clamp(250px, 48.625vw, 389px))';
  const layerMinHeight = 'clamp(300px, 55.125vw, 441px)';

  return (
    <>
      {/* Main background image */}
      <div className="fixed inset-0 w-full h-full z-0">
        <img
          src="/images/img_background.png"
          alt="Background"
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            objectFit: 'cover', 
            objectPosition: 'center top',
            minHeight: '100vh',
            height: '100vh'
          }}
        />
      </div>

      {/* Sand layer */}
      <img
        src="/images/img_home_background_layer.svg"
        alt="Background layer"
        className="absolute left-0 w-full z-0"
        style={{
          top: layerTop,
          height: layerHeight,
          minHeight: layerMinHeight,
          objectFit: 'cover',
          objectPosition: 'center bottom'
        }}
      />
    </>
  );
};

export default HomeworkTutorialBackground;

