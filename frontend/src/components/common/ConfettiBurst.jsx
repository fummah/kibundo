import React, { useEffect } from "react";

// localStorage keys
const PROGRESS_KEY = "kibundo.homework.progress.v1";
const CONFETTI_KEY = "kibundo.confetti.shown.v1";

/**
 * Fires a short canvas-confetti burst ONCE per taskId.
 * If no taskId is supplied, it still fires once per session (page load).
 * If forceShow is true, it will always show regardless of previous state.
 */
export default function ConfettiBurst({ taskId, forceShow = false }) {
  useEffect(() => {
    let cancelled = false;

    const shown = (() => {
      try { return JSON.parse(localStorage.getItem(CONFETTI_KEY) || "{}"); }
      catch { return {}; }
    })();

    const key = taskId || "__no_task__";
    if (!forceShow && shown[key]) return; // already shown for this task (unless forced)

    // Mark as shown immediately to avoid duplicates if user re-renders (unless forced)
    if (!forceShow) {
      try {
        localStorage.setItem(CONFETTI_KEY, JSON.stringify({ ...shown, [key]: true }));
      } catch {}
    }

    (async () => {
      const mod = await import("canvas-confetti").catch(() => null);
      if (!mod || cancelled) return;
      const confetti = mod.default || mod;

      // Ensure canvas-confetti canvas is on top of everything and constrained to shell
      // canvas-confetti creates canvas elements directly in the body
      const styleId = 'confetti-canvas-style';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        
        // Find the shell container (desktop: max-w-[1024px], mobile: full width)
        const shellContainer = document.querySelector('.max-w-\\[1024px\\]') || 
                              document.getElementById('chat-root')?.parentElement ||
                              document.body;
        
        // Calculate shell bounds for desktop
        const isDesktop = window.innerWidth >= 768;
        let leftConstraint = '0';
        let rightConstraint = 'auto';
        let widthConstraint = '100%';
        
        if (isDesktop && shellContainer && shellContainer !== document.body) {
          const rect = shellContainer.getBoundingClientRect();
          leftConstraint = `${rect.left}px`;
          widthConstraint = `${rect.width}px`;
        }
        
        styleEl.textContent = `
          body > canvas {
            z-index: 99999 !important;
            position: fixed !important;
            pointer-events: none !important;
            top: 0 !important;
            left: ${leftConstraint} !important;
            width: ${widthConstraint} !important;
            right: ${rightConstraint} !important;
          }
        `;
        document.head.appendChild(styleEl);
      }

      // Optimized confetti configuration for smooth performance
      const confettiConfig = {
        particleCount: 50, // Reduced for better performance
        spread: 70,
        origin: { x: 0.5, y: 0.05 },
        colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#b892ff'],
        startVelocity: 30,
        gravity: 0.8,
        ticks: 100, // Reduced ticks for smoother animation
        decay: 0.92,
        drift: 0,
        scalar: 1,
        zIndex: 99999,
        disableForReducedMotion: true, // Respect user preferences
      };

      // Use requestAnimationFrame for smooth timing
      requestAnimationFrame(() => {
        if (!cancelled) {
          // Single optimized burst from center
          confetti(confettiConfig);
          
          // Additional bursts with slight delays for layered effect
          const additionalBursts = [
            { x: 0.25, delay: 100 },
            { x: 0.75, delay: 150 },
          ];

          additionalBursts.forEach((burst) => {
            setTimeout(() => {
              if (!cancelled) {
                requestAnimationFrame(() => {
                  if (!cancelled) {
                    confetti({
                      ...confettiConfig,
                      origin: { x: burst.x, y: 0.05 },
                      particleCount: 30, // Fewer particles for side bursts
                    });
                  }
                });
              }
            }, burst.delay);
          });
        }
      });
    })();

    return () => { 
      cancelled = true;
      // Clean up canvas elements after animation completes
      setTimeout(() => {
        const canvases = document.querySelectorAll('body > canvas');
        canvases.forEach(canvas => {
          // Only remove canvas-confetti canvases (they have specific dimensions)
          if (canvas.width && canvas.height && canvas.style.position === 'fixed') {
            canvas.remove();
          }
        });
      }, 5000); // Wait for animations to complete
    };
  }, [taskId, forceShow]);

  return null;
}
