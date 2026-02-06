// src/pages/student/onboarding/ColorPreference.jsx
// Based on fortai_app/src/pages/onboarding/ColorPreference.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import useEnsureGerman from "@/hooks/useEnsureGerman.js";
import { useStudentId } from "@/hooks/useStudentId.js";
import { saveStudentPreferences } from "@/utils/saveStudentPreferences.js";
import TTSControlButtons from "@/components/student/onboarding/TTSControlButtons";
import CurvedBackgroundLayer from "@/components/student/onboarding/CurvedBackgroundLayer";
import ColorCard from "@/components/student/onboarding/ColorCard";
import ResponsiveOnboardingContainer from "@/components/student/onboarding/ResponsiveOnboardingContainer.jsx";

const ColorPreference = () => {
  const { t, i18n } = useTranslation();
  const ready = useEnsureGerman(i18n);
  const navigate = useNavigate();
  const location = useLocation();
  const { buddy, ttsEnabled, profile, theme } = useStudentApp();
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(orientation: portrait)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = (e) => setIsPortrait(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  
  // Helper to get safe buddy image (filter out character data)
  const getSafeBuddyImage = () => {
    if (!buddy) return "/images/img_kibundo.png";
    // Check if buddy has character data
    const isCharacter = 
      buddy.name?.toLowerCase().includes("character") ||
      (typeof buddy.id === "number" && buddy.id >= 1 && buddy.id <= 6) ||
      (typeof buddy.id === "string" && /^[1-6]$/.test(buddy.id)) ||
      buddy.img?.includes("img_rectangle_20") ||
      buddy.avatar?.includes("img_rectangle_20");
    if (isCharacter) {
      // Return default kibundo buddy image
      return "/images/img_kibundo.png";
    }
    return buddy.img || buddy.avatar || "/images/img_kibundo.png";
  };
  const { user, account } = useAuthContext();
  const [selectedColor, setSelectedColor] = useState(null);
  const hasSpokenRef = useRef(false); // Guard to prevent double reading

  // Get the effective student ID using the hook
  const studentId = useStudentId();

  const textToSpeak = "Welche Farbe gefällt Dir am meisten?";

  // Simple speak function for buttons
  const speak = () => {
    if (!textToSpeak) return;
    try {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(textToSpeak);
      u.lang = "de-DE";
      window.speechSynthesis.speak(u);
    } catch {}
  };

  useEffect(() => {
    if (ttsEnabled && ready && !hasSpokenRef.current) {
      hasSpokenRef.current = true; // Mark as spoken
      const timer = setTimeout(() => {
        try {
          const u = new SpeechSynthesisUtterance(textToSpeak);
          u.lang = "de-DE";
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        } catch {}
      }, 500);

      return () => {
        clearTimeout(timer);
        window.speechSynthesis.cancel();
      };
    }
  }, [ttsEnabled, ready, textToSpeak]);

  const colorOptions = [
    {
      id: 1,
      image: '/images/img_layer_1_red_500.svg',
      alt: 'Red color',
      name: 'Rot'
    },
    {
      id: 2,
      image: '/images/img_layer_1_light_blue_a700.svg',
      alt: 'Blue color',
      name: 'Blau'
    },
    {
      id: 3,
      image: '/images/img_layer_1_green_500.svg',
      alt: 'Green color',
      name: 'Grün'
    },
    {
      id: 4,
      image: '/images/img_layer_1_amber_a400_02.svg',
      alt: 'Yellow color',
      name: 'Gelb'
    }
  ];

  const handleColorSelect = async (colorId) => {
    setSelectedColor(colorId);
    const colorName = colorOptions.find(c => c.id === colorId)?.name || colorId;
    
    // Map color to theme
    const colorToThemeMap = {
      "Rot": "rose",
      "Blau": "sky",
      "Grün": "emerald",
      "Gelb": "amber",
    };
    const mappedTheme = colorToThemeMap[colorName] || theme || "indigo";
    
    // Save preference to database immediately with prompt and theme
    if (studentId) {
      // Extract only preference values, exclude prompts and other state
      const { prompts: existingPrompts = {}, selectedCharacterId, ...existingPreferences } = location.state || {};
      await saveStudentPreferences({
        studentId,
        preferences: {
          ...existingPreferences,
          colorPreference: colorName,
        },
        prompts: {
          ...existingPrompts,
          colorPreference: textToSpeak,
        },
        buddy: buddy || null,
        profile: {
          ...(profile || {}),
          name: profile?.name || "",
          ttsEnabled: ttsEnabled,
          theme: mappedTheme, // Set theme from color preference
        },
      });
    }

    setTimeout(() => {
      // Extract only preference values, exclude prompts and other state
      const { prompts: existingPrompts = {}, selectedCharacterId, ...existingPreferences } = location.state || {};
      navigate('/student/onboarding/creative-activity-preference', {
        state: { 
          ...existingPreferences,
          colorPreference: colorName,
          prompts: {
            ...existingPrompts,
            colorPreference: textToSpeak,
          }
        }
      });
    }, 1000);
  };

  const handleBackClick = () => {
    navigate('/student/onboarding/activity-preference', {
      state: location.state
    });
  };

  if (!ready) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Color Preference Survey | Kids Interactive Learning Adventure</title>
        <meta
          name="description"
          content="Help your child discover their favorite colors through our fun interactive survey. Choose from red, blue, green, or yellow paint palettes in this engaging kids activity."
        />
        <meta property="og:title" content="Color Preference Survey | Kids Interactive Learning Adventure" />
        <meta property="og:description" content="Help your child discover their favorite colors through our fun interactive survey. Choose from red, blue, green, or yellow paint palettes in this engaging kids activity." />
      </Helmet>
      <ResponsiveOnboardingContainer>
        <main 
          className="relative overflow-hidden"
          style={{ 
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            zIndex: 1,
            boxSizing: 'border-box',
            paddingTop: 'clamp(24px, 3vh, 48px)',
            paddingLeft: 'clamp(24px, 3vw, 48px)',
            paddingRight: 'clamp(24px, 3vw, 48px)',
            paddingBottom: 'clamp(80px, 10vh, 120px)'
          }}
        >

        {/* Background Layer - F4EDE6 at y:370, height:560 with smooth top arch from center */}
        <CurvedBackgroundLayer />

        {/* Clouds Background Component - centered and responsive */}
        <div 
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{ 
            top: 'clamp(12px, 1.5vh, 24px)',
            width: 'clamp(400px, 50vw, 800px)', 
            height: 'clamp(150px, 25vh, 300px)',
            opacity: 0.3
          }}
        >
          <img
            src="/images/img_component_4.svg"
            alt="Clouds"
            className="w-full h-full object-contain opacity-30"
          />
        </div>

        {/* Interessen Title - responsive, centered */}
        <h1 
          className="absolute left-1/2 transform -translate-x-1/2 text-center"
          style={{
            top: 'clamp(12px, 1.5vh, 75px)',
            width: 'clamp(200px, 20.4vw, 261px)',
            height: 'auto',
            minHeight: 'clamp(40px, 5.3vw, 68px)',
            fontFamily: 'Nunito',
            fontWeight: 900,
            fontSize: 'clamp(28px, 3.9vw, 50px)',
            lineHeight: '1.36',
            letterSpacing: '1%',
            color: '#544C3B',
            paddingTop: 'clamp(12px, 1.5vh, 24px)',
            paddingBottom: 'clamp(12px, 1.5vh, 24px)'
          }}
        >
          Interessen
        </h1>

        {/* Left Character - responsive */}
        <img
          src="/images/img_ebene_1.png"
          alt="Left character"
          className="absolute left-0 hidden md:block"
          style={{
            top: 'clamp(30px, 3.125vw, 40px)',
            width: 'clamp(200px, 33.67vw, 431px)',
            height: 'auto',
            aspectRatio: '431 / 447.12',
            objectFit: 'cover'
          }}
        />

        {/* Right Character - responsive */}
        <img
          src="/images/img_ebene_1_446x260.png"
          alt="Right character"
          className="absolute right-0 hidden md:block"
          style={{
            top: 'clamp(30px, 3.125vw, 40px)',
            width: 'clamp(150px, 25.86vw, 331px)',
            height: 'auto',
            aspectRatio: '331 / 447.12',
            objectFit: 'cover'
          }}
        />

        {/* Back Button - at x:48, y:48, 48x48 */}
        <button
          onClick={handleBackClick}
          className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
          style={{
            left: '48px',
            top: '48px',
            width: '48px',
            height: '48px',
            backgroundColor: '#D9D9D9'
          }}
          aria-label="Go back"
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

        {/* Kibundo Component - 350x225 at x:347, y:210 */}
        <div 
          className="absolute arch-box"
          style={{
            top: '210px',
            width: '350px',
            height: '225px'
          }}
        >
          {/* Kibundo Character Image - 108.47x212.84 at x:241.14, y:6.08 relative to component */}
          <img
            src={getSafeBuddyImage()}
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

          {/* TTS Control Buttons */}
          <TTSControlButtons 
            onSpeak={speak}
            soundButtonPosition={{ left: '108px', top: '28px' }}
            repeatButtonPosition={{ left: '176px', top: '28px' }}
          />

          {/* Speech Bubble - at x:9, y:97 relative to component, 210x86 */}
          <div 
            className="absolute"
            style={{
              left: 'clamp(9px, 0.7vw, 9px)',
              top: 'clamp(97px, 12.125vh, 97px)',
              width: 'clamp(280px, 26vw, 340px)',
              height: 'auto',
              minHeight: 'clamp(120px, 14vh, 160px)'
            }}
          >
            {/* Speech Bubble Arrow - 55.21x25.32 at x:134.79, y:-18 relative to speech bubble */}
            <img
              src="/images/img_vector.svg"
              alt="Speech indicator"
              className="absolute"
              style={{
                left: 'clamp(140px, 13vw, 170px)',
                top: 'clamp(-18px, -2.25vh, -18px)',
                width: 'clamp(40px, 4.31vw, 55.21px)',
                height: 'auto',
                aspectRatio: '55.21 / 25.32'
              }}
            />
            
            {/* Speech Bubble Content */}
            <div 
              className="absolute rounded-[18px] border flex items-center"
              style={{
                width: '70%',
                height: '100%',
                minHeight: 'clamp(120px, 14vh, 160px)',
                backgroundColor: '#D9F98D',
                borderColor: '#E1EAAC',
                borderWidth: '1px',
                boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.25)',
                padding: 'clamp(18px, 2.5vw, 24px)'
              }}
            >
              <p 
                className="w-full whitespace-pre-line"
                style={{ 
                  fontFamily: 'Nunito',
                  fontWeight: 400,
                  fontSize: 'clamp(16px, 1.6vw, 20px)',
                  lineHeight: '1.4',
                  color: '#000000',
                  margin: 0
                }}
              >
                {textToSpeak}
              </p>
            </div>
          </div>
        </div>

        {/* Color Selection Cards - responsive, positioned lower to not cover buddy */}
        <div 
          className="absolute left-1/2 transform -translate-x-1/2 w-full px-4"
          style={{
            top: 'clamp(450px, 56.25vh, 550px)',
            maxWidth: '1280px',
            height: 'auto',
            display: 'flex',
            flexFlow: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 'clamp(8px, 1.2vw, 16px)',
            boxSizing: 'border-box',
            zIndex: 10
          }}
        >
          {colorOptions.map((color) => (
            <button
              key={color.id}
              onClick={() => handleColorSelect(color.id)}
              className={`relative flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 flex-shrink-0 ${
                selectedColor === color.id ? 'ring-2 ring-green-500 scale-105' : ''
              }`}
              style={{
                width: isPortrait ? 'clamp(100px, 23vw, 225px)' : 'clamp(150px, 17.58vw, 225px)',
                height: isPortrait ? 'clamp(100px, 23vw, 225px)' : 'clamp(150px, 17.58vw, 225px)',
                maxWidth: isPortrait ? 'calc(50% - 8px)' : 'calc(25% - 12px)',
                borderRadius: 'clamp(12px, 1.25vw, 16px)',
                backgroundColor: '#F3E6C8',
                border: '1px solid #ECC5AA',
                boxShadow: '2px 2px 5px rgba(0, 0, 0, 0.25)',
                padding: 'clamp(10px, 1.56vw, 20px)',
                boxSizing: 'border-box'
              }}
              aria-label={`Select ${color.name} color`}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
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
                    width: '100%',
                    height: '100%',
                    objectFit: 'scale-down',
                    objectPosition: 'center',
                    display: 'block',
                    flexShrink: 0,
                    boxSizing: 'border-box'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </button>
          ))}
        </div>
        </main>
      </ResponsiveOnboardingContainer>
    </>
  );
};

export default ColorPreference;

