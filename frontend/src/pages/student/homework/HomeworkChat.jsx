import React, { useEffect, useState, useCallback } from "react";
import ChatLayer from "@/components/student/mobile/ChatLayer.jsx";
import { useNavigate, useLocation } from "react-router-dom";

import { message } from "antd";
import api from "@/api/axios";

const PROGRESS_KEY = "kibundo.homework.progress.v1";

// Helper to format messages for ChatLayer
const formatMessage = (content, from = "agent", type = 'text') => ({
  id: Date.now() + Math.random().toString(36).slice(2, 9),
  from,
  type,
  content,
  timestamp: new Date().toISOString()
});

// Helper to analyze image with AI
const analyzeImage = async (imageData) => {
  try {
    const formData = new FormData();
    formData.append('image', imageData);
    
    const response = await api.post('/ai/analyze-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error analyzing image:', error);
    return {
      success: false,
      error: 'Failed to analyze image. Please try again.'
    };
  }
};

export default function HomeworkChat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { markHomeworkDone } = useChatDock() || {};
  const [open, setOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    formatMessage("Hallo! Ich bin dein KI-Lernhelfer. Wie kann ich dir bei deinen Hausaufgaben helfen?")
  ]);
  
  // Handle initial image upload from HomeworkDoing
  useEffect(() => {
    if (location.state?.image) {
      const imageMessage = {
        id: Date.now(),
        from: 'student',
        type: 'image',
        content: URL.createObjectURL(location.state.image),
        timestamp: new Date().toISOString()
      };
      
      setChatHistory(prev => [...prev, imageMessage]);
      
      // Process the image with AI
      const processImage = async () => {
        setIsTyping(true);
        try {
          const formData = new FormData();
          formData.append('image', location.state.image);
          
          const response = await api.post('/ai/analyze-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          
          if (response.data) {
            setChatHistory(prev => [
              ...prev, 
              formatMessage(response.data.analysis, 'agent')
            ]);
          }
        } catch (error) {
          console.error('Error processing image:', error);
          setChatHistory(prev => [
            ...prev, 
            formatMessage("Entschuldigung, ich konnte das Bild nicht analysieren. Bitte versuche es später noch einmal.", 'agent')
          ]);
        } finally {
          setIsTyping(false);
        }
      };
      
      processImage();
    }
  }, [location.state?.image]);

  // Send message to AI backend
  const sendToAI = useCallback(async (content, type = 'text') => {
    try {
      setIsTyping(true);
      
      if (type === 'image') {
        // For images, we've already processed them in the useEffect
        return { success: true, response: "Ich habe dein Bild erhalten. Lass mich das für dich analysieren..." };
      }
      
      // For text messages
      const { data } = await api.post("/ai/chat", { 
        question: content,
        ai_agent: "ChildAgent"
      });
      return { success: true, response: data?.answer };
    } catch (error) {
      console.error("AI Chat error:", error);
      return { 
        success: false, 
        error: error.response?.data?.message || "Es ist ein Fehler aufgetreten. Bitte versuche es später erneut."
      };
    } finally {
      setIsTyping(false);
    }
  }, []);

  // Handle sending a new message or image
  const handleSendMessage = useCallback(async (content, type = 'text') => {
    if (!content) return;

    // Add user message to chat
    const userMessage = type === 'image' 
      ? { ...content, from: 'student', type: 'image' }
      : formatMessage(content, 'student');
      
    setChatHistory(prev => [...prev, userMessage]);

    // Get AI response
    const { success, response, error } = await sendToAI(content, type);
    
    if (success) {
      setChatHistory(prev => [...prev, formatMessage(response, 'agent')]);
    } else {
      message.error(error);
    }
  }, [sendToAI]);

  // Keep progress at step 2 while chatting
  useEffect(() => {
    try {
      const prev = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...prev, step: 2 }));
    } catch {}
  }, []);

  const handleDone = () => {
    if (typeof markHomeworkDone === "function") {
      markHomeworkDone(); // your context handles step 3 + navigate
      return;
    }
    // Fallback if provider isn’t mounted
    try {
      const prev = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...prev, step: 3 }));
    } catch {}
    navigate("/student/homework/feedback", { replace: true });
  };

  return (
    <div className="relative w-full h-[100dvh] bg-white">
      {open ? (
        <ChatLayer
          className="h-full"
          messages={chatHistory}
          onSendText={handleSendMessage}
          onSendMedia={(file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              handleSendMessage({
                id: Date.now(),
                content: e.target.result,
                type: 'image',
                fileName: file.name,
                fileType: file.type,
                size: file.size
              }, 'image');
            };
            reader.readAsDataURL(file);
          }}
          isTyping={isTyping}
          onMinimise={() => setOpen(false)}
          // Uncomment if needed:
          // minimiseTo="/student/homework"
        />
      ) : (
        <div className="px-4 py-6">
          <h1 className="text-lg font-semibold mb-2">Chat minimiert</h1>
          <p className="mb-4 text-[15px] text-gray-600">
            Tippe unten, um den Chat wieder zu öffnen.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 rounded-xl bg-black text-white"
            aria-label="Chat wieder öffnen"
          >
            Chat öffnen
          </button>
        </div>
      )}

      {/* Floating DONE CTA above the input area */}
      {open && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 pb-[calc(env(safe-area-inset-bottom)+96px)] flex justify-center">
          <button
            type="button"
            onClick={handleDone}
            className="pointer-events-auto mb-3 inline-flex items-center justify-center px-6 h-11 rounded-xl font-semibold text-white shadow-lg"
            style={{ backgroundColor: "#FF7900" }}
          >
            Fertig
          </button>
        </div>
      )}
    </div>
  );
}