// src/components/student/onboarding/ResponsiveOnboardingContainer.jsx
import React from "react";

/**
 * ResponsiveOnboardingContainer
 * Wraps onboarding pages to make them responsive across all devices
 * Uses CSS transform scale to maintain aspect ratio while adapting to screen size
 */
export default function ResponsiveOnboardingContainer({ children }) {
  const baseWidth = 1280;
  const baseHeight = 800;

  return (
    <>
      <style>{`
        .onboarding-responsive-wrapper {
          width: 100vw;
          min-height: 100vh;
          max-width: 100vw;
          max-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: transparent;
          position: relative;
        }
        .onboarding-responsive-inner {
          position: relative;
          width: ${baseWidth}px;
          height: ${baseHeight}px;
          max-width: ${baseWidth}px;
          max-height: ${baseHeight}px;
          transform-origin: center center;
          overflow: hidden;
          box-sizing: border-box;
        }
        /* Portrait: fill height exactly, allow some horizontal cropping if needed */
        @media (orientation: portrait) {
          .onboarding-responsive-inner {
            transform: scale(calc(100vh / ${baseHeight}));
          }
        }
        /* Landscape / desktop: fit fully inside viewport without cropping */
        @media (orientation: landscape) {
          .onboarding-responsive-inner {
            transform: scale(min(calc(100vw / ${baseWidth}), calc(100vh / ${baseHeight})));
          }
        }
      `}</style>
      <div className="onboarding-responsive-wrapper">
        <div className="onboarding-responsive-inner">
          {children}
        </div>
      </div>
    </>
  );
}
