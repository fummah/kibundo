// src/pages/student/onboarding/ActivityPreference.jsx
// Based on fortai_app/src/pages/onboarding/ActivityPreference.jsx
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

const ActivityPreference = () => {
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
    const isCharacter = 
      buddy.name?.toLowerCase().includes("character") ||
      (typeof buddy.id === "number" && buddy.id >= 1 && buddy.id <= 6) ||
      (typeof buddy.id === "string" && /^[1-6]$/.test(buddy.id)) ||
      buddy.img?.includes("img_rectangle_20") ||
      buddy.avatar?.includes("img_rectangle_20");
    if (isCharacter) return "/images/img_kibundo.png";
    return buddy.img || buddy.avatar || "/images/img_kibundo.png";
  };
  const { user, account } = useAuthContext();
  const [selectedOption, setSelectedOption] = useState(null);

  // Get the effective student ID using the hook
  const studentId = useStudentId();

  const textToSpeak = "Was magst Du lieber? Alleine ein Hörspiel hören oder mit anderen spielen?";

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
    if (ttsEnabled && ready) {
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

  const handleOptionSelect = async (option) => {
    setSelectedOption(option);
    
    // Save preference to database immediately with prompt
    if (studentId) {
      // Extract only preference values, exclude prompts and other state
      const { prompts: existingPrompts = {}, selectedCharacterId, ...existingPreferences } = location.state || {};
      await saveStudentPreferences({
        studentId,
        preferences: {
          ...existingPreferences,
          activityPreference: option,
        },
        prompts: {
          ...existingPrompts,
          activityPreference: textToSpeak,
        },
        buddy: buddy || null,
        profile: profile || { name: "", ttsEnabled, theme: theme || "indigo" },
      });
    }

    setTimeout(() => {
      // Extract only preference values, exclude prompts and other state
      const { prompts: existingPrompts = {}, selectedCharacterId, ...existingPreferences } = location.state || {};
      navigate('/student/onboarding/color-preference', {
        state: { 
          ...existingPreferences,
          activityPreference: option,
          prompts: {
            ...existingPrompts,
            activityPreference: textToSpeak,
          }
        }
      });
    }, 1000);
  };

  const handleBackClick = () => {
    navigate('/student/onboarding/animal-preference', {
      state: location.state
    });
  };

  if (!ready) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Activity Preference | Kibundo Interest Selection</title>
        <meta name="description" content="Choose between listening to audio stories alone or playing with others in this fun interactive preference selection for kids." />
        <meta property="og:title" content="Activity Preference | Kibundo Interest Selection" />
        <meta property="og:description" content="Choose between listening to audio stories alone or playing with others in this fun interactive preference selection for kids." />
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

        {/* Back Button - 48x48 at x:48, y:48 */}
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
          className="absolute"
          style={{
            left: '347px',
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

          {/* Speech Bubble - at x:-21, y:97 relative to component, 250x111 */}
          <div 
            className="absolute"
            style={{
              left: '-21px',
              top: '97px',
              width: '250px',
              height: '111px'
            }}
          >
            {/* Speech Bubble Arrow - 55.21x25.32 at x:134.79, y:-18 relative to speech bubble */}
            <img
              src="/images/img_vector.svg"
              alt="Speech indicator"
              className="absolute"
              style={{
                left: '134.79px',
                top: '-18px',
                width: '55.21px',
                height: '25.32px'
              }}
            />
            
            {/* Speech Bubble Content */}
            <div 
              className="absolute rounded-[18px] border flex items-center"
              style={{
                width: '250px',
                height: '111px',
                backgroundColor: '#D9F98D',
                borderColor: '#E1EAAC',
                borderWidth: '1px',
                boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.25)',
                padding: '18px'
              }}
            >
              <p 
                className="w-full whitespace-pre-line"
                style={{ 
                  fontFamily: 'Nunito',
                  fontWeight: 400,
                  fontSize: '18px',
                  lineHeight: '24.5px',
                  color: '#000000',
                  margin: 0
                }}
              >
                {textToSpeak}
              </p>
            </div>
          </div>
        </div>

        {/* Selection Buttons - responsive, positioned lower to not cover buddy */}
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
          {/* Button 1 - Listen Alone */}
          <button
            onClick={() => handleOptionSelect('Alleine ein Hörspiel hören')}
            className={`relative overflow-hidden transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 flex-shrink-0 ${
              selectedOption === 'Alleine ein Hörspiel hören' ? 'ring-2 ring-green-500 scale-105' : ''
            }`}
            style={{
              width: isPortrait ? 'clamp(180px, 42vw, 380px)' : 'clamp(280px, 29.7vw, 380px)',
              maxWidth: isPortrait ? 'calc(50% - 8px)' : 'calc(50% - 8px)',
              height: 'auto',
              aspectRatio: '395 / 264',
              borderRadius: 'clamp(12px, 1.25vw, 16px)',
              backgroundColor: '#D8EFEE',
              border: '1px solid #9DD3D6',
              boxShadow: '2px 2px 5px rgba(0, 0, 0, 0.25)',
              padding: '0',
              boxSizing: 'border-box'
            }}
            aria-label="Select listening alone"
          >
            {/* Listen Alone illustration - centered */}
            <div 
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                width: 'clamp(87px, 13.59vw, 174px)',
                height: 'clamp(93px, 14.53vh, 186px)'
              }}
            >
              <img
                src="/images/img_frame.svg"
                alt="Listen Alone"
                className="w-full h-full object-contain"
              />
            </div>
          </button>

          {/* Button 2 - Play with Others */}
          <button
            onClick={() => handleOptionSelect('Mit anderen spielen')}
            className={`relative overflow-hidden transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 flex-shrink-0 ${
              selectedOption === 'Mit anderen spielen' ? 'ring-2 ring-green-500 scale-105' : ''
            }`}
            style={{
              width: isPortrait ? 'clamp(180px, 42vw, 380px)' : 'clamp(280px, 29.7vw, 380px)',
              maxWidth: isPortrait ? 'calc(50% - 8px)' : 'calc(50% - 8px)',
              height: 'auto',
              aspectRatio: '395 / 264',
              borderRadius: 'clamp(12px, 1.25vw, 16px)',
              backgroundColor: '#D8EFEE',
              border: '1px solid #9DD3D6',
              boxShadow: '2px 2px 5px rgba(0, 0, 0, 0.25)',
              padding: '0',
              boxSizing: 'border-box'
            }}
            aria-label="Select playing with others"
          >
            {/* Play with Others illustration - centered */}
            <div 
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                width: 'clamp(138px, 21.64vw, 277px)',
                height: 'clamp(87px, 10.94vh, 175px)'
              }}
            >
              <img
                src="/images/img_isolationsmodus.svg"
                alt="Play with Others"
                className="w-full h-full object-contain"
                style={{
                  filter: 'drop-shadow(4px 4px 10px rgba(255, 255, 255, 1))'
                }}
              />
            </div>
          </button>
        </div>
        </main>
      </div>
    </>
  );
};

export default ActivityPreference;

