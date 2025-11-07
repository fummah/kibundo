// src/components/student/common/BackButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * BackButton
 * - Navigates back one step in history
 * - Positioned absolutely top-left by default
 * - Accepts onBeforeNavigate callback to check for unsaved changes
 */
export default function BackButton({
  className = "absolute left-0 top-2 pt-8 p-2 rounded-full hover:bg-black/5 active:scale-95",
  ariaLabel = "Back",
  onBeforeNavigate,
}) {
  const navigate = useNavigate();

  const handleClick = async () => {
    if (onBeforeNavigate) {
      const result = onBeforeNavigate();
      // If callback returns a promise, wait for it
      if (result && typeof result.then === 'function') {
        const shouldNavigate = await result;
        if (shouldNavigate !== false) {
          navigate(-1);
        }
      } else if (result !== false) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className={className}
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
