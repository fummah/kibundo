import React, { useState, useRef, useEffect } from 'react';

const HomeworkChatFooter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'kibundo',
      text: 'Hallo Michael, hattest Du einen\nschönen Tag in der Schule?',
      timestamp: new Date(),
      position: { x: 635, y: 176 }
    },
    {
      id: 2,
      sender: 'child',
      text: 'Hallo Kibundo',
      timestamp: new Date(),
      position: { x: 24, y: 103 }
    },
    {
      id: 3,
      sender: 'child',
      text: 'Ja, ausser Mathe und\nRelli war doof, sonst gut.',
      timestamp: new Date(),
      position: { x: 24, y: 255 }
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleCameraClick = (e) => {
    e.stopPropagation();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          const newMessage = {
            id: messages.length + 1,
            sender: 'child',
            text: '📷 Scanning homework...',
            timestamp: new Date(),
            position: { x: 24, y: messages.length * 150 + 103 }
          };
          setMessages([...messages, newMessage]);
          stream.getTracks().forEach(track => track.stop());
        })
        .catch((err) => {
          console.error('Error accessing camera:', err);
          alert('Kamera konnte nicht geöffnet werden. Bitte erlauben Sie den Kamera-Zugriff.');
        });
    } else {
      alert('Kamera wird in diesem Browser nicht unterstützt.');
    }
  };

  const handleMicClick = (e) => {
    e.stopPropagation();
    if (!isRecording) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            setIsRecording(true);
            setTimeout(() => {
              setIsRecording(false);
              stream.getTracks().forEach(track => track.stop());
              const voiceText = prompt('Bitte geben Sie die Hausaufgabe ein (Simulation der Spracherkennung):');
              if (voiceText) {
                handleSendMessage(voiceText);
              }
            }, 2000);
          })
          .catch((err) => {
            console.error('Error accessing microphone:', err);
            alert('Mikrofon konnte nicht geöffnet werden. Bitte erlauben Sie den Mikrofon-Zugriff.');
          });
      } else {
        alert('Mikrofon wird in diesem Browser nicht unterstützt.');
      }
    } else {
      setIsRecording(false);
    }
  };

  const handlePicClick = (e) => {
    e.stopPropagation();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const newMessage = {
          id: messages.length + 1,
          sender: 'child',
          text: `📷 Bild hochgeladen: ${file.name}`,
          timestamp: new Date(),
          position: { x: 24, y: messages.length * 150 + 103 }
        };
        setMessages([...messages, newMessage]);
      }
    };
    input.click();
  };

  const handleSendMessage = (text) => {
    if (!text.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      sender: 'child',
      text: text.trim(),
      timestamp: new Date(),
      position: { x: 24, y: messages.length * 150 + 103 }
    };

    setMessages([...messages, newMessage]);
    setInputText('');

    setTimeout(() => {
      const kibundoResponse = {
        id: messages.length + 2,
        sender: 'kibundo',
        text: 'Super! Ich habe Deine Hausaufgabe gespeichert. Möchtest Du noch eine weitere hinzufügen?',
        timestamp: new Date(),
        position: { x: 635, y: messages.length * 150 + 176 }
      };
      setMessages(prev => [...prev, kibundoResponse]);
    }, 1000);
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSendMessage(inputText);
  };

  return (
    <>
      {/* Footer - Always visible at bottom, Frame 9 at y:720, 1280x80 */}
      <div
        className="fixed bottom-0 z-40"
        style={{
          width: '1280px',
          height: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#E1EAAC',
          padding: '12px 24px',
          position: 'relative',
          cursor: 'pointer'
        }}
        onClick={handleToggle}
      >
        {/* Chat bar - Group 6:271 at y:17 (relative to Frame 9), 1280x66 with shadow */}
        <div
          className="absolute"
          style={{
            left: '0px',
            top: '17px',
            width: '1280px',
            height: '66px',
            boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Frame 30 - Shadow layer at y:31 (relative to chat bar), 1280x35, #DDE2AA */}
          <div
            className="absolute"
            style={{
              left: '0px',
              top: '14px',
              width: '1280px',
              height: '35px',
              backgroundColor: '#DDE2AA'
            }}
          />

          {/* Group 6 - Notch at x:598, y:0 (relative to chat bar), 84x63, #D9D9D9 */}
          <div
            className="absolute"
            style={{
              left: '598px',
              top: '0px',
              width: '84px',
              height: '63px',
              backgroundColor: '#D9D9D9',
              clipPath: 'ellipse(84px 84px at 50% 0%)'
            }}
          />
        </div>

        {/* Vector arrow - at x:628, y:38 (relative to Frame 9), 24x14, stroke #544C3B, strokeWidth 3px */}
        <svg
          className="absolute transition-transform duration-300"
          style={{
            left: '628px',
            top: '38px',
            width: '24px',
            height: '14px',
            zIndex: 10,
            pointerEvents: 'none',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
          viewBox="0 0 24 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 0L12 14M0 7L24 7" stroke="#544C3B" strokeWidth="3"/>
        </svg>
      </div>

      {/* Backdrop overlay when modal is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-45"
          onClick={handleToggle}
          style={{
            width: '100vw',
            height: '100vh'
          }}
        />
      )}

      {/* Modal - Slides up from bottom when open, exact Figma layout */}
      <div
        className="fixed bottom-0 z-50 transition-transform duration-300 ease-in-out"
        style={{
          width: '1280px',
          height: '800px',
          left: '50%',
          transform: isOpen 
            ? 'translateX(-50%) translateY(0)' 
            : 'translateX(-50%) translateY(100%)',
          backgroundColor: '#FFFFFF',
          willChange: 'transform'
        }}
      >
        {/* Background Image */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src="/images/img_background.png"
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* Chat window background - at y:90, height:630, background #E1EAAC */}
        <div
          className="absolute overflow-y-auto"
          style={{
            left: '0px',
            top: '90px',
            width: '1280px',
            height: '630px',
            backgroundColor: '#E1EAAC',
            padding: '24px',
            position: 'relative'
          }}
        >
          {/* Hausaufgaben sammeln Banner - width 1232px, background #E27474, borderRadius 16px */}
          <div
            className="mb-4 flex items-center justify-center"
            style={{
              width: '1232px',
              minHeight: '57px',
              backgroundColor: '#E27474',
              borderRadius: '16px',
              padding: '5px 10px',
              gap: '20px'
            }}
          >
            {/* Frame 33 - Icon 40x47 */}
            <svg width="40" height="47" viewBox="0 0 40 47" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0L20 47M0 23.5L40 23.5" stroke="white" strokeWidth="3"/>
              <circle cx="20" cy="23.5" r="8" stroke="white" strokeWidth="2" fill="none"/>
            </svg>
            <span
              style={{
                fontFamily: 'Nunito',
                fontWeight: 900,
                fontSize: '35px',
                lineHeight: '48px',
                color: '#FFFFFF'
              }}
            >
              Hausaufgaben sammeln
            </span>
          </div>

          {/* Clouds Background - at y:110 (relative to chat window), 1280x410, opacity 0.5 */}
          <div
            className="absolute"
            style={{
              left: '0px',
              top: '110px',
              width: '1280px',
              height: '410px',
              opacity: 0.5,
              pointerEvents: 'none'
            }}
          >
            <img
              src="/images/img_component_4.svg"
              alt="Clouds"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Messages Container - absolute positioning matching Figma */}
          <div className="relative" style={{ minHeight: '500px' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className="absolute flex items-center"
                style={{
                  left: `${message.position.x}px`,
                  top: `${message.position.y}px`,
                  gap: '2px'
                }}
              >
                {/* Child Avatar - 56x56.25 */}
                {message.sender === 'child' && (
                  <div
                    className="flex-shrink-0"
                    style={{
                      width: '56px',
                      height: '56.25px',
                      borderRadius: '50%',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src="/images/img_ebene_1.png"
                      alt="Child avatar"
                      className="w-full h-full object-cover"
                      style={{
                        width: '56px',
                        height: '56.25px'
                      }}
                    />
                  </div>
                )}

                {/* Speech Bubble - exact Figma styling */}
                <div
                  className="relative rounded-[18px] border"
                  style={{
                    backgroundColor: message.sender === 'child' ? '#EAFFFE' : '#D9F98D',
                    borderColor: message.sender === 'child' ? '#F3E6C8' : '#E1EAAC',
                    borderWidth: '1px',
                    boxShadow: message.sender === 'child' 
                      ? '2px 2px 4px rgba(0, 0, 0, 0.25)' 
                      : '-2px 2px 4px rgba(0, 0, 0, 0.25)',
                    padding: '5px 25px'
                  }}
                >
                  {/* Speech bubble arrow - 25x44 */}
                  {message.sender === 'child' ? (
                    <div
                      className="absolute"
                      style={{
                        left: '1px',
                        top: '22px',
                        width: '25px',
                        height: '44px',
                        clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                        backgroundColor: '#EAFFFE',
                        borderLeft: '1px solid #F3E6C8'
                      }}
                    />
                  ) : (
                    <div
                      className="absolute"
                      style={{
                        right: '1px',
                        top: '22px',
                        width: '25px',
                        height: '44px',
                        clipPath: 'polygon(100% 0, 0 50%, 100% 100%)',
                        backgroundColor: '#D9F98D',
                        borderRight: '1px solid #E1EAAC'
                      }}
                    />
                  )}

                  {/* Text content - padding 18px */}
                  <div style={{ padding: '18px' }}>
                    <p
                      className="whitespace-pre-line"
                      style={{
                        fontFamily: 'Nunito',
                        fontWeight: 400,
                        fontSize: '18px',
                        lineHeight: '24.5px',
                        color: '#000000',
                        margin: 0
                      }}
                    >
                      {message.text}
                    </p>
                  </div>
                </div>

                {/* Kibundo Avatar - 56x56.25 */}
                {message.sender === 'kibundo' && (
                  <div
                    className="flex-shrink-0"
                    style={{
                      width: '56px',
                      height: '56.25px',
                      borderRadius: '50%',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src="/images/img_kibundo.png"
                      alt="Kibundo avatar"
                      className="w-full h-full object-cover"
                      style={{
                        width: '56px',
                        height: '56.25px'
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Chat Input Bar - Frame 9 at y:720, 1280x80, exact Figma layout */}
        <div
          className="absolute"
          style={{
            left: '0px',
            top: '720px',
            width: '1280px',
            height: '80px',
            backgroundColor: '#E1EAAC',
            padding: '12px 24px',
            position: 'relative',
            zIndex: 10
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Chat bar - Group 6:271 at y:17, 1280x66 with shadow */}
          <div
            className="absolute"
            style={{
              left: '0px',
              top: '17px',
              width: '1280px',
              height: '66px',
              boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.5)',
              zIndex: 1
            }}
          >
            {/* Frame 30 - Shadow layer at y:31 relative to chat bar, 1280x35, #DDE2AA */}
            <div
              className="absolute"
              style={{
                left: '0px',
                top: '14px',
                width: '1280px',
                height: '35px',
                backgroundColor: '#DDE2AA',
                zIndex: 0
              }}
            />

            {/* Group 6 - Notch at x:598, y:0, 84x63, #D9D9D9 */}
            <div
              className="absolute"
              style={{
                left: '598px',
                top: '0px',
                width: '84px',
                height: '63px',
                backgroundColor: '#D9D9D9',
                clipPath: 'ellipse(84px 84px at 50% 0%)',
                zIndex: 2
              }}
            />
          </div>

          {/* Mic/Voice Button - 48x48 at x:198, y:16 */}
          <button
            onClick={handleMicClick}
            className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
            style={{
              left: '198px',
              top: '16px',
              width: '48px',
              height: '48px',
              backgroundColor: '#FFFFFF',
              boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
              zIndex: 20,
              borderRadius: '50%'
            }}
            aria-label="Spracheingabe"
          >
            <svg width="20" height="29" viewBox="0 0 20 29" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0C8.34 0 7 1.34 7 3V13C7 14.66 8.34 16 10 16C11.66 16 13 14.66 13 13V3C13 1.34 11.66 0 10 0Z" fill="#222020"/>
              <path d="M5 13C5 15.76 7.24 18 10 18C12.76 18 15 15.76 15 13H17C17 16.53 14.39 19.44 11 19.93V23H9V19.93C5.61 19.44 3 16.53 3 13H5Z" fill="#222020"/>
            </svg>
          </button>

          {/* Pic/Image Button - 48x48 at x:268, y:16 */}
          <button
            onClick={handlePicClick}
            className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
            style={{
              left: '268px',
              top: '16px',
              width: '48px',
              height: '48px',
              backgroundColor: '#FFFFFF',
              boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
              zIndex: 20,
              borderRadius: '50%'
            }}
            aria-label="Bild hochladen"
          >
            <svg width="27" height="22" viewBox="0 0 27 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 0H3C1.35 0 0 1.35 0 3V19C0 20.65 1.35 22 3 22H24C25.65 22 27 20.65 27 19V3C27 1.35 25.65 0 24 0ZM24 19H3V3H24V19Z" fill="#222020"/>
              <path d="M8.5 13.5L12 10L16 14.5L20.5 9.5H24V17H3V13.5H8.5Z" fill="#222020"/>
            </svg>
          </button>

          {/* Text Input Field - 600x48 at x:340, y:16, background #BDCF56 */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleTextSubmit(e);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder="Hausaufgabe beschreiben..."
            className="absolute border focus:outline-none"
            style={{
              left: '340px',
              top: '16px',
              width: '600px',
              height: '48px',
              fontFamily: 'Nunito',
              fontSize: '18px',
              lineHeight: '24.5px',
              backgroundColor: '#BDCF56',
              border: '1px solid #544C3B',
              borderWidth: '1px',
              padding: '12px 16px',
              color: '#000000',
              zIndex: 20,
              borderRadius: '0px',
              boxSizing: 'border-box'
            }}
          />

          {/* Camera Button - 48x48 at x:964, y:16 */}
          <button
            onClick={handleCameraClick}
            className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
            style={{
              left: '964px',
              top: '16px',
              width: '48px',
              height: '48px',
              backgroundColor: '#FFFFFF',
              boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
              zIndex: 20,
              borderRadius: '50%'
            }}
            aria-label="Kamera öffnen"
          >
            <svg width="24" height="21" viewBox="0 0 24 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 7.5C9.93 7.5 8.25 9.18 8.25 11.25C8.25 13.32 9.93 15 12 15C14.07 15 15.75 13.32 15.75 11.25C15.75 9.18 14.07 7.5 12 7.5ZM12 13.5C11.17 13.5 10.5 12.83 10.5 12C10.5 11.17 11.17 10.5 12 10.5C12.83 10.5 13.5 11.17 13.5 12C13.5 12.83 12.83 13.5 12 13.5Z" fill="#222020"/>
              <path d="M19.5 4.5H16.5L15.75 2.25H8.25L7.5 4.5H4.5C3.675 4.5 3 5.175 3 6V18C3 18.825 3.675 19.5 4.5 19.5H19.5C20.325 19.5 21 18.825 21 18V6C21 5.175 20.325 4.5 19.5 4.5ZM19.5 18H4.5V6H19.5V18Z" fill="#222020"/>
            </svg>
          </button>

          {/* Send Button - 48x48 at x:1036, y:16 */}
          <button
            onClick={handleTextSubmit}
            disabled={!inputText.trim()}
            className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              left: '1036px',
              top: '16px',
              width: '48px',
              height: '48px',
              backgroundColor: '#FFFFFF',
              boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
              zIndex: 20,
              borderRadius: '50%'
            }}
            aria-label="Senden"
          >
            <svg width="14" height="24" viewBox="0 0 14 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 0L7 23.64" stroke="#544C3B" strokeWidth="3"/>
            </svg>
          </button>

          {/* Vector arrow - at x:628, y:38, 24x14, stroke #544C3B, strokeWidth 3px */}
          <svg
            className="absolute cursor-pointer transition-transform duration-300"
            onClick={handleToggle}
            style={{
              left: '628px',
              top: '38px',
              width: '24px',
              height: '14px',
              zIndex: 30,
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              pointerEvents: 'auto'
            }}
            viewBox="0 0 24 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 0L12 14M0 7L24 7" stroke="#544C3B" strokeWidth="3"/>
          </svg>
        </div>
      </div>
    </>
  );
};

export default HomeworkChatFooter;

