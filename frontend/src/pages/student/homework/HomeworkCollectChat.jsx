import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '@/api/axios';
import { useStudentId } from '@/hooks/useStudentId';
import { useAuthContext } from '@/context/AuthContext';
import { useStudentApp } from '@/context/StudentAppContext';
import kibundoAvatar from '@/assets/kibundo_chat.png';

const HomeworkCollectChat = ({ isOpen, onClose, onScanComplete, initialScanId = null, isCompletingHomework = false }) => {
  const studentUserId = useStudentId(); // This is the user_id
  const { user } = useAuthContext();
  const { buddy, profile, interests } = useStudentApp();
  const [messages, setMessages] = useState([]);
  const [studentRecordId, setStudentRecordId] = useState(null); // This is the student record ID from students table
  const [characterAvatar, setCharacterAvatar] = useState(null);
  const [studentNameFromRecord, setStudentNameFromRecord] = useState(null);
  
  // Get student name - prioritize student record, then profile, then user
  const studentName = studentNameFromRecord || profile?.name || user?.first_name || user?.name || 'Schüler';
  
  // Character mapping - matches CharacterSelection component
  const characterImages = {
    1: '/images/img_rectangle_20.png',
    2: '/images/img_rectangle_20_264x174.png',
    3: '/images/img_rectangle_20_1.png',
    4: '/images/img_rectangle_20_2.png',
    5: '/images/img_rectangle_20_3.png',
    6: '/images/img_rectangle_20_4.png'
  };
  
  // Get character selection from interests/preferences
  useEffect(() => {
    const getCharacterFromInterests = async () => {
      if (!studentRecordId && !studentUserId) return;
      
      try {
        // Try to get characterSelection from interests array
        let characterId = null;
        
        // Check interests array for characterSelection
        if (Array.isArray(interests)) {
          const characterInterest = interests.find(
            item => item?.id === 'characterSelection' || item?.value === 'characterSelection'
          );
          if (characterInterest?.value && typeof characterInterest.value === 'number') {
            characterId = characterInterest.value;
          } else if (characterInterest?.id && typeof characterInterest.id === 'number') {
            characterId = characterInterest.id;
          }
        }
        
        // If not found in interests, try fetching from database
        if (!characterId && studentRecordId) {
          try {
            const { data: studentData } = await api.get(`/student/${studentRecordId}`);
            if (studentData?.interests && Array.isArray(studentData.interests)) {
              const characterInterest = studentData.interests.find(
                item => item?.id === 'characterSelection' || item?.value === 'characterSelection'
              );
              if (characterInterest?.value && typeof characterInterest.value === 'number') {
                characterId = characterInterest.value;
              }
            }
          } catch (err) {
            console.warn('Could not fetch student data for character:', err);
          }
        }
        
        // Set character avatar if found
        if (characterId && characterImages[characterId]) {
          setCharacterAvatar(characterImages[characterId]);
        }
      } catch (error) {
        console.warn('Error getting character from interests:', error);
      }
    };
    
    getCharacterFromInterests();
  }, [studentRecordId, studentUserId, interests]);
  
  // Get student avatar - prioritize selected character from characterSelection
  // Fallback to buddy.avatar, then buddy.img, then default
  const studentAvatar = characterAvatar || 
                       buddy?.avatar || 
                       buddy?.img || 
                       '/images/img_ebene_1.png'; // Fallback to default

  // Fetch student record ID from user ID and get student name
  useEffect(() => {
    const fetchStudentRecordId = async () => {
      if (!studentUserId) return;
      
      try {
        const { data } = await api.get(`/student-id?user_id=${studentUserId}`);
        if (data?.student_id) {
          setStudentRecordId(data.student_id);
          
          // Fetch student record to get name and character
          try {
            const { data: studentData } = await api.get(`/student/${data.student_id}`);
            
            // Extract student name
            if (studentData?.user) {
              const firstName = studentData.user.first_name || '';
              const lastName = studentData.user.last_name || '';
              const fullName = `${firstName} ${lastName}`.trim();
              if (fullName) {
                setStudentNameFromRecord(fullName);
              } else if (studentData.user.first_name) {
                setStudentNameFromRecord(studentData.user.first_name);
              }
            } else if (studentData?.name) {
              setStudentNameFromRecord(studentData.name);
            }
            
            // Extract character selection if not already found in interests
            if (studentData?.interests && Array.isArray(studentData.interests)) {
              const characterInterest = studentData.interests.find(
                item => item?.id === 'characterSelection' || item?.value === 'characterSelection'
              );
              if (characterInterest?.value && typeof characterInterest.value === 'number') {
                const characterId = characterInterest.value;
                if (characterImages[characterId]) {
                  setCharacterAvatar(characterImages[characterId]);
                }
              }
            }
          } catch (err) {
            console.warn('Could not fetch student data from record:', err);
          }
        }
      } catch (error) {
        console.error('Error fetching student record ID:', error);
      }
    };
    
    fetchStudentRecordId();
  }, [studentUserId]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [scanId, setScanId] = useState(null);
  const chatEndRef = useRef(null);
  const lastSpokenMessageId = useRef(null);

  // Try to parse older markdown-based scan result messages into structured data
  const parseScanResultText = (text = '') => {
    if (!text || typeof text !== 'string') return null;

    const subjectMatch = text.match(/Fach:\s*([^\n]+)/i);
    const subject = subjectMatch ? subjectMatch[1].replace(/[#*]/g, '').trim() : null;

    const homeworkMatch = text.match(/\*\*Gescannte Hausaufgabe:\*\*\s*\n\n?([^]*?)(?:\n\n\*\*Gefundene Fragen:\*\*|\n\n>|$)/i);
    const homeworkText = homeworkMatch ? homeworkMatch[1].trim() : null;

    const questionsSection = text.match(/\*\*Gefundene Fragen:\*\*\s*\n\n?([^]*?)(?:\n\n>|$)/i);
    let questions = [];
    if (questionsSection) {
      questions = questionsSection[1]
        .split('\n')
        .map(q => q.replace(/^\s*\d+\.\s*/, '').trim())
        .filter(Boolean);
    }

    const encouragementLine = text.split('\n').find(line => line.trim().startsWith('>'));
    const encouragementText = encouragementLine ? encouragementLine.replace(/^>\s?/, '').trim() : '';

    if (!subject && !homeworkText && questions.length === 0) return null;

    return {
      subject,
      homeworkText,
      questions,
      encouragementText,
    };
  };

  const renderScanResultCard = (data) => {
    if (!data) return null;

    const {
      subject,
      homeworkText,
      questions = [],
      encouragementText,
    } = data;

    const safeSubject = subject || 'Unbekannt';
    const safeHomework = homeworkText || '';
    const hasQuestions = Array.isArray(questions) && questions.length > 0;
    const encouragement = encouragementText || '💪 Versuche zuerst selbst, die Fragen zu beantworten! Du schaffst das! Wenn du Hilfe brauchst, frag mich einfach. Ich helfe dir gerne, aber ich möchte, dass du zuerst selbst denkst. 🌟';
    const firstSentenceEnd = encouragement.indexOf('!') !== -1 ? encouragement.indexOf('!') + 1 : encouragement.length;
    const encouragementLead = encouragement.slice(0, firstSentenceEnd).trim();
    const encouragementRest = encouragement.slice(firstSentenceEnd).trim();

    return (
      <div
        style={{
          backgroundColor: '#D8F9AA',
          borderRadius: '16px',
          padding: 'clamp(16px, 2vw, 22px)',
          boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.12)',
          border: '1px solid #E8F6C2',
          width: 'clamp(280px, 90%, 980px)',
          maxWidth: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '22px' }}>📚</span>
          <span
            style={{
              fontFamily: 'Nunito',
              fontWeight: 800,
              fontSize: 'clamp(18px, 2vw, 22px)',
              color: '#3A362E',
              lineHeight: 1.3,
            }}
          >
            Fach: {safeSubject}
          </span>
        </div>

        {safeHomework && (
          <div style={{ marginBottom: hasQuestions ? '14px' : '8px' }}>
            <div
              style={{
                fontFamily: 'Nunito',
                fontWeight: 800,
                fontSize: 'clamp(14px, 1.6vw, 16px)',
                color: '#3A362E',
                marginBottom: '6px',
              }}
            >
              Gescannte Hausaufgabe:
            </div>
            <div
              style={{
                fontFamily: 'Nunito',
                fontWeight: 400,
                fontSize: 'clamp(14px, 1.4vw, 16px)',
                lineHeight: 1.6,
                color: '#3A362E',
                whiteSpace: 'pre-wrap',
              }}
            >
              {safeHomework}
            </div>
          </div>
        )}

        {hasQuestions && (
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontFamily: 'Nunito',
                fontWeight: 800,
                fontSize: 'clamp(14px, 1.6vw, 16px)',
                color: '#3A362E',
                marginBottom: '6px',
              }}
            >
              Gefundene Fragen:
            </div>
            <ul
              style={{
                paddingLeft: '20px',
                margin: 0,
                listStyleType: 'disc',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {questions.map((q, idx) => (
                <li
                  key={`${q}-${idx}`}
                  style={{
                    fontFamily: 'Nunito',
                    fontWeight: 400,
                    fontSize: 'clamp(14px, 1.4vw, 16px)',
                    lineHeight: 1.6,
                    color: '#3A362E',
                  }}
                >
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}

        {encouragement && (
          <div
            style={{
              borderLeft: '4px solid #EF7C2E',
              backgroundColor: '#F9F7E7',
              borderRadius: '10px',
              padding: '12px 14px',
              fontFamily: 'Nunito',
              fontSize: 'clamp(14px, 1.4vw, 16px)',
              lineHeight: 1.6,
              color: '#555',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
          >
            <strong style={{ fontWeight: 800, color: '#3A362E' }}>
              {encouragementLead}
            </strong>{' '}
            {encouragementRest}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (isOpen && chatEndRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [messages, isOpen]);

  // Load conversation and messages when opening with existing scanId
  useEffect(() => {
    const loadExistingConversation = async () => {
      if (!isOpen || !initialScanId) {
        console.log('📋 Not loading conversation:', { isOpen, initialScanId });
        return;
      }
      
      console.log('📋 Loading conversation for scanId:', initialScanId);
      
      try {
        // Ensure initialScanId is a number
        const numericScanId = typeof initialScanId === 'number' 
          ? initialScanId 
          : (typeof initialScanId === 'string' && !isNaN(parseInt(initialScanId)) 
            ? parseInt(initialScanId) 
            : null);
        
        if (!numericScanId) {
          console.warn('⚠️ Invalid scanId format:', initialScanId);
          setScanId(null);
          setMessages([]);
          return;
        }
        
        // First, find the conversation for this scan
        console.log('🔍 Fetching conversations for scanId:', numericScanId);
        const { data: conversations } = await api.get(`/conversations?scan_id=${numericScanId}`);
        
        console.log('💬 Found conversations:', conversations);
        
        if (conversations && conversations.length > 0) {
          const existingConv = conversations[0];
          const convId = existingConv.id;
          console.log('✅ Using conversation ID:', convId);
          setConversationId(convId);
          setScanId(numericScanId);
          
          // Fetch messages for this conversation
          try {
            console.log('📨 Fetching messages for conversation:', convId);
            const { data: messagesData } = await api.get(`/conversations/${convId}/messages`);
            
            console.log('💬 Loaded messages:', messagesData);
            
            if (messagesData && Array.isArray(messagesData) && messagesData.length > 0) {
              // Convert backend messages to frontend format
              const formattedMessages = messagesData.map((msg, idx) => {
                const base = {
                  id: msg.id || idx + 1,
                  sender: msg.sender === 'bot' ? 'kibundo' : msg.sender === 'student' ? 'child' : msg.sender,
                  text: msg.content || '',
                  timestamp: msg.created_at ? new Date(msg.created_at) : new Date()
                };
                const parsed = parseScanResultText(base.text);
                return parsed ? { ...base, type: 'scanResults', ...parsed } : base;
              });
              
              console.log('✅ Setting formatted messages:', formattedMessages);
              setMessages(formattedMessages);
              return; // Don't add greeting if we have messages
            } else {
              console.log('⚠️ No messages found in conversation');
            }
          } catch (msgErr) {
            console.warn('❌ Could not load messages for conversation:', msgErr);
          }
        } else {
          console.log('⚠️ No conversation found for scanId:', numericScanId);
        }
        
        // If we get here, either no conversation found or no messages loaded
        setScanId(numericScanId);
        // Start with empty messages - student should greet first
        setMessages([]);
      } catch (error) {
        console.error('❌ Error loading existing conversation:', error);
        // Fallback: just set scanId and start empty
        const numericScanId = typeof initialScanId === 'number' 
          ? initialScanId 
          : (typeof initialScanId === 'string' && !isNaN(parseInt(initialScanId)) 
            ? parseInt(initialScanId) 
            : null);
        if (numericScanId) {
          setScanId(numericScanId);
        }
        setMessages([]);
      }
    };
    
    if (isOpen && initialScanId) {
      loadExistingConversation();
    } else if (isOpen && !initialScanId) {
      // Reset for new task - start with empty chat
      setScanId(null);
      setConversationId(null);
      setMessages([]);
    }
  }, [isOpen, initialScanId]);

  // Reset messages when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInputText('');
      setConversationId(null);
      setScanId(null); // Reset scanId when closing - start fresh for new chats
    }
  }, [isOpen]);

  const handleCameraClick = () => {
    // Open camera using file input with capture attribute (works on mobile and desktop)
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use back camera on mobile devices
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        await uploadAndScanImage(file, 'camera');
      }
    };
    input.click();
  };

  const handleMicClick = () => {
    if (inputText.trim()) {
      // If there's text, send it instead of recording
      handleSendMessage(inputText);
      return;
    }

    if (!isRecording) {
      // Start voice recording using Web Speech API
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'de-DE';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setIsRecording(false);
          if (transcript) {
            handleSendMessage(transcript);
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error === 'not-allowed') {
            alert('Mikrofon-Zugriff wurde nicht erlaubt. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.');
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
      } else {
        // Fallback: use browser's built-in speech recognition or prompt
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
              setIsRecording(true);
              // For now, prompt for text input as fallback
              setTimeout(() => {
                setIsRecording(false);
                stream.getTracks().forEach(track => track.stop());
                const voiceText = prompt('Bitte geben Sie Ihre Nachricht ein:');
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
          alert('Spracherkennung wird in diesem Browser nicht unterstützt.');
        }
      }
    } else {
      // Stop recording
      setIsRecording(false);
    }
  };

  const handlePicClick = () => {
    // Open file picker for image
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        await uploadAndScanImage(file, 'gallery');
      }
    };
    input.click();
  };

  const uploadAndScanImage = async (fileOrBlob, source) => {
    if (isUploading) return;
    
    // Ensure we have student record ID before uploading
    let finalStudentRecordId = studentRecordId;
    if (!finalStudentRecordId && studentUserId) {
      try {
        const { data } = await api.get(`/student-id?user_id=${studentUserId}`);
        if (data?.student_id) {
          finalStudentRecordId = data.student_id;
          setStudentRecordId(data.student_id);
        }
      } catch (error) {
        console.error('Error fetching student record ID before upload:', error);
      }
    }
    
    setIsUploading(true);
    
    // Show uploading message
    const uploadingMessage = {
      id: Date.now(),
      sender: 'child',
      text: '📷 Scanne Hausaufgabe...',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, uploadingMessage]);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', fileOrBlob);
      // Use student record ID (not user_id) for the upload
      if (finalStudentRecordId) {
        console.log('📤 Uploading with student record ID:', finalStudentRecordId);
        formData.append('student_id', finalStudentRecordId.toString());
      } else if (studentUserId) {
        // Fallback: try with user_id, backend will look it up
        console.warn('⚠️ Using user_id as fallback:', studentUserId);
        formData.append('student_id', studentUserId.toString());
      } else {
        console.error('❌ No student ID available for upload');
      }
      if (conversationId) {
        formData.append('conversationId', conversationId.toString());
      }
      if (scanId) {
        formData.append('scanId', scanId.toString());
      }
      // Check if this is a completion scan - use prop value directly
      if (isCompletingHomework) {
        formData.append('isCompletingHomework', 'true');
      }

      // Upload and scan the image
      let data;
      try {
        const response = await api.post('/ai/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('📥 Full upload response:', response);
        console.log('📥 Response data:', response.data);
        console.log('📥 Response status:', response.status);
        data = response.data;
        console.log('✅ Upload successful, scan data:', data?.scan);
        console.log('✅ Upload successful, full data:', data);
      } catch (error) {
        console.error('❌ Upload error:', error);
        console.error('❌ Error response:', error.response?.data);
        setIsUploading(false);
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== uploadingMessage.id);
          return [...filtered, {
            id: Date.now(),
            sender: 'kibundo',
            text: 'Entschuldigung, beim Hochladen ist ein Fehler aufgetreten. Bitte versuche es erneut.',
            timestamp: new Date()
          }];
        });
        return;
      }

      // Update conversation and scan IDs immediately
      const newConversationId = data?.conversationId || conversationId;
      const newScanId = data?.scan?.id || scanId;
      
      if (newConversationId && newConversationId !== conversationId) {
        setConversationId(newConversationId);
      }
      if (newScanId && newScanId !== scanId) {
        setScanId(newScanId);
      }

      // Notify parent component that a new scan was created
      if (newScanId && onScanComplete) {
        onScanComplete();
      }

      // Remove uploading message and add success message
      setMessages(prev => prev.filter(m => m.id !== uploadingMessage.id));

      // Add message with scan confirmation
      const detectedSubject = data.scan?.detected_subject || data.parsed?.subject || null;
      const scanMessage = {
        id: Date.now(),
        sender: 'child',
        text: `📷 Hausaufgabe gescannt${detectedSubject && detectedSubject !== 'Sonstiges' && detectedSubject !== 'Unbekannt' ? `: ${detectedSubject}` : ' - wird analysiert...'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, scanMessage]);

      // 🔥 Handle completion comparison if this is a completion scan
      if (isCompletingHomework && data.completionComparison) {
        const comparison = data.completionComparison;
        let comparisonText = '';
        
        if (comparison.all_completed) {
          comparisonText += `## ✅ Großartig! Du hast alle Aufgaben bearbeitet!\n\n`;
        } else {
          comparisonText += `## ⚠️ Fast geschafft!\n\n`;
        }
        
        if (comparison.total_questions) {
          comparisonText += `**Ergebnis:** ${comparison.correct_answers || 0} von ${comparison.total_questions} Aufgaben richtig\n\n`;
        }
        
        if (comparison.incorrect_tasks && comparison.incorrect_tasks.length > 0) {
          comparisonText += `**Falsche Aufgaben:**\n\n`;
          comparison.incorrect_tasks.forEach((task, index) => {
            comparisonText += `${index + 1}. **${task.question}**\n`;
            comparisonText += `   Deine Antwort: ${task.student_answer}\n`;
            comparisonText += `   Richtige Antwort: ${task.correct_answer}\n`;
            comparisonText += `   💡 ${task.feedback}\n\n`;
          });
        }
        
        if (comparison.feedback) {
          comparisonText += `**Feedback:**\n\n${comparison.feedback}\n\n`;
        }
        
        if (comparison.can_mark_completed) {
          comparisonText += `✅ Du kannst die Hausaufgabe jetzt als erledigt markieren!`;
        } else {
          comparisonText += `⚠️ Bitte korrigiere die falschen Aufgaben, bevor du die Hausaufgabe als erledigt markierst.`;
        }
        
        const comparisonMessage = {
          id: Date.now() + 2,
          sender: 'kibundo',
          type: 'completionComparison',
          text: comparisonText.trim(),
          timestamp: new Date(),
          comparison: comparison
        };
        setMessages(prev => [...prev, comparisonMessage]);
        
        // Auto-speak the comparison message
        if (window.speechSynthesis && comparisonText.trim()) {
          setTimeout(() => {
            window.speechSynthesis.cancel();
            const plainText = comparisonText
              .replace(/##\s+/g, '')
              .replace(/\*\*/g, '')
              .replace(/\n\n/g, '. ')
              .replace(/\n/g, ' ')
              .trim();
            const utterance = new SpeechSynthesisUtterance(plainText);
            utterance.lang = 'de-DE';
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
            lastSpokenMessageId.current = comparisonMessage.id;
          }, 500);
        }
        
        // Notify parent component about completion status
        if (onScanComplete && comparison.can_mark_completed) {
          // Allow marking as completed
          onScanComplete({ canMarkCompleted: true, comparison });
        }
      }
      
      // Add Kibundo's message with scanned results
      const rawText = data.scan?.raw_text || data.parsed?.raw_text || null;
      const questions = data.parsed?.questions || [];
      const subject = detectedSubject && detectedSubject !== 'Sonstiges' && detectedSubject !== 'Unbekannt' 
        ? detectedSubject 
        : null;

      if (rawText || questions.length > 0 || subject) {
        let resultsText = '';
        
        const displayText = rawText
          ? (rawText.length > 500 ? rawText.substring(0, 500) + '...' : rawText)
          : '';

        const questionsList = questions.map((q) => q.text || q.question || '').filter(Boolean);

        if (subject) {
          resultsText += `## 📚 Fach: ${subject}\n\n`;
        }
        
        if (displayText) {
          resultsText += `**Gescannte Hausaufgabe:**\n\n${displayText}\n\n`;
        }
        
        if (questionsList.length > 0) {
          resultsText += `**Gefundene Fragen:**\n\n`;
          questionsList.forEach((questionText, index) => {
            resultsText += `${index + 1}. ${questionText}\n`;
          });
          resultsText += '\n';
        }
        
        // Add encouraging message to try answering first
        if (questionsList.length > 0) {
          resultsText += `> 💪 **Versuche zuerst selbst, die Fragen zu beantworten!** Du schaffst das! Wenn du Hilfe brauchst, frag mich einfach. Ich helfe dir gerne, aber ich möchte, dass du zuerst selbst denkst. 🌟\n\n`;
        }
        
        if (resultsText) {
          const resultsMessage = {
            id: Date.now() + 1,
            sender: 'kibundo',
            type: 'scanResults',
            subject: subject || 'Unbekannt',
            homeworkText: displayText,
            questions: questionsList,
            encouragementText: questionsList.length > 0
              ? '💪 Versuche zuerst selbst, die Fragen zu beantworten! Du schaffst das! Wenn du Hilfe brauchst, frag mich einfach. Ich helfe dir gerne, aber ich möchte, dass du zuerst selbst denkst. 🌟'
              : '',
            text: resultsText.trim(),
            timestamp: new Date()
          };
          setMessages(prev => [...prev, resultsMessage]);
          
          // Auto-speak the scan results message
          if (window.speechSynthesis && resultsText.trim()) {
            setTimeout(() => {
              window.speechSynthesis.cancel();
              // Extract plain text from markdown for speech
              const plainText = resultsText
                .replace(/##\s+/g, '')
                .replace(/\*\*/g, '')
                .replace(/\n\n/g, '. ')
                .replace(/\n/g, ' ')
                .trim();
              const utterance = new SpeechSynthesisUtterance(plainText);
              utterance.lang = 'de-DE';
              utterance.rate = 0.9;
              utterance.pitch = 1.0;
              utterance.volume = 1.0;
              window.speechSynthesis.speak(utterance);
              lastSpokenMessageId.current = resultsMessage.id;
            }, 300);
          }
        }
      }
      
      // If subject is not yet detected, try to fetch updated scan after a short delay
      if (!detectedSubject || detectedSubject === 'Sonstiges' || detectedSubject === 'Unbekannt') {
        setTimeout(async () => {
          try {
            if (newScanId) {
              const { data: updatedScanData } = await api.get(`/student/${studentRecordId}/homeworkscans`);
              const updatedScan = updatedScanData?.find(s => s.id === newScanId);
              if (updatedScan?.detected_subject && updatedScan.detected_subject !== 'Sonstiges') {
                // Update the scan confirmation message with the detected subject
                setMessages(prev => prev.map(msg => 
                  msg.id === scanMessage.id 
                    ? { ...msg, text: `📷 Hausaufgabe gescannt: ${updatedScan.detected_subject}` }
                    : msg
                ));
                
                // If we have raw_text but didn't show it before, add it now
                if (updatedScan.raw_text && !rawText) {
                  const displayText = updatedScan.raw_text.length > 500 
                    ? updatedScan.raw_text.substring(0, 500) + '...' 
                    : updatedScan.raw_text;
                  
                  const resultsMessage = {
                    id: Date.now() + 2,
                    sender: 'kibundo',
                    type: 'scanResults',
                    subject: updatedScan.detected_subject || 'Unbekannt',
                    homeworkText: displayText,
                    questions: [],
                    encouragementText: '💪 Versuche zuerst selbst, die Fragen zu beantworten! Du schaffst das! Wenn du Hilfe brauchst, frag mich einfach. Ich helfe dir gerne, aber ich möchte, dass du zuerst selbst denkst. 🌟',
                    text: `## 📚 Fach: ${updatedScan.detected_subject}\n\n**Gescannte Hausaufgabe:**\n\n${displayText}\n\n> 💪 **Versuche zuerst selbst, die Aufgaben zu lösen!** Du schaffst das! Wenn du Hilfe brauchst, frag mich einfach. Ich helfe dir gerne, aber ich möchte, dass du zuerst selbst denkst. 🌟`,
                    timestamp: new Date()
                  };
                  setMessages(prev => [...prev, resultsMessage]);
                  
                  // Auto-speak the updated scan results
                  if (window.speechSynthesis && resultsMessage.text) {
                    setTimeout(() => {
                      window.speechSynthesis.cancel();
                      const plainText = resultsMessage.text
                        .replace(/##\s+/g, '')
                        .replace(/\*\*/g, '')
                        .replace(/\n\n/g, '. ')
                        .replace(/\n/g, ' ')
                        .trim();
                      const utterance = new SpeechSynthesisUtterance(plainText);
                      utterance.lang = 'de-DE';
                      utterance.rate = 0.9;
                      utterance.pitch = 1.0;
                      utterance.volume = 1.0;
                      window.speechSynthesis.speak(utterance);
                      lastSpokenMessageId.current = resultsMessage.id;
                    }, 300);
                  }
                }
              }
            }
          } catch (err) {
            console.warn('Could not fetch updated scan subject:', err);
          }
        }, 2000); // Wait 2 seconds for AI processing
      }

      // Prompt for due date after scanning
      if (newScanId && !scanId) {
        // This is a new scan, prompt for due date
        setTimeout(() => {
          const dueDateInput = window.prompt(
            'Bitte gib das Abgabedatum für diese Hausaufgabe ein (z.B. "bis diesen Mittwoch" oder "bis 15.01.2025"):'
          );
          
          if (dueDateInput && dueDateInput.trim()) {
            // Send the due date to the backend or store it
            // For now, we'll add it as a message and let the AI handle it
            const dueDateMessage = {
              id: Date.now() + 10,
              sender: 'child',
              text: `📅 Abgabedatum: ${dueDateInput.trim()}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, dueDateMessage]);
            
            // Optionally send to backend to update the scan
            try {
              api.put(`/homeworkscans/${newScanId}`, {
                due_date: dueDateInput.trim()
              }).catch(err => console.warn('Could not save due date:', err));
            } catch (err) {
              console.warn('Error saving due date:', err);
            }
          }
        }, 1000); // Wait 1 second after scan results are shown
      }

      // Don't automatically send a message - let the student ask when they're ready
      // The scanId and conversationId are already set, so when the student sends a message,
      // it will include the scan context automatically
    } catch (error) {
      console.error('Error uploading and scanning image:', error);
      
      // Remove uploading message
      setMessages(prev => prev.filter(m => m.id !== uploadingMessage.id));
      
      // Add error message
      const errorMessage = {
        id: Date.now(),
        sender: 'child',
        text: '❌ Fehler beim Scannen. Bitte versuche es erneut.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (text, overrideScanId = null, overrideConversationId = null) => {
    if (!text.trim() || isSending) return;

    const userMessage = {
      id: Date.now(),
      sender: 'child',
      text: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);

    // Use override values if provided, otherwise use state values
    let currentScanId = overrideScanId !== null ? overrideScanId : scanId;
    let currentConversationId = overrideConversationId !== null ? overrideConversationId : conversationId;

    try {
      // Check if this is just a greeting - don't create homework entry for greetings
      const isGreeting = /^(hallo|hi|hey|guten\s+(tag|morgen|abend)|hello|guten\s+tag|moin|hallo\s+kibundo|hi\s+kibundo)$/i.test(text.trim());
      
      // If there's no scan yet and it's NOT a greeting, create a homework entry from the text description
      if (!currentScanId && !isGreeting) {
        try {
          const finalStudentRecordId = studentRecordId || studentUserId;
          const { data: scanData } = await api.post('/ai/upload/text', {
            description: text.trim(),
            student_id: finalStudentRecordId
          });

          if (scanData?.scan?.id) {
            currentScanId = scanData.scan.id;
            setScanId(currentScanId);
            
            // Add confirmation message
            const detectedSubject = scanData.scan?.detected_subject || 'Unbekannt';
            const scanMessage = {
              id: Date.now() + 0.5,
              sender: 'child',
              text: `📝 Hausaufgabe erstellt: ${detectedSubject}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, scanMessage]);
            
            // Add Kibundo's message with homework details
            const rawText = scanData.scan?.raw_text || text;
            if (rawText && detectedSubject !== 'Unbekannt') {
              const displayText = rawText.length > 500 
                ? rawText.substring(0, 500) + '...' 
                : rawText;
              
              const resultsMessage = {
                id: Date.now() + 1.5,
                sender: 'kibundo',
                type: 'scanResults',
                subject: detectedSubject,
                homeworkText: displayText,
                questions: [],
                encouragementText: '💪 Versuche zuerst selbst, die Aufgaben zu lösen! Du schaffst das! Wenn du Hilfe brauchst, frag mich einfach. Ich helfe dir gerne, aber ich möchte, dass du zuerst selbst denkst. 🌟',
                text: `## 📚 Fach: ${detectedSubject}\n\n**Hausaufgabe:**\n\n${displayText}\n\n> 💪 **Versuche zuerst selbst, die Aufgaben zu lösen!** Du schaffst das! Wenn du Hilfe brauchst, frag mich einfach. Ich helfe dir gerne, aber ich möchte, dass du zuerst selbst denkst. 🌟`,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, resultsMessage]);
              
              // Auto-speak the homework details
              if (window.speechSynthesis && resultsMessage.text) {
                setTimeout(() => {
                  window.speechSynthesis.cancel();
                  const plainText = resultsMessage.text
                    .replace(/##\s+/g, '')
                    .replace(/\*\*/g, '')
                    .replace(/\n\n/g, '. ')
                    .replace(/\n/g, ' ')
                    .trim();
                  const utterance = new SpeechSynthesisUtterance(plainText);
                  utterance.lang = 'de-DE';
                  utterance.rate = 0.9;
                  utterance.pitch = 1.0;
                  utterance.volume = 1.0;
                  window.speechSynthesis.speak(utterance);
                  lastSpokenMessageId.current = resultsMessage.id;
                }, 300);
              }
            }

            // Notify parent component
            if (onScanComplete) {
              onScanComplete();
            }
          }
        } catch (createError) {
          console.error('Error creating homework from text:', createError);
          // Continue anyway - might be a question about existing homework
        }
      }

      // Send to AI API with scan context
      // For greetings, don't send scanId or conversationId - start completely fresh
      const scanIdToSend = isGreeting ? null : currentScanId;
      const conversationIdToSend = isGreeting ? null : currentConversationId; // Don't reuse old conversations for greetings
      
      const { data } = await api.post("/ai/chat", {
        question: text.trim(),
        ai_agent: "Kibundo", // Default student agent
        conversationId: conversationIdToSend, // Start fresh for greetings
        scanId: scanIdToSend, // Don't include scanId for greetings
        mode: "homework", // Use "homework" mode so backend fetches scan context
        studentId: studentRecordId || studentUserId // Use student record ID if available, fallback to user_id
      });

      // Update conversation ID if returned
      if (data?.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
        currentConversationId = data.conversationId;
      }

      // Add AI response
      const aiMessage = {
        id: Date.now() + 1,
        sender: 'kibundo',
        text: data?.answer || "Entschuldigung, ich konnte keine Antwort generieren.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Auto-speak the AI response
      if (data?.answer && window.speechSynthesis) {
        setTimeout(() => {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(data.answer);
          utterance.lang = 'de-DE';
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          window.speechSynthesis.speak(utterance);
          lastSpokenMessageId.current = aiMessage.id;
        }, 300); // Small delay to ensure message is rendered
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'kibundo',
        text: "Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  return (
    <div
      className="relative w-full"
      style={{
        width: '100%',
        height: 'auto',
        minHeight: 'clamp(300px, 50vh, 400px)',
        maxHeight: '100%',
        backgroundColor: 'transparent',
        padding: '0',
        position: 'relative',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        overflowY: 'hidden'
      }}
    >

        {/* Frame 29 - Main container - responsive */}
        <div
          className="relative w-full"
          style={{
            width: '100%',
            height: 'auto',
            minHeight: 'clamp(300px, 50vh, 400px)',
            maxHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: '16px 16px 0 0',
            position: 'relative'
          }}
        >
          {/* Chat bar open - sticky at top, responsive */}
          <div
            style={{
              width: '100%',
              height: 'clamp(60px, 11.25vw, 90px)',
              flexShrink: 0,
              zIndex: 10,
              position: 'sticky',
              top: '0px',
              border: 'none',
              outline: 'none'
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%'
              }}
            >
            <svg width="100%" height="90" viewBox="0 0 1280 94" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: 'block' }}>
              <g filter="url(#filter0_d_54745_7382_top)">
                {/* Lighter green band at top */}
                <rect width="1280" height="35" transform="translate(0 48)" fill="#DDE2AA"/>
                {/* Darker lime green band below */}
                <path d="M0 48H1280V90H0V48Z" fill="#BDCF56"/>
                {/* Semi-circular tab in center */}
                <path d="M640 17C663.196 17 682 35.804 682 59C682 66.6503 679.954 73.8222 676.38 80H603.62C600.046 73.8222 598 66.6503 598 59C598 35.804 616.804 17 640 17Z" fill="#BDCF56"/>
              </g>
              <defs>
                <filter id="filter0_d_54745_7382_top" x="-4" y="13" width="1288" height="81" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                  <feOffset/>
                  <feGaussianBlur stdDeviation="2"/>
                  <feComposite in2="hardAlpha" operator="out"/>
                  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0"/>
                  <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_54745_7382_top"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_54745_7382_top" result="shape"/>
                </filter>
              </defs>
            </svg>
            {/* Close button icon pointing down - centered, responsive */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translateX(-50%) translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0',
                pointerEvents: 'auto'
              }}
              aria-label="Close chat"
            >
              <img 
                src="/images/img_vector_gray_800.svg" 
                alt="Arrow down" 
                style={{ 
                  width: '16px', 
                  height: '24px', 
                  transform: 'rotate(-90deg)',
                  display: 'block'
                }} 
              />
            </button>
            </div>
          </div>

          {/* Chat window background - scrollable content area - pale yellow background */}
          <div
            className="overflow-y-auto flex-1"
            ref={(el) => {
              if (el) {
                // Ensure scrolling is enabled
                el.style.overflowY = 'auto';
                el.style.overflowX = 'hidden';
              }
            }}
            style={{
              width: '100%',
              minHeight: '300px',
              maxHeight: 'calc(100vh - clamp(60px, 11.25vw, 90px) - 70px)', // Subtract chat bar and input bar heights
              backgroundColor: '#E1EAAC',
              padding: '16px',
              boxSizing: 'border-box',
              overflowY: 'auto',
              overflowX: 'hidden',
              position: 'relative',
              WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
              touchAction: 'pan-y' // Enable vertical scrolling on touch devices
            }}
          >
          {/* Clouds Background - positioned relative to scrollable area, opacity 0.5 */}
          <div
            className="absolute"
            style={{
              left: '0px',
              top: '20px',
              width: '100%',
              height: '410px',
              pointerEvents: 'none',
              overflow: 'hidden',
              opacity: 0.5,
              zIndex: 1
            }}
          >
            {/* Cloud SVG - using the clouds background component */}
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 1280 410"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
            >
              {/* Multiple cloud shapes matching Figma design */}
              <g opacity="0.8">
                <ellipse cx="90" cy="30" rx="50" ry="35" fill="white"/>
                <ellipse cx="130" cy="25" rx="45" ry="30" fill="white"/>
                <ellipse cx="170" cy="30" rx="50" ry="35" fill="white"/>
                <ellipse cx="110" cy="50" rx="40" ry="30" fill="white"/>
                <ellipse cx="150" cy="50" rx="40" ry="30" fill="white"/>
              </g>
              <g opacity="0.8" transform="translate(629, 37)">
                <ellipse cx="0" cy="0" rx="50" ry="35" fill="white"/>
                <ellipse cx="40" cy="-5" rx="45" ry="30" fill="white"/>
                <ellipse cx="80" cy="0" rx="50" ry="35" fill="white"/>
                <ellipse cx="20" cy="20" rx="40" ry="30" fill="white"/>
                <ellipse cx="60" cy="20" rx="40" ry="30" fill="white"/>
              </g>
              <g opacity="0.8" transform="translate(960, 21)">
                <ellipse cx="0" cy="0" rx="50" ry="35" fill="white"/>
                <ellipse cx="40" cy="-5" rx="45" ry="30" fill="white"/>
                <ellipse cx="80" cy="0" rx="50" ry="35" fill="white"/>
                <ellipse cx="20" cy="20" rx="40" ry="30" fill="white"/>
                <ellipse cx="60" cy="20" rx="40" ry="30" fill="white"/>
              </g>
            </svg>
          </div>

          {/* Messages Container - relative positioning for proper scrolling */}
          <div className="relative" style={{ minHeight: '500px', padding: '24px', paddingTop: '24px', paddingBottom: 'clamp(90px, 11.25vw, 100px)' }}>
               {messages.map((message, index) => {
                 const isStudent = message.sender === 'child';
                 const scanResultData = !isStudent
                   ? (message.type === 'scanResults'
                      ? message
                      : parseScanResultText(message.text))
                   : null;
                 const isScanResult = Boolean(scanResultData);
                 return (
                   <div
                     key={message.id}
                     className="flex items-end mb-4"
                     style={{
                       flexDirection: isStudent ? 'row-reverse' : 'row',
                       justifyContent: isStudent ? 'flex-start' : 'flex-start',
                       width: '100%',
                       paddingLeft: isStudent ? 'clamp(12px, 1.875vw, 24px)' : 'clamp(12px, 1.875vw, 24px)',
                       paddingRight: isStudent ? 'clamp(12px, 1.875vw, 24px)' : 'clamp(12px, 1.875vw, 24px)',
                       gap: '8px'
                     }}
                   >
                     {/* Kibundo Avatar - on left side (only for Kibundo messages) */}
                     {!isStudent && (
                       <div
                         className="flex-shrink-0 flex flex-col items-center"
                         style={{
                           width: 'clamp(40px, 4.375vw, 56px)'
                         }}
                       >
                         <div
                           style={{
                             width: 'clamp(40px, 4.375vw, 56px)',
                             height: 'clamp(40px, 4.375vw, 56px)',
                             borderRadius: '50%',
                             overflow: 'hidden',
                             backgroundColor: '#E1EAAC',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center',
                             padding: '4px'
                           }}
                         >
                           <img
                             src={kibundoAvatar}
                             alt="Kibundo avatar"
                             className="w-full h-full object-contain"
                             style={{
                               width: '100%',
                               height: '100%',
                               objectFit: 'contain',
                               borderRadius: '50%'
                             }}
                           />
                         </div>
                         {/* Agent name below avatar - more visible */}
                         <span
                           style={{
                             fontSize: 'clamp(10px, 1.25vw, 12px)',
                             fontFamily: 'Nunito',
                             fontWeight: 600,
                             color: '#333',
                             marginTop: '4px',
                             textAlign: 'center',
                             lineHeight: '1.2',
                             display: 'block'
                           }}
                         >
                           Kibundo
                         </span>
                       </div>
                     )}

                    {/* Speech Bubble - responsive */}
                     <div
                       className="relative rounded-[18px] border"
                       style={{
                        ...(isScanResult ? {
                          backgroundColor: 'transparent',
                          border: 'none',
                          boxShadow: 'none',
                          padding: 0,
                          maxWidth: '100%'
                        } : {
                          backgroundColor: isStudent ? '#EAFFFE' : '#D9F98D',
                          borderColor: isStudent ? '#F3E6C8' : '#E1EAAC',
                          borderWidth: '1px',
                          borderRadius: '18px',
                          boxShadow: isStudent
                            ? '2px 2px 4px rgba(0, 0, 0, 0.25)'
                            : '-2px 2px 4px rgba(0, 0, 0, 0.25)',
                          padding: 'clamp(4px, 0.625vw, 5px) clamp(18px, 1.95vw, 25px)',
                          maxWidth: 'calc(100% - clamp(60px, 6.25vw, 80px))'
                        })
                       }}
                     >
                       {/* Speech bubble arrow - responsive */}
                      {!isScanResult && (isStudent ? (
                         <div
                           className="absolute"
                           style={{
                             right: '-1px',
                             bottom: 'clamp(8px, 1.5vw, 12px)',
                             width: 'clamp(18px, 1.95vw, 25px)',
                             height: 'clamp(18px, 1.95vw, 25px)',
                             clipPath: 'polygon(100% 0, 100% 100%, 0 50%)',
                             backgroundColor: '#EAFFFE',
                             borderRight: '1px solid #F3E6C8'
                           }}
                        />
                      ) : (
                         <div
                           className="absolute"
                           style={{
                             left: '-1px',
                             bottom: 'clamp(8px, 1.5vw, 12px)',
                             width: 'clamp(18px, 1.95vw, 25px)',
                             height: 'clamp(18px, 1.95vw, 25px)',
                             clipPath: 'polygon(0 0, 0 100%, 100% 50%)',
                             backgroundColor: '#D9F98D',
                             borderLeft: '1px solid #E1EAAC'
                           }}
                        />
                      ))}

                       {/* Text content - responsive */}
                       <div
                         style={{
                          padding: isScanResult ? 0 : 'clamp(12px, 2.25vw, 18px)'
                         }}
                       >
                        {isScanResult ? (
                          renderScanResultCard(scanResultData)
                        ) : message.sender === 'kibundo' ? (
                           <div
                             className="markdown-content"
                             style={{
                               fontFamily: 'Nunito',
                               fontWeight: 400,
                               fontSize: 'clamp(14px, 1.406vw, 18px)',
                               lineHeight: '1.6',
                               color: '#000000',
                               margin: 0,
                               wordWrap: 'break-word',
                               overflowWrap: 'break-word'
                             }}
                           >
                             <ReactMarkdown
                               remarkPlugins={[remarkGfm]}
                               components={{
                                 p: ({ children }) => <p style={{ margin: '0 0 12px 0', lineHeight: '1.6' }}>{children}</p>,
                                 h1: ({ children }) => <h1 style={{ fontSize: '1.5em', fontWeight: 700, margin: '16px 0 8px 0', lineHeight: '1.4' }}>{children}</h1>,
                                 h2: ({ children }) => <h2 style={{ fontSize: '1.3em', fontWeight: 700, margin: '14px 0 8px 0', lineHeight: '1.4' }}>{children}</h2>,
                                 h3: ({ children }) => <h3 style={{ fontSize: '1.1em', fontWeight: 600, margin: '12px 0 6px 0', lineHeight: '1.4' }}>{children}</h3>,
                                 ul: ({ children }) => <ul style={{ margin: '8px 0', paddingLeft: '24px', lineHeight: '1.6' }}>{children}</ul>,
                                 ol: ({ children }) => <ol style={{ margin: '8px 0', paddingLeft: '24px', lineHeight: '1.6' }}>{children}</ol>,
                                 li: ({ children }) => <li style={{ margin: '4px 0', lineHeight: '1.6' }}>{children}</li>,
                                 strong: ({ children }) => <strong style={{ fontWeight: 700, color: '#1a1a1a' }}>{children}</strong>,
                                 em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                                 code: ({ node, inline, className, children, ...props }) => {
                                   if (inline) {
                                     return (
                                       <code style={{ 
                                         backgroundColor: '#f4f4f4', 
                                         padding: '2px 6px', 
                                         borderRadius: '4px', 
                                         fontFamily: 'monospace',
                                         fontSize: '0.9em',
                                         color: '#d63384'
                                       }} {...props}>
                                         {children}
                                       </code>
                                     );
                                   }
                                   return (
                                     <pre style={{ 
                                       display: 'block',
                                       backgroundColor: '#f4f4f4', 
                                       padding: '12px', 
                                       borderRadius: '6px', 
                                       fontFamily: 'monospace',
                                       fontSize: '0.9em',
                                       overflow: 'auto',
                                       margin: '8px 0',
                                       lineHeight: '1.5'
                                     }}>
                                       <code className={className} {...props}>
                                         {children}
                                       </code>
                                     </pre>
                                   );
                                 },
                                 blockquote: ({ children }) => (
                                   <blockquote style={{ 
                                     borderLeft: '4px solid #EF7C2E', 
                                     margin: '12px 0',
                                     fontStyle: 'italic',
                                     color: '#555',
                                     backgroundColor: '#f9f9f9',
                                     padding: '12px 16px',
                                     borderRadius: '4px'
                                   }}>
                                     {children}
                                   </blockquote>
                                 ),
                                 a: ({ href, children }) => (
                                   <a href={href} style={{ color: '#EF7C2E', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">
                                     {children}
                                   </a>
                                 )
                               }}
                             >
                               {message.text || ''}
                             </ReactMarkdown>
                           </div>
                         ) : (
                           <p
                             className="whitespace-pre-line"
                             style={{
                               fontFamily: 'Nunito',
                               fontWeight: 400,
                               fontSize: 'clamp(14px, 1.406vw, 18px)',
                               lineHeight: '1.364',
                               color: '#000000',
                               margin: 0
                             }}
                           >
                             {message.text}
                           </p>
                         )}
                       </div>
                     </div>

                     {/* Student Avatar - on right side (only for student messages) */}
                     {isStudent && (
                       <div
                         className="flex-shrink-0 flex flex-col items-center"
                         style={{
                           width: 'clamp(40px, 4.375vw, 56px)',
                           minWidth: 'clamp(40px, 4.375vw, 56px)',
                           zIndex: 10
                         }}
                       >
                         <div
                           style={{
                             width: 'clamp(40px, 4.375vw, 56px)',
                             height: 'clamp(40px, 4.375vw, 56px)',
                             minWidth: 'clamp(40px, 4.375vw, 56px)',
                             minHeight: 'clamp(40px, 4.375vw, 56px)',
                             borderRadius: '50%',
                             overflow: 'hidden',
                             backgroundColor: '#E1EAAC',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center'
                           }}
                         >
                           <img
                             src={studentAvatar}
                             alt="Student avatar"
                             className="w-full h-full object-cover"
                             style={{
                               width: '100%',
                               height: '100%',
                               objectFit: 'cover'
                             }}
                             onError={(e) => {
                               // Fallback to default avatar if image fails to load
                               e.target.src = '/images/img_ebene_1.png';
                             }}
                           />
                         </div>
                         {/* Student name below avatar - more visible */}
                         <span
                           style={{
                             fontSize: 'clamp(10px, 1.25vw, 12px)',
                             fontFamily: 'Nunito',
                             fontWeight: 600,
                             color: '#333',
                             marginTop: '4px',
                             textAlign: 'center',
                             lineHeight: '1.2',
                             display: 'block',
                             whiteSpace: 'nowrap',
                             overflow: 'hidden',
                             textOverflow: 'ellipsis',
                             maxWidth: 'clamp(40px, 4.375vw, 56px)'
                           }}
                         >
                           {studentName}
                         </span>
                       </div>
                     )}
                   </div>
                 );
               })}
            <div 
              ref={chatEndRef} 
              style={{ 
                height: 'clamp(90px, 11.25vw, 100px)',
                width: '100%'
              }} 
            />
          </div>
          </div>

          {/* Input bar - Frame 8 at bottom with rounded top corners and darker green background - responsive */}
          <div
            className="flex-shrink-0"
            style={{
              width: '100%',
              minHeight: '70px',
              backgroundColor: '#BDCF56',
              padding: '8px 12px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              position: 'sticky',
              bottom: '0px',
              zIndex: 10,
              borderRadius: '16px 16px 0px 0px'
            }}
          >
            {/* Camera button - responsive */}
            <button
              onClick={handleCameraClick}
              className="flex-shrink-0"
              style={{
                width: 'clamp(36px, 5vw, 40px)',
                height: 'clamp(36px, 5vw, 40px)',
                minWidth: 'clamp(36px, 5vw, 40px)',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)'
              }}
              aria-label="Camera"
            >
              <svg width="clamp(18px, 2.5vw, 20px)" height="clamp(16px, 2.25vw, 18px)" viewBox="0 0 24 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 7.5C9.93 7.5 8.25 9.18 8.25 11.25C8.25 13.32 9.93 15 12 15C14.07 15 15.75 13.32 15.75 11.25C15.75 9.18 14.07 7.5 12 7.5ZM12 13.5C11.31 13.5 10.75 12.94 10.75 12.25C10.75 11.56 11.31 11 12 11C12.69 11 13.25 11.56 13.25 12.25C13.25 12.94 12.69 13.5 12 13.5Z" fill="#EF7C2E"/>
                <path d="M19.5 5.25H14.25L13.5 2.25H10.5L9.75 5.25H4.5C3.375 5.25 2.5 6.125 2.5 7.25V16.25C2.5 17.375 3.375 18.25 4.5 18.25H19.5C20.625 18.25 21.5 17.375 21.5 16.25V7.25C21.5 6.125 20.625 5.25 19.5 5.25ZM19.5 16.25H4.5V7.25H19.5V16.25Z" fill="#EF7C2E"/>
              </svg>
            </button>

            {/* Pic button - responsive */}
            <button
              onClick={handlePicClick}
              className="flex-shrink-0"
              style={{
                width: 'clamp(36px, 5vw, 40px)',
                height: 'clamp(36px, 5vw, 40px)',
                minWidth: 'clamp(36px, 5vw, 40px)',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)'
              }}
              aria-label="Gallery"
            >
              <svg width="clamp(18px, 2.5vw, 20px)" height="clamp(16px, 2.25vw, 18px)" viewBox="0 0 24 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.5 3H4.5C3.375 3 2.5 3.875 2.5 5V16C2.5 17.125 3.375 18 4.5 18H19.5C20.625 18 21.5 17.125 21.5 16V5C21.5 3.875 20.625 3 19.5 3ZM19.5 16H4.5V5H19.5V16Z" fill="#EF7C2E"/>
                <path d="M8.25 11.25L6 14.25H18L13.5 8.25L10.5 12.75L8.25 11.25Z" fill="#EF7C2E"/>
              </svg>
            </button>

            {/* Text input field - responsive */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && inputText.trim()) {
                  handleSendMessage(inputText);
                }
              }}
              placeholder="Nachricht eingeben..."
              className="flex-1 min-w-0"
              style={{
                height: 'clamp(36px, 5vw, 40px)',
                minHeight: 'clamp(36px, 5vw, 40px)',
                backgroundColor: '#FFFFFF',
                border: '1px solid #FFFFFF',
                borderRadius: '4px',
                padding: 'clamp(6px, 1vw, 8px) clamp(10px, 1.5vw, 12px)',
                fontSize: 'clamp(12px, 1.75vw, 14px)',
                fontFamily: 'Nunito',
                color: '#222020',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />

            {/* Mic/Voice button or Send button - changes based on input text - responsive */}
            {inputText.trim() ? (
              <button
                onClick={() => {
                  if (inputText.trim()) {
                    handleSendMessage(inputText);
                  }
                }}
                className="flex-shrink-0"
                style={{
                  width: 'clamp(36px, 5vw, 40px)',
                  height: 'clamp(36px, 5vw, 40px)',
                  minWidth: 'clamp(36px, 5vw, 40px)',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)'
                }}
                aria-label="Send"
              >
                <svg width="clamp(16px, 2.5vw, 20px)" height="clamp(24px, 3.625vw, 29px)" viewBox="0 0 20 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 0L20 14.5L0 29V0Z" fill="#EF7C2E"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={handleMicClick}
                className="flex-shrink-0"
                style={{
                  width: 'clamp(36px, 5vw, 40px)',
                  height: 'clamp(36px, 5vw, 40px)',
                  minWidth: 'clamp(36px, 5vw, 40px)',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)'
                }}
                aria-label="Voice"
              >
                <svg width="clamp(18px, 2.75vw, 22px)" height="clamp(14px, 2.25vw, 18px)" viewBox="0 0 27 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.5 0C11.43 0 9.75 1.68 9.75 3.75V11.25C9.75 13.32 11.43 15 13.5 15C15.57 15 17.25 13.32 17.25 11.25V3.75C17.25 1.68 15.57 0 13.5 0ZM13.5 12C12.81 12 12.25 11.44 12.25 10.75V3.75C12.25 3.06 12.81 2.5 13.5 2.5C14.19 2.5 14.75 3.06 14.75 3.75V10.75C14.75 11.44 14.19 12 13.5 12Z" fill={isRecording ? '#FF0000' : '#EF7C2E'}/>
                  <path d="M13.5 16.5C16.12 16.5 18.25 14.37 18.25 11.75H20.25C20.25 15.19 17.44 18 13.5 18V20.25H11.25V18C7.31 18 4.5 15.19 4.5 11.75H6.5C6.5 14.37 8.63 16.5 11.25 16.5H13.5Z" fill={isRecording ? '#FF0000' : '#EF7C2E'}/>
                </svg>
              </button>
            )}

            {/* Speaker button - responsive */}
            <button
              onClick={() => {
                // Read the last Kibundo message aloud
                const lastKibundoMessage = [...messages].reverse().find(m => m.sender === 'kibundo');
                if (lastKibundoMessage && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                  const utterance = new SpeechSynthesisUtterance(lastKibundoMessage.text);
                  utterance.lang = 'de-DE';
                  window.speechSynthesis.speak(utterance);
                }
              }}
              className="flex-shrink-0"
              style={{
                width: 'clamp(36px, 5vw, 40px)',
                height: 'clamp(36px, 5vw, 40px)',
                minWidth: 'clamp(36px, 5vw, 40px)',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)'
              }}
              aria-label="Speaker"
            >
              <svg width="clamp(18px, 2.5vw, 20px)" height="clamp(18px, 2.5vw, 20px)" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9V15H7L12 20V4L7 9H3ZM16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12ZM14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="#EF7C2E"/>
              </svg>
            </button>
          </div>
        </div>
    </div>
  );
};

export default HomeworkCollectChat;

