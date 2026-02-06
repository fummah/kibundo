import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ResponsiveOnboardingContainer from "@/components/student/onboarding/ResponsiveOnboardingContainer.jsx";

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let loadingInterval;
    let navigationTimeout;

    // Simulate loading progress
    loadingInterval = setInterval(() => {
      setProgress((prevProgress) => {
        const newProgress = prevProgress + 2;
        
        if (newProgress >= 100) {
          // Clear interval when complete
          clearInterval(loadingInterval);
          
          // Navigate to character selection when loading completes
          navigationTimeout = setTimeout(() => {
            navigate('/student/onboarding/buddy');
          }, 500); // Small delay for smooth transition
          
          return 100;
        }
        
        // Increment progress (adjust speed as needed)
        return newProgress;
      });
    }, 50); // Update every 50ms for smooth animation

    // Cleanup interval and timeout on unmount
    return () => {
      if (loadingInterval) {
        clearInterval(loadingInterval);
      }
      if (navigationTimeout) {
        clearTimeout(navigationTimeout);
      }
    };
  }, [navigate]);

  return (
    <>
      <Helmet>
        <title>Kibundo - Hausaufgaben mit Spaß | Lern-App für Kinder</title>
        <meta name="description" content="Kibundo macht Hausaufgaben zum Vergnügen! Eine spielerische Lern-App für Kinder mit süßen Maskottchen und individuellem Lerntempo für bessere Lernerfolge." />
        <meta property="og:title" content="Kibundo - Hausaufgaben mit Spaß | Lern-App für Kinder" />
        <meta property="og:description" content="Kibundo macht Hausaufgaben zum Vergnügen! Eine spielerische Lern-App für Kinder mit süßen Maskottchen und individuellem Lerntempo für bessere Lernerfolge." />
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
            paddingRight: 'clamp(24px, 3vw, 48px)'
          }}
        >
          {/* Kibundo Character - at x:578, y:155, 127x250 in 1280x800 frame */}
          <img 
            src="/images/img_kibundo.png" 
            alt="Kibundo Maskottchen - Freundliches Lernbegleiter-Character in grünem Hoodie"
            className="absolute"
            style={{
              left: '578px',
              top: '155px',
              width: '127px',
              height: '250px',
              objectFit: 'contain'
            }}
          />
          
          {/* Kibundo Logo - Startscreen at x:510, y:436, 260x50 */}
          <img 
            src="/images/img_startscreen.svg" 
            alt="Kibundo Logo"
            className="absolute"
            style={{
              left: '510px',
              top: '436px',
              width: '260px',
              height: '50px',
              objectFit: 'contain'
            }}
          />

          {/* Tagline text - at x:542, y:512, 196x50 */}
          <p 
            className="absolute text-center whitespace-pre-line"
            style={{
              left: '542px',
              top: '512px',
              width: '196px',
              height: '50px',
              fontFamily: 'Nunito',
              fontWeight: 400,
              fontSize: '18px',
              lineHeight: '24.5px',
              color: '#287D7F',
              textAlign: 'center'
            }}
          >
            Hausaufgaben mit Spaß{'\n'}
            und in Deinem Tempo
          </p>

          {/* Progress bar - at x:415, y:616, 450x12 */}
          <div 
            className="absolute overflow-hidden"
            style={{
              left: '415px',
              top: '616px',
              width: '450px',
              height: '12px',
              borderRadius: '8px',
              backgroundColor: '#F4EDE6',
              boxShadow: 'inset 0px 0px 3px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Progress fill */}
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor: '#BDCF56',
                borderRadius: '8px',
                boxShadow: 'inset 0px 0px 10px rgba(0, 0, 0, 0.25)',
                transition: 'width 0.5s ease-in-out'
              }}
            />
          </div>
        </main>
      </ResponsiveOnboardingContainer>
    </>
  );
};

export default LoadingScreen;

