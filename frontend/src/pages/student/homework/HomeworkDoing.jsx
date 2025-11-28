// src/pages/student/homework/HomeworkDoing.jsx
import React, { useRef, useEffect, useState } from "react";
import { App } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useChatDock } from "@/context/ChatDockContext";
import { useAuthContext } from "@/context/AuthContext";
import { useStudentApp } from "@/context/StudentAppContext";
import api from "@/api/axios";
import { resolveStudentAgent } from "@/utils/studentAgent";
import useTTS from "@/lib/voice/useTTS";
import useASR from "@/lib/voice/useASR";
import { createTaskAndOpenChat as createTaskAndOpenChatUtil } from "@/utils/homework/createTaskAndOpenChat";
import { makeId, fmt, trySaveJson } from "@/utils/homework/homeworkHelpers";
import { useStudentFirstName } from "@/hooks/useStudentFirstName";

import cameraIcon from "@/assets/mobile/icons/camera.png";
import micIcon from "@/assets/mobile/icons/mic.png";
import galleryIcon from "@/assets/mobile/icons/galary.png";
import buddyMascot from "@/assets/buddies/kibundo-buddy.png";

// Base keys (scoped per-student below)
const TASKS_KEY = "kibundo.homework.tasks.v1";
const PROGRESS_KEY = "kibundo.homework.progress.v1";

