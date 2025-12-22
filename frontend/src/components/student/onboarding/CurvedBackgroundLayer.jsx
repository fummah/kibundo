// src/components/student/onboarding/CurvedBackgroundLayer.jsx
import React from "react";

/**
 * CurvedBackgroundLayer
 * A reusable background layer with a curved top edge for onboarding pages.
 * Responsive design that adapts to all screen sizes.
 * 
 * Props:
 *  - top (string|number|undefined): Top position - defaults to responsive 42.9%
 *  - bottom (string|number|undefined): Bottom position - if provided, positions from bottom instead of top
 *  - width (string|undefined): Width - defaults to '100%' for responsive design
 *  - height (string|undefined): Height - defaults to responsive 43.75% (560/1280 of width)
 *  - backgroundColor (string): Background color (default: '#F4EDE6')
 *  - clipPath (string): Custom clip path (optional, uses default curved path if not provided)
 */
export default function CurvedBackgroundLayer({
  top,
  bottom,
  width,
  height,
  backgroundColor = '#F4EDE6',
  clipPath,
}) {
  // Responsive defaults based on 1280px base design
  // top: 42.9%, height: 560/1280 = 43.75%
  // Very dramatic curve using cubic bezier for smoother, more visible arch
  // Edges at 30%, center peak at -100% for extremely visible curve
  const defaultClipPath = 'path("M 0,30% C 25%,15% 25%,-100% 50%,-100% C 75%,-100% 75%,15% 100%,30% L 100%,43.75% L 0,43.75% Z")';
  
  const style = {
    width: width || '100%',
    height: height !== undefined
      ? (typeof height === 'number' ? `${height}px` : height)
      : '43.75%', // 560/1280 responsive, but use min-height for better scaling
    minHeight: height !== undefined ? undefined : '560px', // Keep minimum height
    backgroundColor,
    clipPath: clipPath || defaultClipPath,
  };

  // Position from bottom if bottom prop is provided, otherwise from top
  if (bottom !== undefined) {
    style.bottom = typeof bottom === 'number' ? `${bottom}px` : bottom;
  } else {
    style.top = top !== undefined 
      ? (typeof top === 'number' ? `${top}px` : top)
      : '42.9%'; // Updated to 42.9%
  }
  
  return (
    <div
      className="absolute inset-x-0"
      style={style}
    />
  );
}
