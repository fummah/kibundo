import React from 'react';

/**
 * ColorCard Component
 * Reusable color selection card for onboarding screens
 * 
 * @param {Object} color - Color option object with {id, image, alt, name}
 * @param {Boolean} isSelected - Whether this color is currently selected
 * @param {Function} onClick - Function to call when card is clicked
 * @param {String} left - Left position in pixels (e.g., '154px')
 * @param {String} top - Top position in pixels (default: '523px')
 */
const ColorCard = ({ 
  color, 
  isSelected, 
  onClick, 
  left, 
  top = '523px' 
}) => {
  return (
    <button
      onClick={onClick}
      className={`absolute flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 ${
        isSelected ? 'ring-2 ring-green-500 scale-105' : ''
      }`}
      style={{
        left: left,
        top: top,
        width: '225px',
        height: '225px',
        borderRadius: '16px',
        backgroundColor: '#F3E6C8',
        border: '1px solid #ECC5AA',
        boxShadow: '2px 2px 5px rgba(0, 0, 0, 0.25)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      aria-label={`Select ${color.name} color`}
    >
      <div
        style={{
          width: '185px',
          height: '185px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative'
        }}
      >
        <img
          src={color.image}
          alt={color.alt}
          style={{
            width: '185px',
            height: '185px',
            minWidth: '185px',
            minHeight: '185px',
            maxWidth: '185px',
            maxHeight: '185px',
            objectFit: 'scale-down',
            objectPosition: 'center',
            display: 'block',
            flexShrink: 0,
            boxSizing: 'border-box',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>
    </button>
  );
};

export default ColorCard;

