import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStudentApp } from '@/context/StudentAppContext.jsx';
import { useAuthContext } from '@/context/AuthContext.jsx';
import { markHomeworkTutorialSeen } from '@/pages/student/onboarding/introFlags';
import HomeworkTutorialBackground from '@/components/student/backgrounds/HomeworkTutorialBackground.jsx';

const HomeworkExplainer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ttsEnabled } = useStudentApp();
  const { user, account } = useAuthContext();
  
  // Get student ID (use selected child account if parent is viewing child)
  const studentId = account?.type === "child" && account?.userId 
    ? account.userId 
    : (user?.id || user?.user_id || null);
  const [highlightedField, setHighlightedField] = useState(null);
  const utteranceRef = useRef(null);

  const textToSpeak = "Ich habe mir einen tollen Ablauf überlegt, wie wir deine Hausaufgaben gemeinsam schaffen. Wir machen das in drei Schritten. Sammeln: Erstmal sammeln wir alles, was heute dran ist. So bekommen wir einen guten Überblick. Machen: Dann machen wir die Aufgaben gemeinsam. Ich begleite dich Schritt für Schritt. Zurückschauen: Und zum Schluss schauen wir zusammen, was heute richtig stark war. Du wirst sehen, was du schon gut kannst, welche Tricks dir besonders geholfen haben und wie es beim nächsten Mal leichter geht. Bist du bereit? Dann lass uns starten - ich freue mich auf dich!";

  // Calculate timing based on text position (approximate)
  const calculateHighlightTiming = () => {
    const fullText = textToSpeak;
    const wordsPerSecond = 2.5; // Average German speech rate
    
    // Find positions of key words
    const sammelnIndex = fullText.toLowerCase().indexOf('sammeln:');
    const machenIndex = fullText.toLowerCase().indexOf('machen:');
    const zurückschauenIndex = fullText.toLowerCase().indexOf('zurückschauen:');
    
    // Calculate approximate times (in milliseconds)
    const sammelnTime = (sammelnIndex / fullText.length) * (fullText.length / wordsPerSecond) * 1000;
    const machenTime = (machenIndex / fullText.length) * (fullText.length / wordsPerSecond) * 1000;
    const zurückschauenTime = (zurückschauenIndex / fullText.length) * (fullText.length / wordsPerSecond) * 1000;
    
    // Duration for each highlight (3 seconds)
    const highlightDuration = 3000;
    
    return {
      sammeln: { start: sammelnTime, end: sammelnTime + highlightDuration },
      machen: { start: machenTime, end: machenTime + highlightDuration },
      zurückschauen: { start: zurückschauenTime, end: zurückschauenTime + highlightDuration }
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
            setHighlightedField('sammeln');
            setTimeout(() => setHighlightedField(null), timing.sammeln.end - timing.sammeln.start);
          }, timing.sammeln.start),
          setTimeout(() => {
            setHighlightedField('machen');
            setTimeout(() => setHighlightedField(null), timing.machen.end - timing.machen.start);
          }, timing.machen.start),
          setTimeout(() => {
            setHighlightedField('zurückschauen');
            setTimeout(() => setHighlightedField(null), timing.zurückschauen.end - timing.zurückschauen.start);
          }, timing.zurückschauen.start)
        ];
      };
      
      utterance.onend = () => {
        setHighlightedField(null);
        highlightTimers.forEach(timer => clearTimeout(timer));
      };
      
      utterance.onerror = () => {
        setHighlightedField(null);
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

  const handleStartClick = () => {
    // Mark tutorial as seen before navigating
    markHomeworkTutorialSeen(studentId);
    
    // Navigate to the homework home screen
    navigate('/student/homework', {
      state: location.state
    });
  };

  const handleBackClick = () => {
    navigate('/student/home', {
      state: location.state
    });
  };

  return (
    <>
      <Helmet>
        <title>Hausaufgaben Tutorial | Kibundo</title>
        <meta name="description" content="Learn how to use the homework feature in Kibundo. Follow the steps: Sammeln, machen, Reflexion." />
        <meta property="og:title" content="Hausaufgaben Tutorial | Kibundo" />
        <meta property="og:description" content="Learn how to use the homework feature in Kibundo. Follow the steps: Sammeln, machen, Reflexion." />
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
        <HomeworkTutorialBackground />

        {/* Clouds Background Component - responsive */}
        <div
          className="absolute left-0 w-full"
          style={{
            top: 'clamp(16px, 3vw, 24px)',
            height: 'clamp(300px, 51.25vw, 410px)',
            opacity: 0.3
          }}
        >
          <img
            src="/images/img_component_4.svg"
            alt="Clouds"
            className="w-full h-full object-cover opacity-30"
          />
        </div>

        {/* Hausaufgaben Title - responsive, centered */}
        <h1
          className="absolute top-[75px] left-1/2 transform -translate-x-1/2 text-center"
          style={{
            width: 'clamp(200px, 22.6vw, 289px)',
            height: 'auto',
            minHeight: 'clamp(40px, 6.875vw, 55px)',
            fontFamily: 'Nunito',
            fontWeight: 900,
            fontSize: 'clamp(28px, 3.125vw, 40px)',
            lineHeight: '1.375',
            letterSpacing: '2%',
            color: '#287D7F'
          }}
        >
          Hausaufgaben
        </h1>

        {/* Left Character - responsive, hidden on small screens */}
        <img
          src="/images/img_ebene_1.png"
          alt="Left character"
          className="absolute left-0 hidden md:block"
          style={{
            top: 'clamp(30px, 5vw, 40px)',
            width: 'clamp(250px, 33.6vw, 431px)',
            height: 'auto',
            aspectRatio: '431 / 447.12',
            objectFit: 'cover',
            objectPosition: 'center top'
          }}
        />

        {/* Right Character - responsive, hidden on small screens */}
        <img
          src="/images/img_ebene_1_446x260.png"
          alt="Right character"
          className="absolute right-0 hidden md:block"
          style={{
            top: 'clamp(30px, 5vw, 40px)',
            width: 'clamp(200px, 25.86vw, 331px)',
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
            top: 'clamp(24px, 3.75vw, 48px)',
            left: 'clamp(24px, 3.75vw, 48px)',
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

        {/* Frame 1 - Illustration - responsive, centered */}
        <img
          src="/images/img_homework_tutorial_frame.svg"
          alt="Tutorial illustration"
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{
            top: 'clamp(120px, 18.75vw, 150px)',
            width: 'clamp(600px, 62.5vw, 800px)',
            height: 'auto',
            aspectRatio: '800 / 250',
            objectFit: 'contain'
          }}
        />

        {/* So geht's Subtitle - responsive, centered */}
        <h2
          className="absolute top-[415px] left-1/2 transform -translate-x-1/2 text-center"
          style={{
            width: 'clamp(90px, 8.44vw, 108px)',
            height: 'auto',
            minHeight: 'clamp(28px, 4.125vw, 33px)',
            fontFamily: 'Nunito',
            fontWeight: 900,
            fontSize: 'clamp(20px, 1.875vw, 24px)',
            lineHeight: '1.375',
            color: '#544C3B'
          }}
        >
          So geht's
        </h2>

        {/* Container - responsive, centered */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{
            top: 'clamp(350px, 54.25vw, 434px)',
            width: 'clamp(600px, 58.4vw, 748px)',
            height: 'auto',
            minHeight: 'clamp(200px, 31.25vw, 250px)',
            padding: 'clamp(16px, 1.875vw, 24px)'
          }}
        >
          {/* Horizontal line - responsive */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2"
            style={{
              top: 'clamp(80px, 12.75vw, 102px)',
              width: 'clamp(500px, 52.5vw, 672px)',
              height: 'clamp(20px, 3.375vw, 27px)',
              borderTop: '3px solid #544C3B'
            }}
          />

          {/* Frame 4 - Sammeln - responsive */}
          <div
            className={`absolute transition-all duration-300 ${highlightedField === 'sammeln' ? 'scale-110 z-20' : 'scale-100 z-10'}`}
            style={{
              left: 'clamp(4px, 1.07vw, 8px)',
              top: 'clamp(50px, 8vw, 64px)',
              width: 'clamp(100px, 9.45vw, 121px)',
              height: 'auto',
              minHeight: 'clamp(150px, 23.25vw, 186px)',
              filter: highlightedField === 'sammeln' ? 'drop-shadow(8px 8px 40px rgba(239, 124, 46, 0.8))' : 'drop-shadow(5.75px 5.75px 32.86px rgba(0, 0, 0, 0.3))',
              transform: highlightedField === 'sammeln' ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            <img
              src="/images/img_homework_tutorial_sammeln.svg"
              alt="Sammeln"
              className="w-full"
              style={{
                width: '100%',
                height: 'auto',
                aspectRatio: '121.23 / 121.05',
                objectFit: 'contain'
              }}
            />
            <p
              className="absolute text-center"
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
                top: 'clamp(105px, 16.375vw, 131px)',
                width: 'clamp(90px, 8.5vw, 109px)',
                height: 'auto',
                minHeight: 'clamp(28px, 4.125vw, 33px)',
                fontFamily: 'Nunito',
                fontWeight: 900,
                fontSize: 'clamp(20px, 1.875vw, 24px)',
                lineHeight: '1.375',
                color: '#544C3B'
              }}
            >
              Sammeln
            </p>
          </div>

          {/* Frame 5 - machen - responsive */}
          <div
            className={`absolute transition-all duration-300 ${highlightedField === 'machen' ? 'scale-110 z-20' : 'scale-100 z-10'}`}
            style={{
              left: 'clamp(200px, 24.45vw, 313px)',
              top: 'clamp(30px, 4.75vw, 38px)',
              width: 'clamp(100px, 9.45vw, 121px)',
              height: 'auto',
              minHeight: 'clamp(140px, 22.125vw, 177px)',
              filter: highlightedField === 'machen' ? 'drop-shadow(8px 8px 40px rgba(239, 124, 46, 0.8))' : 'drop-shadow(5.75px 5.75px 32.86px rgba(0, 0, 0, 0.3))',
              transform: highlightedField === 'machen' ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            <img
              src="/images/img_homework_tutorial_machen.svg"
              alt="machen"
              className="w-full"
              style={{
                width: '100%',
                height: 'auto',
                aspectRatio: '121.23 / 121.05',
                objectFit: 'contain'
              }}
            />
            <p
              className="absolute text-center"
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
                top: 'clamp(110px, 16.875vw, 135px)',
                width: 'clamp(80px, 7.03vw, 90px)',
                height: 'auto',
                minHeight: 'clamp(28px, 4.125vw, 33px)',
                fontFamily: 'Nunito',
                fontWeight: 900,
                fontSize: 'clamp(20px, 1.875vw, 24px)',
                lineHeight: '1.375',
                color: '#544C3B'
              }}
            >
              machen
            </p>
          </div>

          {/* Frame 6 - Reflexion - responsive */}
          <div
            className={`absolute transition-all duration-300 ${highlightedField === 'zurückschauen' ? 'scale-110 z-20' : 'scale-100 z-10'}`}
            style={{
              left: 'clamp(400px, 48.36vw, 619px)',
              top: 'clamp(50px, 8vw, 64px)',
              width: 'clamp(100px, 9.45vw, 121px)',
              height: 'auto',
              minHeight: 'clamp(150px, 23.25vw, 186px)',
              filter: highlightedField === 'zurückschauen' ? 'drop-shadow(8px 8px 40px rgba(239, 124, 46, 0.8))' : 'drop-shadow(5.75px 5.75px 32.86px rgba(0, 0, 0, 0.3))',
              transform: highlightedField === 'zurückschauen' ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            <img
              src="/images/img_homework_tutorial_reflexion.svg"
              alt="Reflexion"
              className="w-full"
              style={{
                width: '100%',
                height: 'auto',
                aspectRatio: '121.23 / 121.05',
                objectFit: 'contain'
              }}
            />
            <p
              className="absolute text-center"
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
                top: 'clamp(110px, 17vw, 136px)',
                width: 'clamp(95px, 8.67vw, 111px)',
                height: 'auto',
                minHeight: 'clamp(28px, 4.125vw, 33px)',
                fontFamily: 'Nunito',
                fontWeight: 900,
                fontSize: 'clamp(20px, 1.875vw, 24px)',
                lineHeight: '1.375',
                color: '#544C3B'
              }}
            >
              Reflexion
            </p>
          </div>
        </div>

        {/* Start Button - Jetzt starten - responsive, centered */}
        <button
          onClick={handleStartClick}
          className="absolute flex items-center justify-center hover:opacity-90 transition-opacity left-1/2 transform -translate-x-1/2"
          style={{
            top: 'clamp(550px, 85vw, 680px)',
            width: 'clamp(220px, 21.5vw, 275px)',
            height: 'auto',
            minHeight: 'clamp(50px, 8.125vw, 65px)',
            borderRadius: '16px',
            backgroundColor: '#EF7C2E',
            boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
            padding: 'clamp(12px, 1.5vw, 16px)'
          }}
          aria-label="Jetzt starten"
        >
          <span
            style={{
              fontFamily: 'Nunito',
              fontWeight: 900,
              fontSize: 'clamp(20px, 1.95vw, 25px)',
              lineHeight: '1.36',
              letterSpacing: '2%',
              textAlign: 'center',
              color: '#FFFFFF'
            }}
          >
            Jetzt starten
          </span>
        </button>
      </main>
    </>
  );
};

export default HomeworkExplainer;

