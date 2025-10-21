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
  const { openChat, expandChat, getChatMessages, setChatMessages } = useChatDock();
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

  // Resume deep-linked task (if any)
  useEffect(() => {
    if (!openChat || !initialLoad.current) return;
    initialLoad.current = false;

    const taskFromState = location.state?.task;
    if (!taskFromState?.id) return;

    const existing = loadTasks().find((t) => t.id === taskFromState.id);
    const t = existing || taskFromState;

    openChat({
      mode: "homework",
      task: { ...t, userId: studentId },
      key: `homework:${t.id}::u:${studentId}`,
      restore: true,
      focus: "last",
    });
    expandChat?.(true);
  }, [openChat, expandChat, location.state, studentId]);

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
      loadingMsg = fmt("Ich analysiere dein Bild…", "agent", "status", { transient: true, agentName: selectedAgent || "ChildAgent" });

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
        scanData = await uploadWithApi(file);
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
        
        let userMessage;
        if (isTimeoutError) {
          userMessage = "Das Bild ist zu groß oder die Verbindung ist langsam. Bitte versuche es mit einem kleineren Bild oder warte einen Moment und versuche es erneut.";
        } else if (isNetworkError) {
          userMessage = "Netzwerkfehler. Bitte überprüfe deine Internetverbindung und versuche es erneut.";
        } else if (isImageUrlError) {
          userMessage = "Das Bild konnte nicht automatisch analysiert werden. Du kannst mir trotzdem Fragen stellen! Beschreibe mir einfach, was du für Hilfe brauchst.";
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
          errorDisplayMsg = "Upload-Timeout - versuche ein kleineres Bild";
        } else if (isNetworkError) {
          errorDisplayMsg = "Netzwerkfehler - überprüfe deine Verbindung";
        } else if (isImageUrlError) {
          errorDisplayMsg = "Bildformat-Problem - aber Chat funktioniert trotzdem!";
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
    
    // Derive subject from extracted text (look for subject keywords)
    const deriveSubject = (text) => {
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
      const resultMsg =
        extracted || qa.length
          ? fmt({ extractedText: extracted, qa }, "agent", "table", { agentName: selectedAgent || "ChildAgent" })
          : fmt(
              "Ich habe das Dokument erhalten, konnte aber nichts Brauchbares extrahieren.",
              "agent",
              "text",
              { agentName: selectedAgent || "ChildAgent" }
            );

      appendToChat(mode, scopedKey, [resultMsg]);

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
        accept="*/*"
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
            <span className="text-sm text-[#1b3a1b]">Bild wird hochgeladen…</span>
          </div>
        </div>
      )}
    </div>
  );
}
