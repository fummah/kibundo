// src/pages/student/onboarding/AnimalPreference.jsx
// Based on fortai_app/src/pages/onboarding/AnimalPreference.jsx
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
import ResponsiveOnboardingContainer from "@/components/student/onboarding/ResponsiveOnboardingContainer.jsx";

const AnimalPreference = () => {
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
  const hasSpokenRef = useRef(false); // Guard to prevent double reading

  // Get the effective student ID using the hook
  const studentId = useStudentId();

  const textToSpeak = "Welche Tiere magst Du lieber? Katze, Hund, Hase, oder lieber Schildkröte, Spinne, Schlange?";

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
          animalPreference: option,
        },
        prompts: {
          ...existingPrompts,
          animalPreference: textToSpeak,
        },
        buddy: buddy || null,
        profile: profile || { name: "", ttsEnabled, theme: theme || "indigo" },
      });
    }

    setTimeout(() => {
      // Extract only preference values, exclude prompts and other state
      const { prompts: existingPrompts = {}, selectedCharacterId, ...existingPreferences } = location.state || {};
      navigate('/student/onboarding/activity-preference', {
        state: { 
          ...existingPreferences,
          animalPreference: option,
          prompts: {
            ...existingPrompts,
            animalPreference: textToSpeak,
          }
        }
      });
    }, 1000);
  };

  const handleBackClick = () => {
    navigate('/student/onboarding/learning-preference', {
      state: location.state
    });
  };

  if (!ready) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Animal Preference | Kibundo Interest Selection</title>
        <meta name="description" content="Make your animal preference selection in this fun interactive survey for kids." />
        <meta property="og:title" content="Animal Preference | Kibundo Interest Selection" />
        <meta property="og:description" content="Make your animal preference selection in this fun interactive survey for kids." />
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

        <CurvedBackgroundLayer />


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

        {/* Back Button - responsive */}
        <button
          onClick={handleBackClick}
          className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity z-50"
          style={{
            left: 'clamp(24px, 3.75vw, 48px)',
            top: 'clamp(24px, 3.75vw, 48px)',
            width: 'clamp(40px, 3.75vw, 48px)',
            height: 'clamp(40px, 3.75vw, 48px)',
            backgroundColor: '#D9D9D9'
          }}
          aria-label="Go back"
        >
          <img
            src="/images/img_vector_gray_800.svg"
            alt="Back arrow"
            style={{
              width: 'clamp(14px, 1.4vw, 18px)',
              height: 'clamp(24px, 2.34vw, 30px)'
            }}
          />
        </button>

        {/* Kibundo Component - responsive */}
        <div 
          className="absolute arch-box"
          style={{
            top: 'clamp(150px, 16.4vw, 210px)',
            width: 'clamp(280px, 27.3vw, 350px)',
            height: 'auto',
            aspectRatio: '350 / 225'
          }}
        >
          {/* Kibundo Character Image - responsive */}
          <img
            src={getSafeBuddyImage()}
            alt="Kibundo mascot"
            className="absolute"
            style={{
              left: 'clamp(180px, 18.8vw, 241.14px)',
              top: 'clamp(4px, 0.76vw, 6.08px)',
              width: 'clamp(80px, 8.47vw, 108.47px)',
              height: 'auto',
              aspectRatio: '108.47 / 212.84',
              objectFit: 'contain',
              zIndex: 3
            }}
          />

          {/* TTS Control Buttons */}
          <TTSControlButtons 
            onSpeak={speak}
            soundButtonPosition={{ left: 'clamp(80px, 8.44vw, 108px)', top: 'clamp(20px, 3.5vw, 28px)' }}
            repeatButtonPosition={{ left: 'clamp(130px, 13.75vw, 176px)', top: 'clamp(20px, 3.5vw, 28px)' }}
          />

          {/* Speech Bubble - responsive */}
          <div 
            className="absolute"
            style={{
              left: 'clamp(-15px, -1.64vw, -21px)',
              top: 'clamp(70px, 12.125vw, 97px)',
              width: 'clamp(280px, 26vw, 340px)',
              height: 'auto',
              minHeight: 'clamp(120px, 14vh, 160px)',
              zIndex: 1
            }}
          >
            {/* Speech Bubble Arrow - responsive */}
            <img
              src="/images/img_vector.svg"
              alt="Speech indicator"
              className="absolute"
              style={{
                left: 'clamp(140px, 13vw, 170px)',
                top: 'clamp(-14px, -2.25vw, -18px)',
                width: 'clamp(40px, 4.3vw, 55.21px)',
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
          {/* Button 1 - Pets (Cat, Dog, Rabbit) */}
          <button
            onClick={() => handleOptionSelect('Hund / Katze / Kaninchen')}
            className={`overflow-hidden transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 flex-shrink-0 ${
              selectedOption === 'Hund / Katze / Kaninchen' ? 'ring-2 ring-green-500 scale-105' : ''
            }`}
            style={{
              width: isPortrait ? 'clamp(180px, 42vw, 380px)' : 'clamp(280px, 29.7vw, 380px)',
              maxWidth: isPortrait ? 'calc(50% - 8px)' : 'calc(50% - 8px)',
              height: 'auto',
              aspectRatio: '395 / 264',
              borderRadius: 'clamp(12px, 1.25vw, 16px)',
              backgroundColor: 'transparent',
              border: 'none',
              padding: '0',
              boxSizing: 'border-box'
            }}
            aria-label="Select pets"
          >
            <img
              src="/images/img_animal_preference_pets.svg"
              alt="Pets illustration"
              className="w-full h-full object-contain"
            />
          </button>

          {/* Button 2 - Reptiles (Turtle, Spider, Snake) */}
          <button
            onClick={() => handleOptionSelect('Schlange / Spinne / Schildkröte')}
            className={`overflow-hidden transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 flex-shrink-0 ${
              selectedOption === 'Schlange / Spinne / Schildkröte' ? 'ring-2 ring-green-500 scale-105' : ''
            }`}
            style={{
              width: isPortrait ? 'clamp(180px, 42vw, 380px)' : 'clamp(280px, 29.7vw, 380px)',
              maxWidth: isPortrait ? 'calc(50% - 8px)' : 'calc(50% - 8px)',
              height: 'auto',
              aspectRatio: '395 / 264',
              borderRadius: 'clamp(12px, 1.25vw, 16px)',
              backgroundColor: 'transparent',
              border: 'none',
              padding: '0',
              boxSizing: 'border-box'
            }}
            aria-label="Select reptiles"
          >
            <img
              src="/images/img_animal_preference_reptiles.svg"
              alt="Reptiles illustration"
              className="w-full h-full object-contain"
            />
          </button>
        </div>
        </main>
      </ResponsiveOnboardingContainer>
    </>
  );
};

export default AnimalPreference;

