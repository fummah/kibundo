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
          min-height: var(--onb-vh, 100vh);
          max-width: 100vw;
          max-height: var(--onb-vh, 100vh);
          height: var(--onb-vh, 100vh);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-x: hidden;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          background: transparent;
          position: relative;
          padding-top: env(safe-area-inset-top);
          padding-right: env(safe-area-inset-right);
          padding-bottom: env(safe-area-inset-bottom);
          padding-left: env(safe-area-inset-left);
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
        .absolute.inset-x-0 {
          border-top-left-radius: 100% 45%;
          border-top-right-radius: 100% 45%;
        }
        .arch-box {
          left: 500px;
        }
        @media (max-width: 768px) {
          .arch-box {
            left: unset;
          }
        }
        /* Use 100dvh on mobile browsers where supported (prevents overlap with URL bar). */
        .onboarding-responsive-wrapper { --onb-vh: 100vh; }
        @supports (height: 100dvh) {
          .onboarding-responsive-wrapper { --onb-vh: 100dvh; }
        }
        /* Always scale-to-fit inside the viewport (no cropping). */
        .onboarding-responsive-inner {
          transform: scale(min(calc(100vw / ${baseWidth}), calc(var(--onb-vh, 100vh) / ${baseHeight})));
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
