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

      // Multiple bursts from different positions across the top of the screen
      const burstPositions = [
        { x: 0.1, y: 0.05 }, // Left side - from top
        { x: 0.3, y: 0.05 }, // Left-center - from top
        { x: 0.5, y: 0.05 }, // Center - from top
        { x: 0.7, y: 0.05 }, // Right-center - from top
        { x: 0.9, y: 0.05 }, // Right side - from top
      ];

      // Fire bursts from multiple positions with slight delays for a shower effect
      // Use requestAnimationFrame for smoother timing
      const fireBurst = (pos, delay) => {
        setTimeout(() => {
          if (!cancelled) {
            requestAnimationFrame(() => {
              if (!cancelled) {
                confetti({
                  particleCount: 100,
                  spread: 120, // Wider spread for full screen coverage
                  origin: pos,
                  colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#b892ff', '#ff9a56', '#ffcc5c'],
                  startVelocity: 45,
                  gravity: 0.8,
                  ticks: 200, // More ticks for smoother animation
                  decay: 0.94, // Slower decay for longer animation
                });
              }
            });
          }
        }, delay);
      };

      burstPositions.forEach((pos, index) => {
        fireBurst(pos, index * 80); // Reduced delay for smoother effect
      });

      // Additional center burst for extra celebration - from top
      setTimeout(() => {
        if (!cancelled) {
          requestAnimationFrame(() => {
            if (!cancelled) {
              confetti({
                particleCount: 150,
                spread: 180, // Maximum spread for full screen
                origin: { x: 0.5, y: 0.05 }, // From top of page
                colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#b892ff', '#ff9a56', '#ffcc5c'],
                startVelocity: 50,
                gravity: 0.9,
                ticks: 200, // More ticks for smoother animation
                decay: 0.94, // Slower decay for longer animation
              });
            }
          });
        }
      }, 250); // Reduced delay
    })();

    return () => { cancelled = true; };
  }, [taskId]);

  return null;
}
