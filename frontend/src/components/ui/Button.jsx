import React from 'react';
import { cva } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const buttonClasses = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-95',
  {
    variants: {
      variant: {
        primary: 'focus:ring-green-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
        outline: 'border-2 bg-transparent hover:bg-opacity-10 focus:ring-green-500',
        ghost: 'bg-transparent hover:bg-opacity-10',
      },
      size: {
        small: 'text-sm px-3 py-1.5',
        medium: 'text-base px-4 py-2',
        large: 'text-lg px-6 py-3',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'medium',
    },
  }
);

// Helper function to check if a value is a pixel value (e.g., "18px", "25px")
const isPixelValue = (value) => {
  return typeof value === 'string' && /^\d+px$/.test(value.trim());
};

// Helper function to check if a value is a hex color (e.g., "#000000", "#d8efee")
const isHexColor = (value) => {
  return typeof value === 'string' && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value.trim());
};

// Helper function to check if a value is a CSS border value
const isBorderValue = (value) => {
  return typeof value === 'string' && value.includes('solid') || value.includes('border');
};

const Button = ({
  // Required parameters with defaults
  text = "",
  text_font_size = "18px",
  text_font_family = "Poppins",
  text_font_weight = "400",
  text_line_height = "24px",
  text_text_align = "center",
  text_color = "#000000",
  fill_background_color = "#d8efee",
  border_border = "1px solid #9cd3d6",
  border_border_radius = "16px",
  
  // Optional parameters (no defaults)
  layout_width,
  padding,
  margin,
  position,
  
  // Standard React props
  variant,
  size,
  disabled = false,
  className,
  children,
  onClick,
  type = "button",
  ...props
}) => {
  // Safe validation for optional parameters
  const hasValidWidth = layout_width && typeof layout_width === 'string' && layout_width?.trim() !== '';
  const hasValidPadding = padding && typeof padding === 'string' && padding?.trim() !== '';
  const hasValidMargin = margin && typeof margin === 'string' && margin?.trim() !== '';
  const hasValidPosition = position && typeof position === 'string' && position?.trim() !== '';

  // Determine if we should use inline styles or Tailwind classes
  // Use inline styles if values are pixel/hex colors, use Tailwind classes if they're class names
  const useInlineStyles = 
    isPixelValue(text_font_size) || 
    isHexColor(text_color) || 
    isHexColor(fill_background_color) || 
    isBorderValue(border_border) ||
    isPixelValue(border_border_radius);

  // Build optional Tailwind classes
  const optionalClasses = [
    hasValidWidth ? `w-[${layout_width}]` : '',
    hasValidPadding ? `p-[${padding}]` : '',
    hasValidMargin ? `m-[${margin}]` : '',
    hasValidPosition ? position : '',
  ]?.filter(Boolean)?.join(' ');

  // Build classes and styles based on value types
  let requiredClasses = [];
  let buttonStyles = {};

  if (useInlineStyles) {
    // Use inline styles for pixel/hex values
    buttonStyles = {
      fontSize: text_font_size,
      fontFamily: text_font_family,
      fontWeight: text_font_weight,
      lineHeight: text_line_height,
      textAlign: text_text_align,
      color: text_color,
      backgroundColor: fill_background_color,
      border: border_border,
      borderRadius: border_border_radius,
    };
  } else {
    // Use Tailwind classes for class name values
    requiredClasses = [
      text_font_size && !isPixelValue(text_font_size) ? text_font_size : '',
      text_font_weight && !/^\d+$/.test(text_font_weight) ? text_font_weight : '',
      text_line_height && !isPixelValue(text_line_height) ? text_line_height : '',
      text_text_align === "left" ? "text-left" : 
      text_text_align === "center" ? "text-center" : 
      text_text_align === "right" ? "text-right" : 
      text_text_align || "text-left",
      text_color && !isHexColor(text_color) ? text_color : '',
      fill_background_color && !isHexColor(fill_background_color) ? fill_background_color : '',
      border_border_radius && !isPixelValue(border_border_radius) ? border_border_radius : '',
      border_border && !isBorderValue(border_border) ? `border ${border_border}` : '',
    ].filter(Boolean);

    // Always set font family in styles (not always available in Tailwind)
    buttonStyles = {
      fontFamily: text_font_family || 'Poppins',
    };
  }

  // Safe click handler
  const handleClick = (event) => {
    if (disabled) return;
    if (typeof onClick === 'function') {
      onClick(event);
    }
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      style={buttonStyles}
      className={twMerge(
        buttonClasses({ variant, size }),
        requiredClasses,
        optionalClasses,
        className
      )}
      aria-disabled={disabled}
      {...props}
    >
      {children || text}
    </button>
  );
};

export default Button;

