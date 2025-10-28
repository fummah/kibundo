// src/pages/student/homework/HomeworkDoing.jsx
import React, { useRef, useEffect, useState } from "react";
import { App } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useChatDock } from "@/context/ChatDockContext";
import { useAuthContext } from "@/context/AuthContext";
import api from "@/api/axios";

import cameraIcon from "@/assets/mobile/icons/camera.png";
import micIcon    from "@/assets/mobile/icons/mic.png";
import galleryIcon from "@/assets/mobile/icons/galary.png";

// Base keys (scoped per-student below)
const TASKS_KEY = "kibundo.homework.tasks.v1";
const PROGRESS_KEY = "kibundo.homework.progress.v1";

/* ---------- helpers ---------- */
const makeId = () =>
  "task_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const fmt = (content, from = "agent", type = "text", meta = {}) => ({
  id: Date.now() + Math.random().toString(36).slice(2, 9),
  from,
  sender: from,
  type,
  content,
  timestamp: new Date().toISOString(),
  ...meta,
});

// Quota-safe save with progressive fallback
const trySaveJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export default function HomeworkDoing() {
  const { message: antdMessage } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // write into chat storage directly so preview + status show instantly
  const { openChat, expandChat, getChatMessages, setChatMessages, closeChat } = useChatDock();
  const { user: authUser } = useAuthContext();

  const studentId = authUser?.id ?? "anon";
  const TASKS_KEY_USER = `${TASKS_KEY}::u:${studentId}`;
  const PROGRESS_KEY_USER = `${PROGRESS_KEY}::u:${studentId}`;

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const initialLoad = useRef(true);

  const [uploading, setUploading] = useState(false);   // controls centered overlay
  const [selectedAgent, setSelectedAgent] = useState("ChildAgent"); // Default fallback

  // Fetch selected agent from backend
  useEffect(() => {
    const fetchSelectedAgent = async () => {
      try {
        const response = await api.get('/aisettings', {
          withCredentials: true,
        });
        if (response?.data?.child_default_ai) {
          setSelectedAgent(response.data.child_default_ai);
        }
      } catch (error) {
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
      // Keep only the most recent 10 conversation IDs
      if (keysToCheck.length > 10) {
        keysToCheck.slice(0, -10).forEach(k => {
          try {
            localStorage.removeItem(k);
          } catch {}
        });
      }
    } catch (e) {
    }
  }, []); // Run once on mount

  const loadTasks = () => {
    try {
      return JSON.parse(localStorage.getItem(TASKS_KEY_USER) || "[]");
    } catch {
      return [];
    }
  };

  // Resume deep-linked task (if any) OR open chat from homework list
  useEffect(() => {
    if (!openChat || !initialLoad.current) return;
    initialLoad.current = false;

    // Priority 1: Check for taskId (from HomeworkList click on existing homework)
    const taskId = location.state?.taskId;
    if (taskId) {
      const existing = loadTasks().find((t) => t.id === taskId);
      if (existing) {
        console.log("📝 HOMEWORK: Opening task chat from ID:", taskId);
        // 🔥 Close the FooterChat before navigating
        closeChat?.();
        // Navigate directly to chat with the task context
        navigate("/student/homework/chat", { 
          replace: true,
          state: { task: existing, taskId: taskId }
        });
        return;
      }
    }

    // Priority 2: Check for full task object (legacy support)
    const taskFromState = location.state?.task;
    if (taskFromState?.id) {
      const existing = loadTasks().find((t) => t.id === taskFromState.id);
      const t = existing || taskFromState;

      console.log("📝 HOMEWORK: Opening task chat from object:", t.id);
      // 🔥 Close the FooterChat before navigating
      closeChat?.();
      navigate("/student/homework/chat", { 
        replace: true,
        state: { task: t, taskId: t.id }
      });
      return;
    }

    // Priority 3: Generic "openHomeworkChat" flag (new homework, no existing task)
    if (location.state?.openHomeworkChat) {
      console.log("📝 HOMEWORK: Ready to add new homework on HomeworkDoing page");
      // Stay on this page - user will scan/upload homework here
      // Don't redirect to chat - let them use camera/gallery buttons
      closeChat?.(); // Close any existing chat
      return;
    }
  }, [openChat, expandChat, closeChat, location.state, studentId, navigate]);

  /* ---------------- upload via API ---------------- */
  const uploadWithApi = async (file) => {
    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB.`);
    }

    const fd = new FormData();
    fd.append("file", file, file.name);
    // Backend expects auth token in header, not userId in form data
    const { data } = await api.post("ai/upload", fd, {
      headers: { 
        "Content-Type": "multipart/form-data",
        // Auth token will be automatically added by axios interceptor
      },
      withCredentials: true, // Include cookies/auth headers
    });
    
    
    // Backend returns: { success, message, fileUrl, scan, parsed, aiText, conversationId }
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
    // Skip compression for non-images or small files
    if (!file.type.startsWith('image/') || file.size <= maxSizeMB * 1024 * 1024) {
      return file;
    }

    console.log(`🗜️ Compressing image (${(file.size / 1024 / 1024).toFixed(2)}MB)...`);

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions (max 2048px on longest side)
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

          // Create canvas and compress
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with quality reduction
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                console.log(`✅ Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                resolve(compressedFile);
              } else {
                console.log('⚠️ Compression did not reduce size, using original');
                resolve(file);
              }
            },
            'image/jpeg',
            0.85 // 85% quality
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
      key: `homework:${taskId}::u:${studentId}`,
      restore: true,
      focus: "last",
    });
    expandChat?.(true); // ensure dock expands when analysis begins
  };

  /* ------- create/update task, show preview + loader, then analyse ------- */
  const createTaskAndOpenChat = async ({ file = null, meta = {} }) => {
    const tasks = loadTasks();
    const now = new Date().toISOString();

    const existingTask = meta.taskId ? tasks.find((t) => t.id === meta.taskId) : null;
    const id = existingTask?.id || makeId();

    const mode = "homework";
    const scopedKey = `${id}::u:${studentId}`;

    // Prepare loader message FIRST so the chat shows it immediately (no image preview)
    let loadingMsg = null;

    if (file) {
      // status bubble with spinner (rendered by HomeworkChat for type="status")
      const fileType = file.type?.startsWith("image/") ? "Bild" : "Datei";
      loadingMsg = fmt(`Ich analysiere deine ${fileType}…`, "agent", "status", { transient: true, agentName: selectedAgent || "ChildAgent" });

      // Push only loader message (no image preview), then open & expand the dock right away
      appendToChat(mode, scopedKey, [loadingMsg]);
      openAndFocusChat(id);
    } else {
      // No file: open chat without any initial message
      openAndFocusChat(id);
    }

    // Upload & analysis (if there is a file)
    let scanData = null;
    if (file) {
      setUploading(true); // ⬅️ show centered overlay
      try {
        // Compress large images before upload
        const fileToUpload = await compressImage(file);
        scanData = await uploadWithApi(fileToUpload);
      } catch (e) {
        const status = e?.response?.status;
        const serverMsg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Unbekannter Fehler";
        
        // Handle specific error types
        const isImageUrlError = serverMsg.includes("image_url") || serverMsg.includes("Invalid type");
        const isTimeoutError = serverMsg.includes("timeout") || e?.code === "ECONNABORTED";
        const isNetworkError = !e?.response || e?.message?.includes("Network Error");
        
        const fileTypeLabel = file.type?.startsWith("image/") ? "Bild" : "Datei";
        let userMessage;
        if (isTimeoutError) {
          userMessage = `Die ${fileTypeLabel} ist zu groß oder die Verbindung ist langsam. Bitte versuche es mit einer kleineren ${fileTypeLabel} oder warte einen Moment und versuche es erneut.`;
        } else if (isNetworkError) {
          userMessage = "Netzwerkfehler. Bitte überprüfe deine Internetverbindung und versuche es erneut.";
        } else if (isImageUrlError) {
          userMessage = `Die ${fileTypeLabel} konnte nicht automatisch analysiert werden. Du kannst mir trotzdem Fragen stellen! Beschreibe mir einfach, was du für Hilfe brauchst.`;
        } else {
          userMessage = `Analyse fehlgeschlagen (${status ?? "?"}). ${serverMsg}`;
        }
        
        if (loadingMsg) {
          replaceMessageInChat(mode, scopedKey, loadingMsg.id, () =>
            fmt(userMessage, "agent", "text", { agentName: selectedAgent || "ChildAgent" })
          );
        }
        
        // Add helpful follow-up message for image errors
        if (isImageUrlError) {
          setTimeout(() => {
            setChatMessages(mode, scopedKey, (prev) => [
              ...prev,
              fmt("Du kannst mir Fragen zu deiner Aufgabe stellen, auch ohne Bildanalyse. Was möchtest du wissen?", "agent", "text", { agentName: selectedAgent || "ChildAgent" })
            ]);
          }, 1000);
        }
        
        
        let errorDisplayMsg;
        if (isTimeoutError) {
          errorDisplayMsg = "Upload-Timeout - versuche eine kleinere Datei";
        } else if (isNetworkError) {
          errorDisplayMsg = "Netzwerkfehler - überprüfe deine Verbindung";
        } else if (isImageUrlError) {
          errorDisplayMsg = "Dateiformat-Problem - aber Chat funktioniert trotzdem!";
        } else {
          errorDisplayMsg = serverMsg;
        }
        
        antdMessage.error(`Upload/Analyse fehlgeschlagen: ${errorDisplayMsg}`);
      } finally {
        setUploading(false); // hide overlay; chat keeps status bubble until result
      }
    }

    // Build/update the task object
    // Extract information from scanData if available
    const extractedText = scanData?.scan?.raw_text ?? scanData?.extractedText ?? (scanData?.aiText || "");
    const questions = Array.isArray(scanData?.parsed?.questions) 
      ? scanData.parsed.questions 
      : Array.isArray(scanData?.qa) ? scanData.qa : [];
    
    // Get detected subject from AI analysis (first priority) or derive from text (fallback)
    const detectedSubject = scanData?.parsed?.subject || scanData?.scan?.detected_subject;
    
    const deriveSubject = (text) => {
      // If AI already detected the subject, use it!
      if (detectedSubject) {
        console.log("📚 Using AI-detected subject:", detectedSubject);
        return detectedSubject;
      }
      
      // Fallback: derive from text if AI didn't provide a subject
      const lowerText = text.toLowerCase();
      if (lowerText.includes('mathe') || lowerText.includes('rechnen') || lowerText.includes('zahl')) return 'Mathe';
      if (lowerText.includes('deutsch') || lowerText.includes('text') || lowerText.includes('lesen')) return 'Deutsch';
      if (lowerText.includes('englisch') || lowerText.includes('english')) return 'Englisch';
      if (lowerText.includes('wissenschaft') || lowerText.includes('science')) return 'Science';
      return 'Sonstiges';
    };
    
    // Derive "what" (task type) from analysis
    const deriveWhat = (text, questionsCount) => {
      if (questionsCount > 0) return `${questionsCount} Frage${questionsCount > 1 ? 'n' : ''}`;
      if (text.length > 50) return 'Hausaufgabe';
      return 'Foto-Aufgabe';
    };
    
    // Use extracted data or fallback to existing/meta
    const subjectGuess = scanData 
      ? deriveSubject(extractedText)
      : (existingTask?.subject || meta.subject || "Sonstiges");
      
    const whatGuess = scanData
      ? deriveWhat(extractedText, questions.length)
      : (existingTask?.what || meta.what || "Neue Aufgabe");
      
    const descriptionGuess = scanData && extractedText
      ? extractedText.slice(0, 120).trim() + (extractedText.length > 120 ? '...' : '')
      : (existingTask?.description || meta.description || (file?.name ?? ""));

    const taskForStorage = {
      id,
      createdAt: existingTask?.createdAt || now,
      updatedAt: now,
      subject: subjectGuess,
      what: whatGuess,
      description: descriptionGuess,
      due: existingTask?.due || meta.due || null,
      done: existingTask?.done ?? false,
      source: existingTask?.source || meta.source || (file ? "image" : "manual"),
      fileName: existingTask?.fileName || file?.name || null,
      fileType: existingTask?.fileType || file?.type || null,
      fileSize: existingTask?.fileSize || file?.size || null,
      hasImage: Boolean(existingTask?.hasImage || (file && file.type?.startsWith("image/"))),
      scanId: scanData?.scan?.id ?? existingTask?.scanId ?? null,
      conversationId: scanData?.conversationId ?? existingTask?.conversationId ?? null,
      userId: studentId, // convenience only
    };

    // Upsert tasks (scoped)
    const upserted = (() => {
      const copy = [...tasks];
      const idx = copy.findIndex((t) => t.id === id);
      if (idx >= 0) copy[idx] = { ...copy[idx], ...taskForStorage };
      else copy.unshift(taskForStorage);
      return copy;
    })();

    let storageMode = "full";
    if (!trySaveJson(TASKS_KEY_USER, upserted)) {
      storageMode = "trimmed";
      const trimmed = upserted
        .slice(0, 20)
        .map(({ messages, file, description = "", ...t }) => ({
          ...t,
          messages: [],
          description: description.slice(0, 180),
        }));
      if (!trySaveJson(TASKS_KEY_USER, trimmed)) {
        storageMode = "minimal";
        const minimal = upserted
          .slice(0, 12)
          .map(({ id, what, createdAt, updatedAt, done, hasImage }) => ({
            id,
            what,
            createdAt,
            updatedAt,
            done: !!done,
            hasImage: !!hasImage,
          }));
        if (!trySaveJson(TASKS_KEY_USER, minimal)) {
          storageMode = "fail";
        }
      }
    }

    // Notify same-tab listeners that tasks have changed (storage event won't fire in same tab)
    try {
      window.dispatchEvent(new Event("kibundo:tasks-updated"));
    } catch {}

    // progress is best-effort; keep it small
    try {
      localStorage.setItem(
        PROGRESS_KEY_USER,
        JSON.stringify({
          step: 1,
          taskId: id,
          task: { id, what: taskForStorage.what, hasImage: taskForStorage.hasImage, conversationId: taskForStorage.conversationId, scanId: taskForStorage.scanId },
        })
      );
    } catch {}

    // If analysis succeeded, update status + append result
    if (scanData) {
      // Replace loader status
      if (loadingMsg) {
        replaceMessageInChat(mode, scopedKey, loadingMsg.id, () =>
          fmt("Analyse abgeschlossen.", "agent", "status", { transient: true, agentName: selectedAgent || "ChildAgent" })
        );
      }
      // Append extraction/table or fallback
      const extracted = scanData?.scan?.raw_text ?? scanData?.extractedText ?? "";
      const qa = Array.isArray(scanData?.parsed?.questions)
        ? scanData.parsed.questions
        : Array.isArray(scanData?.qa)
        ? scanData.qa
        : [];
      
      // Get detected subject from AI
      const aiDetectedSubject = scanData?.parsed?.subject || scanData?.scan?.detected_subject;
      
      // Build messages to append
      const messagesToAppend = [];
      
      // Add subject notification if detected
      if (aiDetectedSubject) {
        const subjectEmoji = {
          'Mathe': '🔢',
          'Deutsch': '📗',
          'Englisch': '🇬🇧',
          'Sachkunde': '🔬',
          'Erdkunde': '🌍',
          'Kunst': '🎨',
          'Musik': '🎵',
          'Sport': '⚽',
        }[aiDetectedSubject] || '📚';
        
        messagesToAppend.push(
          fmt(
            `${subjectEmoji} Fach erkannt: ${aiDetectedSubject}`,
            "agent",
            "text",
            { agentName: selectedAgent || "ChildAgent" }
          )
        );
      }
      
      // Add extraction result
      const resultMsg =
        extracted || qa.length
          ? fmt({ extractedText: extracted, qa }, "agent", "table", { agentName: selectedAgent || "ChildAgent" })
          : fmt(
              "Ich habe das Dokument erhalten, konnte aber nichts Brauchbares extrahieren.",
              "agent",
              "text",
              { agentName: selectedAgent || "ChildAgent" }
            );
      
      messagesToAppend.push(resultMsg);

      appendToChat(mode, scopedKey, messagesToAppend);

      // ⬇️ Update the chat with conversationId and scanId from upload response
      // Re-open the chat with updated task data (conversationId, scanId)
      if (scanData.conversationId || scanData?.scan?.id) {
        const updatedTaskData = {
          conversationId: scanData.conversationId,
          scanId: scanData?.scan?.id,
        };
        
        // Re-open chat with updated conversationId and scanId
        openAndFocusChat(id, updatedTaskData);
        
        
        // Try to store in localStorage (optional fallback, ignore quota errors)
        const convKey = `kibundo.convId.${mode}.${scopedKey}`;
        try {
          localStorage.setItem(convKey, String(scanData.conversationId));
        } catch (e) {
          // Quota exceeded - clean up old conversation IDs
          try {
            // Remove old conversation IDs
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('kibundo.convId.')) {
                keysToRemove.push(key);
              }
            }
            // Remove oldest entries (keep last 5)
            keysToRemove.slice(0, -5).forEach(k => localStorage.removeItem(k));
            // Try again
            localStorage.setItem(convKey, String(scanData.conversationId));
          } catch (cleanupErr) {
          }
        }
      }
    }

    antdMessage.success("Aufgabe erstellt – der Chat zeigt jetzt die Analyse.");
  };

  /* ---------- UI handlers ---------- */
  const onCameraClick = () => cameraInputRef.current?.click();
  const onGalleryClick = () => galleryInputRef.current?.click();
  const onMicClick = () =>
    createTaskAndOpenChat({
      file: null,
      meta: { subject: "Sonstiges", what: "Audio-Aufgabe", description: "Diktierte Aufgabe", source: "audio" },
    });

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
          aria-label="Audio-Aufgabe starten"
          onClick={onMicClick}
          className="w-[96px] h-[96px] rounded-full grid place-items-center"
          style={{ backgroundColor: "#ff7a00", boxShadow: "0 16px 28px rgba(0,0,0,.22)" }}
          disabled={uploading}
        >
          <img src={micIcon} alt="" className="w-9 h-9 pointer-events-none" />
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
