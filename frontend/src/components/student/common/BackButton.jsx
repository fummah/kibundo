// src/components/student/common/BackButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * BackButton
 * - Navigates back one step in history
 * - Positioned absolutely top-left by default
 */
export default function BackButton({
  className = "absolute left-0 top-2 pt-8 p-2 rounded-full hover:bg-black/5 active:scale-95",
  ariaLabel = "Back",
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label={ariaLabel}
      className={className}
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
