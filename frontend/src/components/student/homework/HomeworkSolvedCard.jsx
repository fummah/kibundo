import React, { useEffect, useState } from 'react';

const HomeworkSolvedCard = ({ isOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger animation after a brief delay
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        style={{
          width: '1280px',
          height: '800px',
          margin: '0 auto',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
        onClick={onClose}
      >
        {/* Confetti Background */}
        <img
          src="/images/img_confetti.svg"
          alt="Confetti"
          className="absolute"
          style={{
            left: '-89px',
            top: '0px',
            width: '1309.32px',
            height: '784.76px',
            objectFit: 'contain',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />

        {/* Homework Solved Card Container */}
        <div
          className="absolute"
          style={{
            left: '255px',
            top: '147px',
            width: '770px',
            height: '506px',
            zIndex: 2,
            transform: isVisible ? 'scale(1)' : 'scale(0.8)',
            opacity: isVisible ? 1 : 0,
            transition: 'all 0.3s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Homework Card Frame */}
          <div
            className="absolute"
            style={{
              left: '0px',
              top: '0px',
              width: '770px',
              height: '506px',
              padding: '26px 0px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'stretch',
              alignItems: 'stretch'
            }}
          >
            {/* Homework Card Background */}
            <img
              src="/images/img_homework_card_math.svg"
              alt="Homework card"
              className="absolute"
              style={{
                left: '0px',
                top: '28px',
                width: '770px',
                height: '450px',
                padding: '0px 50px',
                objectFit: 'fill',
                borderRadius: '16px'
              }}
            />

            {/* Overlay with opacity and white stroke */}
            <div
              className="absolute"
              style={{
                left: '0px',
                top: '28px',
                width: '770px',
                height: '450px',
                backgroundColor: '#E6E6E6',
                opacity: 0.5,
                borderRadius: '16px',
                border: '10px solid #FFFFFF',
                boxShadow: '6.16px 6.16px 18.48px rgba(0, 0, 0, 0.4)'
              }}
            />

            {/* Check Icon */}
            <div
              className="absolute"
              style={{
                left: '304px',
                top: '284px',
                width: '162px',
                height: '162px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
            >
              {/* Check Icon Circle */}
              <div
                style={{
                  width: '162px',
                  height: '162px',
                  borderRadius: '50%',
                  backgroundColor: '#FF7831',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.25)'
                }}
              >
                {/* Check Mark SVG */}
                <svg
                  width="106"
                  height="98"
                  viewBox="0 0 106 98"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16 49L38 71L90 19"
                    stroke="#FFFFFF"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Congratulations Text */}
            <div
              className="absolute"
              style={{
                left: '168px',
                top: '102px',
                width: '434px',
                height: '151px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                zIndex: 10
              }}
            >
              <p
                style={{
                  fontFamily: 'Nunito',
                  fontWeight: 400,
                  fontSize: '18px',
                  lineHeight: '24.5px',
                  color: '#544C3B',
                  margin: 0,
                  whiteSpace: 'pre-line'
                }}
              >
                Glückwunsch!{'\n\n'}
                Du hast deine Hausaufgabe geschafft 🎉{'\n'}
                sei stolz auf dich!
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomeworkSolvedCard;

