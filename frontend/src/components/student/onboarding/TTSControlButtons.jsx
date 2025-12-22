import React from 'react';

/**
 * TTS Control Buttons Component
 * Reusable speaker and repeat buttons for onboarding screens
 * 
 * @param {Function} onSpeak - Function to call when buttons are clicked
 * @param {Object} soundButtonPosition - Position for sound button {left, top}
 * @param {Object} repeatButtonPosition - Position for repeat button {left, top}
 */
const TTSControlButtons = ({ 
  onSpeak, 
  soundButtonPosition = { left: '108px', top: '28px' },
  repeatButtonPosition = { left: '176px', top: '28px' }
}) => {
  const buttonStyle = {
    width: '48px',
    height: '48px',
    backgroundColor: '#FFFFFF',
    boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
    padding: '12px'
  };

  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  };

  return (
    <>
      {/* Sound Button */}
      <button
        onClick={onSpeak}
        className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
        style={{
          ...buttonStyle,
          left: soundButtonPosition.left,
          top: soundButtonPosition.top
        }}
        aria-label="Sound button"
      >
        <img
          src="/images/img_sound_button_01.svg"
          alt="Sound"
          style={imageStyle}
        />
      </button>

      {/* Repeat Button */}
      <button
        onClick={onSpeak}
        className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
        style={{
          ...buttonStyle,
          left: repeatButtonPosition.left,
          top: repeatButtonPosition.top
        }}
        aria-label="Repeat button"
      >
        <img
          src="/images/img_repeat_button.svg"
          alt="Repeat"
          style={imageStyle}
        />
      </button>
    </>
  );
};

export default TTSControlButtons;

