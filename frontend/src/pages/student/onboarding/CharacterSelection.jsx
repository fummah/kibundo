import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useStudentId } from "@/hooks/useStudentId.js";
import { saveStudentPreferences } from "@/utils/saveStudentPreferences.js";

const CharacterSelection = () => {
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const navigate = useNavigate();
  const studentId = useStudentId();

  const characters = [
    {
      id: 1,
      src: "/images/img_rectangle_20.png",
      alt: "Character 1 - Boy with striped shirt"
    },
    {
      id: 2,
      src: "/images/img_rectangle_20_264x174.png", 
      alt: "Character 2 - Girl with red hair"
    },
    {
      id: 3,
      src: "/images/img_rectangle_20_1.png",
      alt: "Character 3 - Boy with blonde hair"
    },
    {
      id: 4,
      src: "/images/img_rectangle_20_2.png",
      alt: "Character 4 - Girl with dark hair"
    },
    {
      id: 5,
      src: "/images/img_rectangle_20_3.png",
      alt: "Character 5 - Boy with curly hair"
    },
    {
      id: 6,
      src: "/images/img_rectangle_20_4.png",
      alt: "Character 6 - Girl with blonde braids"
    }
  ];

  const handleCharacterSelect = async (characterId) => {
    setSelectedCharacter(characterId);
    
    // Save character selection to database immediately
    if (studentId) {
      const characterPrompt = "Wähle Deine Figur aus die dich begleitet.";
      
      await saveStudentPreferences({
        studentId,
        preferences: {
          characterSelection: characterId,
        },
        prompts: {
          characterSelection: characterPrompt,
        },
      });
    }
  };

  // Navigate to first interest preference page after character selection with a short delay
  useEffect(() => {
    if (selectedCharacter) {
      const navigationTimeout = setTimeout(() => {
        navigate('/student/onboarding/robot-vs-magic', {
          state: { selectedCharacterId: selectedCharacter }
        });
      }, 1000); // 1 second delay after selection

      return () => clearTimeout(navigationTimeout);
    }
  }, [selectedCharacter, navigate]);

  return (
    <>
      <Helmet>
        <title>Wähle Dein Lern-Begleiter | Kibundo Charakter-Auswahl</title>
        <meta name="description" content="Wähle Deinen persönlichen Lern-Begleiter aus 6 verschiedenen Charakteren. Dein Kibundo-Maskottchen wird Dich durch alle Hausaufgaben und Lernaktivitäten begleiten." />
        <meta property="og:title" content="Wähle Dein Lern-Begleiter | Kibundo Charakter-Auswahl" />
        <meta property="og:description" content="Wähle Deinen persönlichen Lern-Begleiter aus 6 verschiedenen Charakteren. Dein Kibundo-Maskottchen wird Dich durch alle Hausaufgaben und Lernaktivitäten begleiten." />
      </Helmet>
      <div className="relative w-full min-h-screen overflow-hidden flex items-center justify-center">
        <main 
          className="relative overflow-hidden"
          style={{ 
            width: '1280px', 
            height: '800px',
            maxWidth: '100%',
            maxHeight: '100vh',
            backgroundColor: 'transparent',
            zIndex: 1,
            boxSizing: 'border-box',
            paddingTop: 'clamp(24px, 3vh, 48px)',
            paddingLeft: 'clamp(24px, 3vw, 48px)',
            paddingRight: 'clamp(24px, 3vw, 48px)'
          }}
        >

        {/* Interessen Title - positioned higher, always centered */}
        <h1 
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{
            top: 'clamp(12px, 1.5vh, 24px)',
            width: 'clamp(200px, 20.4vw, 261px)',
            height: 'auto',
            minHeight: 'clamp(40px, 5.3vw, 68px)',
            fontFamily: 'Nunito',
            fontWeight: 900,
            fontSize: 'clamp(32px, 3.9vw, 50px)',
            lineHeight: '1.36',
            letterSpacing: '1%',
            textAlign: 'center',
            color: '#544C3B',
            paddingTop: 'clamp(12px, 1.5vh, 24px)',
            paddingBottom: 'clamp(12px, 1.5vh, 24px)'
          }}
        >
          Interessen
        </h1>

        {/* Left Character - positioned from middle going up */}
        <img
          src="/images/img_ebene_1.png"
          alt="Left character"
          className="absolute left-0 hidden md:block"
          style={{
            top: '50%',
            transform: 'translateY(-100%)',
            width: 'clamp(200px, 33.67vw, 431px)',
            height: 'auto',
            aspectRatio: '431 / 447.12',
            objectFit: 'cover',
            maxWidth: '431px',
            zIndex: 0
          }}
        />

        {/* Right Character - positioned from middle going up */}
        <img
          src="/images/img_ebene_1_446x260.png"
          alt="Right character"
          className="absolute right-0 hidden md:block"
          style={{
            top: '50%',
            transform: 'translateY(-100%)',
            width: 'clamp(150px, 25.86vw, 331px)',
            height: 'auto',
            aspectRatio: '331 / 447.12',
            objectFit: 'cover',
            maxWidth: '331px',
            zIndex: 0
          }}
        />

        {/* Back Button - positioned higher */}
        <button
          onClick={() => navigate('/student/onboarding/welcome-intro')}
          className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
          style={{
            left: 'clamp(12px, 1.5vw, 48px)',
            top: 'clamp(12px, 1.5vh, 24px)',
            width: '48px',
            height: '48px',
            backgroundColor: '#D9D9D9',
            padding: 'clamp(8px, 1vh, 12px)'
          }}
          aria-label="Back button"
        >
          <img
            src="/images/img_vector_gray_800.svg"
            alt="Back arrow"
            style={{
              width: '18px',
              height: '30px'
            }}
          />
        </button>

        {/* Kibundo Component - 350x225 at x:403, y:218 */}
        <div 
          className="absolute"
          style={{
            left: '403px',
            top: '218px',
            width: '350px',
            height: '225px'
          }}
        >
          {/* Kibundo Character Image - 108.47x212.84 at x:241.14, y:6.08 relative to component */}
          <img
            src="/images/img_kibundo.png"
            alt="Kibundo mascot"
            className="absolute"
            style={{
              left: '241.14px',
              top: '6.08px',
              width: '108.47px',
              height: '212.84px',
              objectFit: 'contain'
            }}
          />

          {/* Sound Button - 48x48 at x:108, y:28 relative to component */}
          <button
            className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
            style={{
              left: '108px',
              top: '28px',
              width: '48px',
              height: '48px',
              backgroundColor: '#FFFFFF',
              boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
              padding: 'clamp(8px, 1vh, 12px)',
              boxSizing: 'border-box'
            }}
            aria-label="Sound button"
          >
            <img
              src="/images/img_sound_button_01.svg"
              alt="Sound"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </button>

          {/* Repeat Button - 48x48 at x:176, y:28 relative to component */}
          <button
            className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
            style={{
              left: '176px',
              top: '28px',
              width: '48px',
              height: '48px',
              backgroundColor: '#FFFFFF',
              boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
              padding: 'clamp(8px, 1vh, 12px)',
              boxSizing: 'border-box'
            }}
            aria-label="Repeat button"
          >
            <img
              src="/images/img_repeat_button.svg"
              alt="Repeat"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </button>

          {/* Speech Bubble - responsive, text contains properly */}
          <div 
            className="absolute"
            style={{
              left: 'clamp(7px, 0.55vw, 7px)',
              top: 'clamp(97px, 12.125vh, 97px)',
              width: 'clamp(160px, 16.56vw, 212px)',
              minHeight: 'auto'
            }}
          >
            {/* Speech Bubble Arrow - responsive */}
            <img
              src="/images/img_vector.svg"
              alt="Speech indicator"
              className="absolute"
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
                top: '-18px',
                width: 'clamp(40px, 4.31vw, 55.21px)',
                height: 'auto',
                aspectRatio: '55.21 / 25.32'
              }}
            />
            
            {/* Speech Bubble Content */}
            <div 
              className="rounded-[18px] border"
              style={{
                width: '100%',
                minHeight: 'clamp(60px, 7.5vh, 86px)',
                backgroundColor: '#D9F98D',
                borderColor: '#E1EAAC',
                borderWidth: '1px',
                boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.25)',
                padding: 'clamp(12px, 1.5vh, 18px)',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <p 
                className="text-left w-full"
                style={{ 
                  fontFamily: 'Nunito',
                  fontWeight: 400,
                  fontSize: 'clamp(14px, 1.4vw, 18px)',
                  lineHeight: '1.36',
                  color: '#000000',
                  margin: 0,
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}
              >
                Wähle Deine Figur aus die dich begleitet.
              </p>
            </div>
          </div>
        </div>

        {/* Character Selection Frame 33 - responsive container with 6 buttons */}
        <div 
          className="absolute left-1/2 transform -translate-x-1/2 flex flex-row flex-wrap justify-center items-center"
          style={{
            bottom: '0px',
            width: '100%',
            maxWidth: '1280px',
            minHeight: 'clamp(200px, 37.5vh, 300px)',
            paddingTop: 'clamp(12px, 2.25vh, 18px)',
            paddingBottom: 'clamp(12px, 2.25vh, 18px)',
            paddingLeft: 'clamp(8px, 1vw, 16px)',
            paddingRight: 'clamp(8px, 1vw, 16px)',
            gap: 'clamp(6px, 0.78vw, 10px)',
            boxSizing: 'border-box'
          }}
        >
          {characters.map((character, index) => (
            <button
              key={character.id}
              onClick={() => handleCharacterSelect(character.id)}
              className={`overflow-hidden transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 flex-shrink-0 ${
                selectedCharacter === character.id ? 'ring-2 ring-green-500 scale-105' : ''
              }`}
              style={{
                width: 'clamp(100px, 13.67vw, 175px)',
                height: 'auto',
                aspectRatio: '175 / 264',
                minWidth: '100px',
                maxWidth: '175px',
                borderRadius: 'clamp(12px, 1.25vw, 16px)',
                border: '1px solid',
                boxShadow: '2px 2px 5px rgba(0, 0, 0, 0.25)',
                borderColor: index === 0 ? '#88AAA7' : 
                            index === 1 ? '#E27474' : 
                            index === 2 ? '#ECC5AA' : 
                            index === 3 ? '#3ABBC1' : 
                            index === 4 ? '#DDBD9F' : '#87A01D',
                boxSizing: 'border-box'
              }}
              aria-label={character.alt}
            >
              <img
                src={character.src}
                alt={character.alt}
                className="w-full h-full object-contain"
                style={{
                  objectFit: 'contain'
                }}
              />
            </button>
          ))}
        </div>
        </main>
      </div>
    </>
  );
};

export default CharacterSelection;
