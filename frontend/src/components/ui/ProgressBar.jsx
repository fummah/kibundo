import React from 'react';
import { cva } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const progressBarClasses = cva(
  'relative overflow-hidden transition-all duration-300',
  {
    variants: {
      size: {
        small: 'h-2',
        medium: 'h-3',
        large: 'h-4',
      },
      variant: {
        default: '',
        striped: 'bg-striped',
        animated: 'animate-pulse',
      },
    },
    defaultVariants: {
      size: 'medium',
      variant: 'default',
    },
  }
);

const progressFillClasses = cva(
  'h-full transition-all duration-500 ease-in-out',
  {
    variants: {
      color: {
        primary: 'bg-green-500',
        secondary: 'bg-blue-500',
        success: 'bg-green-600',
        warning: 'bg-yellow-500',
        danger: 'bg-red-500',
      },
    },
    defaultVariants: {
      color: 'primary',
    },
  }
);

const ProgressBar = ({
  // Required parameters with defaults
  fill_background_color = "bg-progressbar-background",
  border_border_radius = "rounded-progress",
  effect_box_shadow = "0px 0px 3px #0000003f",
  
  // Optional parameters (no defaults)
  layout_width,
  margin,
  position,
  
  // Progress specific props
  progress = 0,
  max = 100,
  min = 0,
  showPercentage = false,
  color = 'primary',
  size,
  variant,
  animated = false,
  striped = false,
  
  // Standard React props
  className,
  children,
  ...props
}) => {
  // Safe validation for optional parameters
  const hasValidWidth = layout_width && typeof layout_width === 'string' && layout_width?.trim() !== '';
  const hasValidMargin = margin && typeof margin === 'string' && margin?.trim() !== '';
  const hasValidPosition = position && typeof position === 'string' && position?.trim() !== '';

  // Calculate percentage
  const percentage = Math.min(Math.max(((progress - min) / (max - min)) * 100, 0), 100);

  // Build optional Tailwind classes
  const optionalClasses = [
    hasValidWidth ? `w-[${layout_width}]` : 'w-full',
    hasValidMargin ? `m-[${margin}]` : '',
    hasValidPosition ? position : '',
  ]?.filter(Boolean)?.join(' ');

  // Helper to check if value is a Tailwind class (starts with bg-, text-, etc.)
  const isTailwindClass = (value) => {
    return typeof value === 'string' && (
      value.startsWith('bg-') || 
      value.startsWith('text-') || 
      value.startsWith('rounded-') ||
      value.startsWith('border-')
    );
  };

  // Build required parameter classes
  const requiredClasses = [
    fill_background_color === "#f4ede6" 
      ? "bg-progressbar-background" 
      : isTailwindClass(fill_background_color)
        ? fill_background_color
        : `bg-[${fill_background_color}]`,
    border_border_radius === "6px" 
      ? "rounded-progress" 
      : isTailwindClass(border_border_radius)
        ? border_border_radius
        : `rounded-[${border_border_radius}]`,
  ]?.join(' ');

  // Build shadow style
  const shadowStyle = effect_box_shadow === "0px 0px 3px #0000003f" 
    ? { boxShadow: "0px 0px 3px #0000003f" }
    : { boxShadow: effect_box_shadow };

  // Determine variant based on props
  const finalVariant = animated ? 'animated' : striped ? 'striped' : variant;

  return (
    <div
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={`Progress: ${percentage?.toFixed(1)}%`}
      style={shadowStyle}
      className={twMerge(
        progressBarClasses({ size, variant: finalVariant }),
        requiredClasses,
        optionalClasses,
        'h-[8px] sm:h-[10px] md:h-[12px]',
        className
      )}
      {...props}
    >
      {/* Progress fill */}
      <div
        className={twMerge(
          progressFillClasses({ color }),
          border_border_radius === "6px" ? "rounded-progress" : `rounded-[${border_border_radius}]`,
          animated && 'animate-pulse'
        )}
        style={{ 
          width: `${percentage}%`,
          ...(striped && {
            backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
            backgroundSize: '1rem 1rem'
          })
        }}
      />
      {/* Percentage display */}
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
          {percentage?.toFixed(0)}%
        </div>
      )}
      {/* Custom children content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;