export default function HomeworkDoing() {
  const { message: antdMessage } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // write into chat storage directly so preview + status show instantly
  const { state: dockState, openChat, expandChat, getChatMessages, setChatMessages, closeChat } = useChatDock();
  const { user: authUser, account } = useAuthContext();

  // 🔥 Get the effective student context (handles parent viewing child)
  const directStudentId = account?.type === "child" ? account.id : null;
  const effectiveUserId = account?.type === "child" && account?.userId
    ? account.userId
    : (authUser?.id ?? "anon");
  const [fetchedStudentId, setFetchedStudentId] = useState(null);
  const studentId = directStudentId ?? fetchedStudentId;

  // Build SCOPED storage keys per student (use studentId if available, otherwise effectiveUserId)
  const storageKey = studentId ?? effectiveUserId;
  const TASKS_KEY_USER = `${TASKS_KEY}::u:${storageKey}`;
  const PROGRESS_KEY_USER = `${PROGRESS_KEY}::u:${storageKey}`;

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const resumeHandledRef = useRef(false);

  const [uploading, setUploading] = useState(false);   // controls centered overlay
  const [selectedAgent, setSelectedAgent] = useState("Kibundo"); // Default fallback
  const [hasStarted, setHasStarted] = useState(false); // Track if user has started
  const hasStartedRef = useRef(hasStarted); // keep a ref in sync to avoid stale closures
  const [taskType, setTaskType] = useState(null); // 'solvable' (Type A) or 'creative' (Type B)
  const { buddy, ttsEnabled } = useStudentApp();
  
  // Get student's first name
  const studentFirstName = useStudentFirstName();

  // keep hasStartedRef in sync whenever state changes
  useEffect(() => {
    hasStartedRef.current = hasStarted;
  }, [hasStarted]);

  // Fetch student_id from user_id (only if not already available from account)
  useEffect(() => {
    const fetchStudentId = async () => {
      if (effectiveUserId === "anon" || directStudentId) return;
      try {
        const { data } = await api.get('/student-id', {
          params: { user_id: effectiveUserId },
          withCredentials: true,
          validateStatus: (status) => status < 500,
        });
        if (data?.student_id) {
          setFetchedStudentId(data.student_id);
        }
      } catch (error) {
        // silent
      }
    };
    fetchStudentId();
  }, [effectiveUserId, directStudentId]);

  // Always enable TTS for welcome message (override user setting for this specific message)
  const { speak: speakTTS, speaking: ttsSpeaking } = useTTS({ lang: "de-DE", enabled: true });
  const locationPathRef = useRef(null); // Track pathname to detect fresh navigations (null = not initialized)

  // Voice input (ASR) for mic button
  const { listening: isRecording, start: startRecording, stop: stopRecording } = useASR({
    lang: "de-DE",
    onTranscript: (transcript) => {
      // Transcript updates as user speaks (interim results)
      // We'll handle the final transcript when recording stops
    },
    onError: (error) => {
      if (error === "not_supported") {
        antdMessage.warning("Spracherkennung wird in diesem Browser nicht unterstützt.");
      } else if (error === "no-speech") {
        antdMessage.info("Keine Sprache erkannt. Versuche es nochmal.");
      } else {
        antdMessage.error("Fehler bei der Spracherkennung.");
      }
    }
  });

  // Unique key per navigation (works with React Router)
  const ttsOnceKey = `tts:doing:${storageKey}:${location.key || location.pathname}`;

  // Close chat immediately on mount if no state is provided (for "Add New Scan" navigation)
  useEffect(() => {
    const currentPath = typeof location?.pathname === 'string' ? location.pathname : String(location?.pathname || '');

    const isFreshNavigation = locationPathRef.current === null || currentPath !== locationPathRef.current;
    if (isFreshNavigation) {
      locationPathRef.current = currentPath;
      setHasStarted(false); // Reset hasStarted for fresh page
    }

    const hasNoTaskState = !location.state?.taskId && !location.state?.task && !location.state?.openHomeworkChat;
    if (hasNoTaskState) {
      const progress = readProgressForUser();
      const pendingTaskId = progress?.taskId;
      const isFinished = typeof progress?.step === "number" && progress.step >= 3;

      if (!pendingTaskId || isFinished) {
        closeChat?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.pathname]);

  // Fetch selected agent from backend
  useEffect(() => {
    const fetchSelectedAgent = async () => {
      const agent = await resolveStudentAgent();
      if (agent?.name) {
        setSelectedAgent(agent.name);
      }
    };
    fetchSelectedAgent();
  }, []);

  // Clean up old localStorage data on mount to prevent quota issues
  useEffect(() => {
    try {
      const keysToCheck = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('kibundo.convId.')) {
          keysToCheck.push(key);
        }
      }
      if (keysToCheck.length > 10) {
        keysToCheck.slice(0, -10).forEach(k => {
          try {
            localStorage.removeItem(k);
          } catch {}
        });
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Save progress as step 1 when on doing page (even before upload) to persist after refresh
  useEffect(() => {
    const currentPath = typeof location?.pathname === 'string' ? location.pathname : String(location?.pathname || '');
    if (currentPath.endsWith("/doing")) {
      try {
        const currentProgress = readProgressForUser();
        if (typeof currentProgress?.step !== "number" || currentProgress.step < 2) {
          localStorage.setItem(
            PROGRESS_KEY_USER,
            JSON.stringify({
              step: 1,
              taskId: currentProgress?.taskId || null,
              task: currentProgress?.task || null,
            })
          );
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.pathname]);

  const loadTasks = () => {
    try {
      return JSON.parse(localStorage.getItem(TASKS_KEY_USER) || "[]");
    } catch {
      return [];
    }
  };

  const readProgressForUser = () => {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY_USER) || "{}");
    } catch {
      return {};
    }
  };

  // Resume deep-linked task (if any) OR open chat from homework list
  useEffect(() => {
    if (!openChat || resumeHandledRef.current) return;

    if (!studentId && effectiveUserId === "anon" && !authUser?.id) {
      return;
    }

    const tasksSnapshot = loadTasks();

    const resumeFromProgress = () => {
      const progress = readProgressForUser();
      const pendingTaskId = progress?.taskId;
      const isFinished = typeof progress?.step === "number" && progress.step >= 3;
      if (!pendingTaskId || isFinished) return false;

      const existingTask = tasksSnapshot.find((t) => t.id === pendingTaskId);
      if (!existingTask) return false;

      if (existingTask?.done || existingTask?.completedAt) {
        return false;
      }

      openChat?.({
        mode: "homework",
        task: existingTask,
        key: `homework:${existingTask.id}::u:${storageKey}`,
        restore: true,
        focus: "last",
      });
      expandChat?.(true);
      resumeHandledRef.current = true;
      return true;
    };

    const taskId = location.state?.taskId;
    if (taskId) {
      const existing = tasksSnapshot.find((t) => t.id === taskId);
      if (existing) {
        if (existing?.done || existing?.completedAt) {
          resumeHandledRef.current = true;
          return;
        }
        openChat?.({
          mode: "homework",
          task: existing,
          key: `homework:${taskId}::u:${storageKey}`,
          restore: true,
          focus: "last",
        });
        expandChat?.(true);
        resumeHandledRef.current = true;
        return;
      }
    }

    const taskFromState = location.state?.task;
    if (taskFromState?.id) {
      const existing = tasksSnapshot.find((t) => t.id === taskFromState.id);
      const t = existing || taskFromState;
      if (t?.done || t?.completedAt) {
        resumeHandledRef.current = true;
        return;
      }
      openChat?.({
        mode: "homework",
        task: t,
        key: `homework:${t.id}::u:${storageKey}`,
        restore: true,
        focus: "last",
      });
      expandChat?.(true);
      resumeHandledRef.current = true;
      return;
    }

    if (location.state?.openHomeworkChat) {
      if (!resumeFromProgress()) {
        // stay on page
      }
      resumeHandledRef.current = true;
      return;
    }

    if (resumeFromProgress()) return;

    resumeHandledRef.current = true;
    closeChat?.();
  }, [openChat, expandChat, closeChat, location.state, studentId, navigate, authUser?.id]);

  /* ---------------- upload via API ---------------- */
  const uploadWithApi = async (file) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB.`);
    }

    const fd = new FormData();
    fd.append("file", file, file.name);
    if (studentId) {
      fd.append("student_id", studentId.toString());
    }
    const { data } = await api.post("ai/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      withCredentials: true,
    });

    if (!data.success) {
      throw new Error(data.message || "Upload failed");
    }

    return data;
  };

  /* ------ write/replace messages in dock store ------ */
  const appendToChat = (mode, scopedKey, msgsToAppend) => {
    const prev = getChatMessages?.(mode, scopedKey) || [];
    setChatMessages?.(mode, scopedKey, [...prev, ...msgsToAppend]);
  };

  const replaceMessageInChat = (mode, scopedKey, msgId, replacer) => {
    const prev = getChatMessages?.(mode, scopedKey) || [];
    const next = prev.map((m) => (m.id === msgId ? replacer(m) : m));
    setChatMessages?.(mode, scopedKey, next);
  };

  /* ------ Image Compression ------ */
  const compressImage = async (file, maxSizeMB = 10) => {
    if (!file.type.startsWith('image/') || file.size <= maxSizeMB * 1024 * 1024) {
      return file;
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIMENSION = 2048;
          let width = img.width;
          let height = img.height;

          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = (height / width) * MAX_DIMENSION;
              width = MAX_DIMENSION;
            } else {
              width = (width / height) * MAX_DIMENSION;
              height = MAX_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.85
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const openAndFocusChat = (taskId, extraTaskData = {}) => {
    openChat?.({
      mode: "homework",
      task: { id: taskId, userId: studentId, ...extraTaskData },
      key: `homework:${taskId}::u:${storageKey}`,
      restore: true,
      focus: "last",
    });
    expandChat?.(true);
  };

  /* ------- create/update task, show preview + loader, then analyse ------- */
  const createTaskAndOpenChat = async ({ file = null, meta = {} }) => {
    return createTaskAndOpenChatUtil({
      file,
      meta,
      compressImage,
      uploadWithApi,
      setUploading,
      openAndFocusChat,
      appendToChat,
      replaceMessageInChat,
      getChatMessages,
      setChatMessages,
      loadTasks,
      readProgressForUser,
      storageKey,
      TASKS_KEY_USER,
      PROGRESS_KEY_USER,
      studentId,
      selectedAgent,
      antdMessage,
    });
  };

  /* ---------- TTS: robust to StrictMode but require user gesture ---------- */
  const timeoutIdRef = useRef(null);
  const hasScheduledRef = useRef(false); // Track if timeout is already scheduled
  const lastLocationKeyRef = useRef(null);

  // ensure global guard exists
  if (typeof window !== "undefined" && !window.__kibundo_tts) {
    window.__kibundo_tts = { scheduled: new Map() };
  }

  const globalTts = typeof window !== "undefined" ? window.__kibundo_tts : { scheduled: new Map() };

  useEffect(() => {
    // TTS effect triggered

    const currentPath = typeof location?.pathname === 'string' ? location.pathname : String(location?.pathname || '');
    const navKey = `${storageKey}::${location.key || location.pathname}`;

    const clearGlobal = () => {
      const entry = globalTts.scheduled.get(navKey);
      if (entry?.timeoutId) clearTimeout(entry.timeoutId);
      globalTts.scheduled.delete(navKey);
    };

    // Not on page -> reset
    if (currentPath !== "/student/homework/doing") {
      hasScheduledRef.current = false;
      lastLocationKeyRef.current = null;
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      clearGlobal();
      return;
    }

    // If user already started, don't schedule
    if (hasStartedRef.current) {
      // User already started, skipping TTS
      hasScheduledRef.current = false;
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      clearGlobal();
      return;
    }

    // Proceed with scheduling (same robust approach as onboarding screens)
    const currentLocationKey = location.key || location.pathname;
    if (lastLocationKeyRef.current !== null && lastLocationKeyRef.current !== currentLocationKey) {
      hasScheduledRef.current = false;
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      clearGlobal();
    }
    lastLocationKeyRef.current = currentLocationKey;

    const existing = globalTts.scheduled.get(navKey);
    const nowTs = Date.now();
    if (existing && (nowTs - existing.ts) < 5000) {
      // Global timeout already scheduled, skipping
      hasScheduledRef.current = true;
      return;
    }

    // Setting up TTS, marking as scheduled
    hasScheduledRef.current = true;

    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    const localTimeout = setTimeout(() => {
      timeoutIdRef.current = null;
      hasScheduledRef.current = false;
      globalTts.scheduled.delete(navKey);

      // Final check: if user started, skip TTS
      if (hasStartedRef.current) {
        // User started during timeout, skipping TTS
        return;
      }

      const message = studentFirstName 
        ? `Hallo ${studentFirstName}! Welche Hausaufgabe hast du heute? Du kannst ein Foto von deinem Arbeitsblatt machen, eine Datei aus deiner Galerie hochladen, oder mir einfach erzählen, was du zu tun hast.`
        : "Hallo! Welche Hausaufgabe hast du heute? Du kannst ein Foto von deinem Arbeitsblatt machen, eine Datei aus deiner Galerie hochladen, oder mir einfach erzählen, was du zu tun hast.";

      // Speaking welcome message
      if (speakTTS && typeof speakTTS === 'function') {
        try {
          speakTTS(message);
          // TTS called successfully
        } catch (error) {
          console.error("❌ [HomeworkDoing] TTS error:", error);
        }
      } else {
        console.error("❌ [HomeworkDoing] speakTTS is not a function, value:", speakTTS);
      }
    }, 2000);

    timeoutIdRef.current = localTimeout;
    globalTts.scheduled.set(navKey, { timeoutId: localTimeout, ts: nowTs });

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      hasScheduledRef.current = false;
      const entry = globalTts.scheduled.get(navKey);
      if (entry && entry.timeoutId === localTimeout) globalTts.scheduled.delete(navKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.pathname, location?.key, speakTTS, storageKey]);

  /* ---------- UI handlers ---------- */
  const onCameraClick = () => {
    setHasStarted(true);
    cameraInputRef.current?.click();
  };
  const onGalleryClick = () => {
    setHasStarted(true);
    galleryInputRef.current?.click();
  };
  const onMicClick = async () => {
    setHasStarted(true);
    
    if (isRecording) {
      // Stop recording and get final transcript
      const transcript = await stopRecording();
      
      if (transcript && transcript.trim()) {
        // Create task first (this will open the chat)
        await createTaskAndOpenChat({
          file: null,
          meta: { 
            subject: "Sonstiges", 
            what: "Audio-Aufgabe", 
            description: transcript, 
            source: "audio" 
          },
        });
        
        // Wait a bit for chat to be ready, then add transcript and send
        setTimeout(async () => {
          // Get task ID from dockState (created by createTaskAndOpenChat)
          const taskId = dockState?.task?.id || location.state?.task?.id || makeId();
          const scopedKey = `homework:${taskId}::u:${storageKey}`;
          
          // Create user message from transcript
          const userMessage = fmt(transcript, "user", "text");
          
          // Get current messages and add user message immediately (so it appears in the chat)
          const currentMessages = getChatMessages?.("homework", scopedKey) || [];
          setChatMessages?.("homework", scopedKey, [...currentMessages, userMessage]);
          
          // Expand chat to show the message
          expandChat?.(true);
          
          try {
            // Send to AI API
            const agent = await resolveStudentAgent();
            const payload = {
              question: transcript,
              ai_agent: agent?.name || selectedAgent,
              mode: "homework",
            };
            
            if (studentId) {
              payload.student_id = studentId;
            }
            
            // Add scanId if available (though audio tasks typically don't have scans)
            if (dockState?.task?.scanId) {
              payload.scanId = dockState.task.scanId;
            }
            
            const response = await api.post("/ai/chat", payload, {
              withCredentials: true,
            });
            
            // Add AI response to chat
            if (response?.data?.answer) {
              const agentMessage = fmt(response.data.answer, "agent", "text", {
                agentName: agent?.name || selectedAgent,
              });
              setChatMessages?.("homework", scopedKey, (prev) => {
                const prevMsgs = prev || [];
                // Make sure we don't duplicate the user message
                const hasUserMsg = prevMsgs.some(msg => 
                  msg.from === "user" && msg.content === transcript
                );
                if (!hasUserMsg) {
                  return [...prevMsgs, userMessage, agentMessage];
                }
                return [...prevMsgs, agentMessage];
              });
            }
          } catch (error) {
            console.error("Failed to send voice message:", error);
            
            // Add error message to chat
            const errorMessage = fmt("Entschuldigung, es gab einen Fehler beim Senden deiner Nachricht. Bitte versuche es erneut.", "agent", "text", {
              agentName: selectedAgent,
            });
            setChatMessages?.("homework", scopedKey, (prev) => {
              const prevMsgs = prev || [];
              // Make sure user message is there
              const hasUserMsg = prevMsgs.some(msg => 
                msg.from === "user" && msg.content === transcript
              );
              if (!hasUserMsg) {
                return [...prevMsgs, userMessage, errorMessage];
              }
              return [...prevMsgs, errorMessage];
            });
            
            antdMessage.error("Fehler beim Senden der Nachricht.");
          }
        }, 300);
      } else {
        // No transcript - just create task
        createTaskAndOpenChat({
          file: null,
          meta: { subject: "Sonstiges", what: "Audio-Aufgabe", description: "Diktierte Aufgabe", source: "audio" },
        });
      }
    } else {
      // Start recording
      startRecording();
    }
  };

  const onCameraChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const taskId = location.state?.task?.id;
      createTaskAndOpenChat({ file, meta: { source: "image", taskId } });
    }
    e.target.value = "";
  };
  const onGalleryChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const taskId = location.state?.task?.id;
      createTaskAndOpenChat({
        file,
        meta: { source: file.type?.startsWith("image/") ? "image" : "file", taskId },
      });
    }
    e.target.value = "";
  };

  /* ---------- View ---------- */
  return (
    <div className="relative w-full">
      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onCameraChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        className="hidden"
        onChange={onGalleryChange}
      />

      {/* Character Interaction Area - Initial Question */}
      {!hasStarted && (
        <div className="w-full mb-8">
          <div className="bg-gray-100 rounded-2xl p-6 border-2 border-gray-200 shadow-sm">
            <div className="flex items-start gap-4">
              <img
                src={buddy?.img || buddyMascot}
                alt={selectedAgent || "Kibundo"}
                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1">
                <div className="text-lg font-semibold text-[#2b6a5b] mb-2">
                  {selectedAgent || "Kibundo"}
                </div>
                <div className="text-base text-gray-700 leading-relaxed">
                  {studentFirstName ? `Hallo ${studentFirstName}! 👋` : "Hallo! 👋"} Welche Hausaufgabe hast du heute?
                  <br />
                  <br />
                  Du kannst:
                  <br />
                  📷 Ein Foto von deinem Arbeitsblatt machen
                  <br />
                  📁 Eine Datei aus deiner Galerie hochladen
                  <br />
                  🎤 Mir einfach erzählen, was du zu tun hast
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="w-full flex items-center justify-center gap-16 py-10">
        <button
          type="button"
          aria-label="Kamera öffnen"
          onClick={onCameraClick}
          className="w-[54px] h-[54px] rounded-full grid place-items-center"
          style={{ backgroundColor: "#ff7a00", boxShadow: "0 12px 22px rgba(0,0,0,.18)" }}
          disabled={uploading}
        >
          <img src={cameraIcon} alt="" className="w-6 h-6 pointer-events-none" />
        </button>

        <button
          type="button"
          aria-label={isRecording ? "Aufnahme beenden" : "Audio-Aufgabe starten"}
          onClick={onMicClick}
          className="w-[96px] h-[96px] rounded-full grid place-items-center transition-all"
          style={{ 
            backgroundColor: isRecording ? "#ff4d4f" : "#ff7a00", 
            boxShadow: "0 16px 28px rgba(0,0,0,.22)",
            transform: isRecording ? "scale(1.1)" : "scale(1)"
          }}
          disabled={uploading}
        >
          <img 
            src={micIcon} 
            alt="" 
            className={`w-9 h-9 pointer-events-none ${isRecording ? "brightness-0 invert" : ""}`}
          />
        </button>

        <button
          type="button"
          aria-label="Galerie öffnen"
          onClick={onGalleryClick}
          className="w-[54px] h-[54px] rounded-full grid place-items-center"
          style={{ backgroundColor: "#ff7a00", boxShadow: "0 12px 22px rgba(0,0,0,.18)" }}
          disabled={uploading}
        >
          <img src={galleryIcon} alt="" className="w-6 h-6 pointer-events-none" />
        </button>
      </div>

      {/* ⬇️ Centered full-screen LOADER OVERLAY while uploading/analyzing */}
      {uploading && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          role="status"
          aria-live="assertive"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3 px-5 py-4 rounded-2xl bg-white shadow-2xl">
            <span className="inline-block w-9 h-9 border-2 border-[#1b3a1b] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#1b3a1b]">Datei wird hochgeladen und analysiert…</span>
          </div>
        </div>
      )}
    </div>
  );
}
