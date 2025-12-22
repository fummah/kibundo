import React, { useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useStudentApp } from '@/context/StudentAppContext.jsx';
import { useAuthContext } from '@/context/AuthContext.jsx';
import { hasSeenHomeworkTutorial } from '@/pages/student/onboarding/introFlags';
import StudentHomeBackground from '@/components/student/backgrounds/StudentHomeBackground.jsx';

const ChildHomeScreen = () => {
  const navigate = useNavigate();
  const { ttsEnabled } = useStudentApp();
  const { user, account } = useAuthContext();
  const [highlightedButton, setHighlightedButton] = useState(null);
  const utteranceRef = useRef(null);
  
  // Get student ID (use selected child account if parent is viewing child)
  const studentId = account?.type === "child" && account?.userId 
    ? account.userId 
    : (user?.id || user?.user_id || null);
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

  const textToSpeak = "Willkommen in Kibundo's Welt. Von hier aus startest du deine Abenteuer. Wenn du direkt mit den Hausaufgaben beginnen möchtest, dann klicke auf das blaue Hausaufgabenfeld. In ein paar Wochen kannst du auch zwei weitere Funktionen nutzen. Freu dich schonmal auf ein Game mit Kibundo und eine extra Funktion, um gezielt Lesen zu üben.";

  // Calculate timing based on text position (approximate)
  const calculateHighlightTiming = () => {
    const fullText = textToSpeak;
    const wordsPerSecond = 2.5; // Average German speech rate
    
    // Find positions of key phrases
    const hausaufgabenIndex = fullText.toLowerCase().indexOf('hausaufgabenfeld');
    const gameIndex = fullText.toLowerCase().indexOf('game mit kibundo');
    const lesenIndex = fullText.toLowerCase().indexOf('lesen zu üben');
    
    // Calculate approximate times (in milliseconds)
    const hausaufgabenTime = (hausaufgabenIndex / fullText.length) * (fullText.length / wordsPerSecond) * 1000;
    const gameTime = (gameIndex / fullText.length) * (fullText.length / wordsPerSecond) * 1000;
    const lesenTime = (lesenIndex / fullText.length) * (fullText.length / wordsPerSecond) * 1000;
    
    // Duration for each highlight (3 seconds)
    const highlightDuration = 3000;
    
    return {
      hausaufgaben: { start: hausaufgabenTime, end: hausaufgabenTime + highlightDuration },
      game: { start: gameTime, end: gameTime + highlightDuration },
      lesen: { start: lesenTime, end: lesenTime + highlightDuration }
    };
  };

  useEffect(() => {
    if (!ttsEnabled) return;

    const timing = calculateHighlightTiming();
    let startTime = null;
    let highlightTimers = [];

    const speak = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => {
        startTime = Date.now();
        
        // Set up highlight timers
        highlightTimers = [
          setTimeout(() => {
            setHighlightedButton('hausaufgaben');
            setTimeout(() => setHighlightedButton(null), timing.hausaufgaben.end - timing.hausaufgaben.start);
          }, timing.hausaufgaben.start),
          setTimeout(() => {
            setHighlightedButton('game');
            setTimeout(() => setHighlightedButton(null), timing.game.end - timing.game.start);
          }, timing.game.start),
          setTimeout(() => {
            setHighlightedButton('lesen');
            setTimeout(() => setHighlightedButton(null), timing.lesen.end - timing.lesen.start);
          }, timing.lesen.start)
        ];
      };
      
      utterance.onend = () => {
        setHighlightedButton(null);
        highlightTimers.forEach(timer => clearTimeout(timer));
      };
      
      utterance.onerror = () => {
        setHighlightedButton(null);
        highlightTimers.forEach(timer => clearTimeout(timer));
      };
      
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    // Auto-speak after a short delay
    const timer = setTimeout(speak, 500);

    return () => {
      clearTimeout(timer);
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
      highlightTimers.forEach(timer => clearTimeout(timer));
    };
  }, [ttsEnabled, textToSpeak]);

  const cardWidth = isPortrait ? 'clamp(180px, 55vw, 320px)' : 'clamp(150px, 22vw, 280px)';
  const cardMaxWidth = isPortrait ? 'calc(50% - 12px)' : 'calc(33.333% - 12px)';

  return (
    <>
      <Helmet>
        <title>Home | Kibundo</title>
        <meta name="description" content="Welcome to Kibundo's Island. Start your learning adventures from here." />
        <meta property="og:title" content="Home | Kibundo" />
        <meta property="og:description" content="Welcome to Kibundo's Island. Start your learning adventures from here." />
      </Helmet>
      <main
        className="relative w-full min-h-screen bg-white overflow-hidden"
        style={{
          width: '100%',
          minHeight: '100vh',
          height: '100vh',
          backgroundColor: 'transparent',
          zIndex: 1
        }}
      >
        <StudentHomeBackground />

        {/* Kibundo Component - responsive */}
        <div
          className="absolute"
          style={{
            // Shift slightly left so trees on the left stay visible
            left: 'clamp(8px, 20vw, 260px)',
            top: 'clamp(100px, 17.5vw, 140px)',
            width: 'clamp(280px, 27.3vw, 350px)',
            height: 'auto',
            aspectRatio: '350 / 225'
          }}
        >
          {/* Kibundo Character Image - responsive */}
          <img
            src="/images/img_kibundo.png"
            alt="Kibundo mascot"
            className="absolute"
            style={{
              left: 'clamp(180px, 18.8vw, 241.14px)',
              top: 'clamp(4px, 0.76vw, 6.08px)',
              width: 'clamp(80px, 8.47vw, 108.47px)',
              height: 'auto',
              aspectRatio: '108.47 / 212.84',
              objectFit: 'contain'
            }}
          />

          {/* Sound Button - responsive */}
          <button
            className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
            style={{
              left: 'clamp(80px, 8.44vw, 108px)',
              top: 'clamp(20px, 3.5vw, 28px)',
              width: 'clamp(36px, 3.75vw, 48px)',
              height: 'clamp(36px, 3.75vw, 48px)',
              backgroundColor: '#FFFFFF',
              boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)'
            }}
            aria-label="Sound button"
          >
            <img
              src="/images/img_sound_button_01.svg"
              alt="Sound"
              className="w-full h-full"
              style={{
                width: '70%',
                height: '70%',
                objectFit: 'contain'
              }}
            />
          </button>

          {/* Repeat Button - responsive */}
          <button
            className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
            style={{
              left: 'clamp(130px, 13.75vw, 176px)',
              top: 'clamp(20px, 3.5vw, 28px)',
              width: 'clamp(36px, 3.75vw, 48px)',
              height: 'clamp(36px, 3.75vw, 48px)',
              backgroundColor: '#FFFFFF',
              boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)'
            }}
            aria-label="Repeat button"
          >
            <img
              src="/images/img_repeat_button.svg"
              alt="Repeat"
              className="w-full h-full"
              style={{
                width: '70%',
                height: '70%',
                objectFit: 'contain'
              }}
            />
          </button>

          {/* Speech Bubble - responsive */}
          <div
            className="absolute"
            style={{
              left: 'clamp(-16px, -2.625vw, -21px)',
              top: 'clamp(70px, 12.125vw, 97px)',
              width: 'clamp(200px, 19.5vw, 250px)',
              height: 'auto',
              minHeight: 'clamp(90px, 13.875vw, 111px)'
            }}
          >
            {/* Speech Bubble Arrow - responsive */}
            <img
              src="/images/img_vector.svg"
              alt="Speech indicator"
              className="absolute"
              style={{
                left: 'clamp(100px, 10.5vw, 134.79px)',
                top: 'clamp(-14px, -2.25vw, -18px)',
                width: 'clamp(40px, 4.3vw, 55.21px)',
                height: 'auto',
                aspectRatio: '55.21 / 25.32'
              }}
            />

            {/* Speech Bubble Content - responsive */}
            <div
              className="absolute rounded-[18px] border w-full"
              style={{
                height: 'auto',
                minHeight: 'clamp(90px, 13.875vw, 111px)',
                backgroundColor: '#D9F98D',
                borderColor: '#E1EAAC',
                borderWidth: '1px',
                boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.25)',
                padding: 'clamp(12px, 2.25vw, 18px)'
              }}
            >
              <p
                className="text-left"
                style={{
                  fontFamily: 'Nunito',
                  fontWeight: 400,
                  fontSize: 'clamp(14px, 1.406vw, 18px)',
                  lineHeight: '1.36',
                  color: '#000000',
                  margin: 0
                }}
              >
                Willkommen in Kibundo's Welt.{'\n'}
                Von hier aus startest du deine{'\n'}
                Abenteuer. Wenn du direkt mit{'\n'}
                den Hausaufgaben beginnen{'\n'}
                möchtest, dann klicke auf das{'\n'}
                blaue Hausaufgabenfeld.
              </p>
            </div>
          </div>
        </div>

        {/* Button Group - fully responsive for all screen sizes */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 w-full px-4"
          style={{
            top: 'clamp(300px, 50vw, 479.32px)',
            maxWidth: '1043px',
            height: 'auto',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 'clamp(8px, 1.5vw, 16px)'
          }}
        >
          {/* Homework Button - fully responsive */}
          <button
            onClick={() => {
              // Navigate to tutorial if not seen, otherwise go directly to homework
              if (hasSeenHomeworkTutorial(studentId)) {
                navigate('/student/homework');
              } else {
                navigate('/student/homework-tutorial');
              }
            }}
            className={`hover:opacity-90 transition-all duration-300 flex-shrink-0 ${highlightedButton === 'hausaufgaben' ? 'scale-110 z-20' : 'scale-100 z-10'}`}
            style={{
              width: cardWidth,
              maxWidth: cardMaxWidth,
              height: 'auto',
              aspectRatio: '335 / 235',
              padding: 'clamp(4px, 0.6vw, 8px)',
              boxSizing: 'border-box',
              transform: highlightedButton === 'hausaufgaben' ? 'scale(1.1)' : 'scale(1)',
              filter: highlightedButton === 'hausaufgaben' ? 'drop-shadow(8px 8px 40px rgba(239, 124, 46, 0.8))' : 'none'
            }}
            aria-label="Hausaufgabe"
          >
            <img
              src="/images/img_homework_button.svg"
              alt="Hausaufgabe"
              className="w-full h-full object-contain"
            />
          </button>

          {/* Read Button - fully responsive */}
          <button
            onClick={() => navigate('/student/reading')}
            className={`hover:opacity-90 transition-all duration-300 flex-shrink-0 ${highlightedButton === 'lesen' ? 'scale-110 z-20' : 'scale-100 z-10'}`}
            style={{
              width: cardWidth,
              maxWidth: cardMaxWidth,
              height: 'auto',
              aspectRatio: '335 / 235',
              padding: 'clamp(4px, 0.6vw, 8px)',
              boxSizing: 'border-box',
              transform: highlightedButton === 'lesen' ? 'scale(1.1)' : 'scale(1)',
              filter: highlightedButton === 'lesen' ? 'drop-shadow(8px 8px 40px rgba(239, 124, 46, 0.8))' : 'none'
            }}
            aria-label="Lesen"
          >
            <img
              src="/images/img_read_button.svg"
              alt="Lesen"
              className="w-full h-full object-contain"
            />
          </button>

          {/* Game Button - fully responsive */}
          <button
            onClick={() => navigate('/student/map')}
            className={`hover:opacity-90 transition-all duration-300 flex-shrink-0 ${highlightedButton === 'game' ? 'scale-110 z-20' : 'scale-100 z-10'}`}
            style={{
              width: cardWidth,
              maxWidth: cardMaxWidth,
              height: 'auto',
              aspectRatio: '335 / 235',
              padding: 'clamp(4px, 0.6vw, 8px)',
              boxSizing: 'border-box',
              transform: highlightedButton === 'game' ? 'scale(1.1)' : 'scale(1)',
              filter: highlightedButton === 'game' ? 'drop-shadow(8px 8px 40px rgba(239, 124, 46, 0.8))' : 'none'
            }}
            aria-label="Spielkarte"
          >
            <img
              src="/images/img_game_button.svg"
              alt="Spielkarte"
              className="w-full h-full"
            />
          </button>
        </div>

        {/* Settings Button - responsive, top right */}
        <button
          onClick={() => navigate('/student/settings')}
          className="absolute hover:opacity-90 transition-opacity right-0"
          style={{
            top: '0px',
            width: 'clamp(44px, 4.375vw, 56px)',
            height: 'auto',
            aspectRatio: '56 / 88'
          }}
          aria-label="Settings"
        >
          <img
            src="/images/img_settings_button.svg"
            alt="Settings"
            className="w-full h-full"
          />
        </button>
      </main>
    </>
  );
};

export default ChildHomeScreen;

