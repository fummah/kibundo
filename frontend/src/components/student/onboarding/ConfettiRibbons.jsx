import React from 'react';

/**
 * ConfettiRibbons Component
 * Reusable confetti ribbons animation for celebratory screens
 * 
 * @param {Number} count - Number of ribbons to display (default: 3)
 * @param {Number} duration - Animation duration in seconds (default: 16)
 * @param {Number} fadeAt - Y position where ribbons fade out in pixels (default: 480)
 * @param {Number} leftPosition - Left position of ribbons in pixels (default: 233)
 * @param {String} imageSrc - Source path for confetti image (default: '/images/img_confetti.svg')
 */
const ConfettiRibbons = ({
  count = 6,
  duration = 16,
  fadeAt = 480,
  leftPosition = 233,
  imageSrc = '/images/img_confetti.svg'
}) => {
  // Calculate delay spacing for continuous falling without breaks
  // All ribbons start at the same time (0 seconds delay between them)
  const delaySpacing = 0;
  
  // Check if we should center the confetti (if leftPosition is null or undefined)
  const isCentered = leftPosition === null || leftPosition === undefined;
  
  // Create individual ribbon configurations with unique properties
  const ribbonConfigs = Array.from({ length: count }, (_, index) => {
    const spread = 40;
    const step = spread / (count - 1 || 1);
    const splashOffset = -spread / 2 + index * step;
    
    // Individual variations for each ribbon
    const variations = [
      { splashX: 20, splashRotate: 5, speed: 1.0 },
      { splashX: -15, splashRotate: -3, speed: 0.9 },
      { splashX: 25, splashRotate: 7, speed: 1.1 },
      { splashX: -20, splashRotate: -5, speed: 0.95 },
      { splashX: 15, splashRotate: 4, speed: 1.05 },
      { splashX: -25, splashRotate: -7, speed: 0.85 }
    ];
    
    const variation = variations[index % variations.length];
    const individualDuration = duration * variation.speed;
    
    return {
      left: isCentered ? null : leftPosition + splashOffset,
      leftOffset: isCentered ? splashOffset : 0, // For centered mode, apply offset via transform
      delay: index * delaySpacing,
      animationName: `confettiFall${index}`,
      splashX: variation.splashX,
      splashRotate: variation.splashRotate,
      duration: individualDuration
    };
  });

  return (
    <>
      <style>{`
        ${ribbonConfigs.map((config, index) => {
          // When centered, include the leftOffset in the animation transforms
          // For centered mode, we need to center the element (translateX(-50%)) plus the offset
          const baseX = config.leftOffset || 0;
          const isCentered = config.left === null;
          
          // Calculate the X translation: if centered, use calc(-50% + offset), otherwise just offset
          const getTranslateX = (offset) => {
            if (isCentered) {
              return `calc(-50% + ${offset}px)`;
            }
            return `${offset}px`;
          };
          
          return `
          @keyframes confettiFall${index} {
            0% {
              transform: translateX(${getTranslateX(baseX)}) translateY(-488px) rotate(0deg);
              opacity: 1;
            }
            5% {
              transform: translateX(${getTranslateX(baseX + config.splashX)}) translateY(-400px) rotate(${config.splashRotate}deg);
              opacity: 1;
            }
            10% {
              transform: translateX(${getTranslateX(baseX - config.splashX * 0.75)}) translateY(-300px) rotate(${-config.splashRotate * 0.6}deg);
              opacity: 0.95;
            }
            65% {
              transform: translateX(${getTranslateX(baseX)}) translateY(${fadeAt - 50}px) rotate(0deg);
              opacity: 0.7;
            }
            75% {
              transform: translateX(${getTranslateX(baseX)}) translateY(${fadeAt}px) rotate(0deg);
              opacity: 0;
            }
            100% {
              transform: translateX(${getTranslateX(baseX)}) translateY(${fadeAt}px) rotate(0deg);
              opacity: 0;
            }
          }
        `;
        }).join('')}
      `}</style>
      
      {/* Individual Confetti Ribbons - Each with unique animation */}
      {ribbonConfigs.map((ribbon, index) => (
        <img
          key={index}
          src={imageSrc}
          alt="Confetti ribbon"
          className={ribbon.left === null ? "absolute left-1/2" : "absolute"}
          style={{
            ...(ribbon.left !== null ? { left: `${ribbon.left}px` } : {}),
            top: '0px',
            width: 'clamp(400px, 63.6vw, 814.19px)',
            height: 'clamp(240px, 38.125vh, 488px)',
            objectFit: 'contain',
            zIndex: 9999,
            pointerEvents: 'none',
            animation: `${ribbon.animationName} ${ribbon.duration}s ease-in infinite`,
            animationDelay: `${ribbon.delay}s`
          }}
        />
      ))}
    </>
  );
};

export default ConfettiRibbons;

