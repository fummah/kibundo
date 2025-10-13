// src/components/student/mobile/HomeworkChat.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { App } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useChatDock, TASKS_KEY } from "@/context/ChatDockContext";
import { useAuthContext } from "@/context/AuthContext";

import minimiseBg from "@/assets/backgrounds/minimise.png";
import agentIcon from "@/assets/mobile/icons/agent-icon.png";
import cameraIcon from "@/assets/mobile/icons/camera.png";
import galleryIcon from "@/assets/mobile/icons/galary.png";
import studentIcon from "@/assets/mobile/icons/stud-icon.png";

const FALLBACK_IMAGE_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'>
      <rect width='100%' height='100%' fill='#f3f4f6'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-family='Segoe UI, Arial' font-size='14'>
        Bild konnte nicht geladen werden
      </text>
    </svg>`
  );

const formatMessage = (content, from = "agent", type = "text", meta = {}) => ({
  id: Date.now() + Math.random().toString(36).slice(2, 9),
  from,
  sender: from,
  type,
  content,
  timestamp: new Date().toISOString(),
  ...meta,
});

/** Build a stable signature independent of timestamp to avoid dupes */
const msgSig = (m) => {
  const type = m?.type ?? "text";
  const from = (m?.from ?? m?.sender ?? "agent").toLowerCase();
  const body =
    typeof m?.content === "string"
      ? m.content.trim().replace(/\s+/g, " ")
      : JSON.stringify(m?.content ?? "");
  return `${type}|${from}|${body.slice(0, 160)}`;
};

const mergeById = (a = [], b = []) => {
  const seen = new Set();
  const out = [];
  for (const arr of [a, b]) {
    if (!Array.isArray(arr)) continue;
    for (const m of arr) {
      const key = m?.id ?? msgSig(m);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }
  }
  return out;
};

const messageKey = (m, i) => m?.id ?? `${msgSig(m)}|${i}`;



export default function HomeworkChat({
  messages: controlledMessagesProp,
  onMessagesChange: onMessagesChangeProp,
  initialMessages,
  onSendText,
  onSendMedia,
  isTyping: externalTyping = false,
  onClose,
  minimiseTo = "/student/homework",
  minimiseHeight = 54,
  className = "",
  onDone,
}) {
  const navigate = useNavigate();
  const { message: antdMessage } = App.useApp();
  const {
    state: dockState,
    markHomeworkDone,
    getChatMessages,
    setChatMessages,
    clearChatMessages,
  } = useChatDock();
  const { user: authUser } = useAuthContext();
  
  // No initial greeting - start with empty chat
  const defaultInitialMessages = [];

  // Conversation/task wiring, now SCOPED PER STUDENT
  const mode = "homework";
  const taskId = dockState?.task?.id ?? null;

  // determine the active student id (prefer authenticated user)
  const studentId =
    authUser?.id ??
    dockState?.task?.userId ??
    dockState?.student?.id ??
    "anon";

  // IMPORTANT: scope the persisted key by student so nothing leaks across users
  const scopedTaskKey = useMemo(
    () => `${taskId ?? "global"}::u:${studentId}`,
    [taskId, studentId]
  );

  const stableModeRef = useRef(mode);
  const stableTaskIdRef = useRef(scopedTaskKey);

  useEffect(() => {
    if (scopedTaskKey !== stableTaskIdRef.current) {
      stableTaskIdRef.current = scopedTaskKey;
      didSeedRef.current = false; // new thread can seed greeting
      uploadNudgeShownRef.current = false; // reset nudge per thread
    }
  }, [scopedTaskKey]);

  // Persist conversationId PER (mode + task + student)
  const convKey = useMemo(
    () => `kibundo.convId.${mode}.${scopedTaskKey}`,
    [mode, scopedTaskKey]
  );

  // ⬇️ Prioritize conversationId and scanId from task object (passed via openChat)
  const [conversationId, setConversationId] = useState(() => {
    // FIRST: try to get from task object (most reliable)
    if (dockState?.task?.conversationId) {
      return dockState.task.conversationId;
    }
    // SECOND: try localStorage (may fail due to quota)
    try {
      const stored = typeof window !== "undefined" && window.localStorage.getItem(convKey);
      if (stored) return stored;
    } catch {
      // localStorage may be full or unavailable
    }
    return null;
  });

  const [scanId, setScanId] = useState(() => {
    return dockState?.task?.scanId ?? null;
  });

  // ⬇️ Update conversationId and scanId when they become available from task or localStorage
  useEffect(() => {
    const taskConvId = dockState?.task?.conversationId;
    const taskScanId = dockState?.task?.scanId;
    
    // Update conversationId if changed
    if (taskConvId && taskConvId !== conversationId) {
      console.log('✅ HomeworkChat: Updating conversationId from', conversationId, 'to', taskConvId);
      setConversationId(taskConvId);
    } else if (!taskConvId && !conversationId) {
      // Try localStorage as fallback
      try {
        const storedConvId = typeof window !== "undefined" && window.localStorage.getItem(convKey);
        if (storedConvId && storedConvId !== conversationId) {
          console.log('✅ HomeworkChat: Loading conversationId from localStorage:', storedConvId);
          setConversationId(storedConvId);
        }
      } catch {
        // localStorage may be unavailable
      }
    }
    
    // Update scanId if changed
    if (taskScanId && taskScanId !== scanId) {
      console.log('✅ HomeworkChat: Updating scanId from', scanId, 'to', taskScanId);
      setScanId(taskScanId);
    }
  }, [convKey, dockState?.task?.conversationId, dockState?.task?.scanId, conversationId, scanId]);

  useEffect(() => {
    try {
      if (conversationId) {
        window.localStorage.setItem(convKey, conversationId);
      } else {
        window.localStorage.removeItem(convKey);
      }
    } catch (e) {
      // Quota exceeded or localStorage unavailable - this is OK, we use task object as primary source
      console.warn("Could not save conversationId to localStorage (quota exceeded or unavailable)");
    }
  }, [conversationId, convKey]);

  // Local buffer (keeps transient previews even if not persisted)
  const [localMessages, setLocalMessages] = useState(
    controlledMessagesProp ??
      getChatMessages?.(stableModeRef.current, stableTaskIdRef.current) ??
      initialMessages ??
      defaultInitialMessages
  );

  // Seed persistence once per thread
  const didSeedRef = useRef(false);
  useEffect(() => {
    if (didSeedRef.current) return;
    if (!setChatMessages || !getChatMessages) return;
    const current =
      getChatMessages(stableModeRef.current, stableTaskIdRef.current) || [];
    const seedMessages = initialMessages || defaultInitialMessages;
    if (current.length === 0 && seedMessages?.length) {
      setChatMessages(
        stableModeRef.current,
        stableTaskIdRef.current,
        [...seedMessages]
      );
    }
    didSeedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setChatMessages, getChatMessages, initialMessages, defaultInitialMessages, scopedTaskKey]);

  // Read view
  const msgs = useMemo(() => {
    if (controlledMessagesProp) return controlledMessagesProp;
    const persisted =
      getChatMessages?.(stableModeRef.current, stableTaskIdRef.current) || [];
    if (Array.isArray(persisted) || Array.isArray(localMessages)) {
      return mergeById(persisted || [], localMessages || []);
    }
    return localMessages || [];
  }, [controlledMessagesProp, getChatMessages, localMessages]);

  // Filter: never persist base64 previews/transient
  const filterForPersist = useCallback((arr) => {
    return (arr || []).filter((m) => {
      if (m?.transient === true) return false;
      if (
        m?.type === "image" &&
        typeof m.content === "string" &&
        m.content.startsWith("data:")
      ) {
        return false;
      }
      return true;
    });
  }, []);

  // Writer
  const updateMessages = useCallback(
    (next) => {
      const compute = (base) => (typeof next === "function" ? next(base) : next);

      if (controlledMessagesProp && onMessagesChangeProp) {
        const base = compute(controlledMessagesProp);
        if (base !== controlledMessagesProp) onMessagesChangeProp(base);
        return;
      }

      const current =
        getChatMessages?.(stableModeRef.current, stableTaskIdRef.current) || [];
      const baseArr = mergeById(current, Array.isArray(msgs) ? msgs : []);
      const nextVal = compute(baseArr);

      if (setChatMessages) {
        const persisted = filterForPersist(nextVal);
        setChatMessages(
          stableModeRef.current,
          stableTaskIdRef.current,
          persisted
        );
      }
      setLocalMessages(nextVal);
    },
    [
      controlledMessagesProp,
      onMessagesChangeProp,
      setChatMessages,
      getChatMessages,
      msgs,
      filterForPersist,
    ]
  );

  // UI state
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [uploading, setUploading] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // HARD gate to stop double-fire before React state updates
  const sendingRef = useRef(false);

  // Smooth autoscroll
  const lastLenRef = useRef(0);
  useEffect(() => {
    if (!listRef.current) return;
    if (msgs?.length === lastLenRef.current && !typing && !externalTyping)
      return;
    lastLenRef.current = msgs?.length ?? 0;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight + 9999,
      behavior: "smooth",
    });
  }, [msgs, typing, externalTyping]);

  // Normalize server messages -> internal
  const toArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.messages)) return data.messages;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  };
  const mapServerToInternal = (arr) =>
    toArray(arr).map((m) =>
      formatMessage(
        m?.content ?? "",
        (m?.sender || "agent").toLowerCase() === "student"
          ? "student"
          : "agent",
        "text"
      )
    );

  // Has the student already uploaded any image in this thread?
  const hasAnyImage = useMemo(
    () => Array.isArray(msgs) && msgs.some((m) => m?.type === "image"),
    [msgs]
  );

  // show the “please upload” nudge only once per thread
  const uploadNudgeShownRef = useRef(false);

  const handleSendText = useCallback(
    async (text) => {
      const t = (text || "").trim();
      if (!t) return;
      if (sendingRef.current || sending) return; // hard guard
      sendingRef.current = true;
      setSending(true);

      // Optimistic student bubble (persisted so it survives close/reopen; dedupe handled by mergeById)
      const optimisticMsg = formatMessage(t, "student", "text", {
        pending: true,
      });
      updateMessages((m) => [...m, optimisticMsg]);

      // Gate: if there is no scan yet AND no image uploaded in this thread, nudge once
   

      try {
        if (onSendText) {
          await onSendText(t);
          return;
        }

        // Prefer append; on 400/404 retry create; on 404 overall fallback to ai/chat
        const firstUrl = conversationId
          ? `ai/conversations/${conversationId}/message`
          : `ai/conversations/message`;

        console.log('📤 Sending message to:', firstUrl, '| conversationId:', conversationId, '| scanId:', scanId);

        let resp;
        try {
          // NOTE: do NOT send userId; the server must read the user from auth
          resp = await api.post(firstUrl, { message: t, scanId });
        } catch (err) {
          const code = err?.response?.status;
          if (code === 404) {
            // Backend doesn’t have conversation endpoints -> fallback
            const r = await api.post("ai/chat", {
              question: t,
              ai_agent: "ChildAgent",
              mode: "homework",
              scanId,
              conversationId,
            });
            updateMessages((m) => [
              ...m,
              formatMessage(r?.data?.answer || "Okay!", "agent"),
            ]);
            setSending(false);
            sendingRef.current = false;
            return;
          }
          if (conversationId && (code === 400 || code === 404)) {
            // create new conversation
            resp = await api.post(`ai/conversations/message`, {
              message: t,
              scanId,
            });
          } else {
            throw err;
          }
        }

        const j = resp?.data || {};
        if (j?.conversationId && j.conversationId !== conversationId) {
          setConversationId(j.conversationId);
        }

        const cid = j?.conversationId || conversationId;
        if (cid) {
          const r2 = await api.get(`ai/conversations/${cid}/messages`);
          // Replace history with server truth to avoid optimistic duplicates
          updateMessages(mapServerToInternal(r2.data));
        } else if (j?.answer) {
          updateMessages((m) => [...m, formatMessage(j.answer, "agent")]);
        }
      } catch (err) {
        const status = err?.response?.status;
        const serverMsg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Unbekannter Fehler";
        updateMessages((m) => [
          ...m,
          formatMessage(
            `Fehler beim Senden (${status ?? "?"}). ${serverMsg}`,
            "agent"
          ),
        ]);
        antdMessage.error(`Nachricht fehlgeschlagen: ${serverMsg}`);
      } finally {
        setSending(false);
        sendingRef.current = false;
      }
    },
    [
      sending,
      onSendText,
      updateMessages,
      antdMessage,
      conversationId,
      scanId,
      hasAnyImage,
    ]
  );

  // Media upload (scan) — previews are transient; Axios with detailed errors
  const handleMediaUpload = useCallback(
    async (files) => {
      if (!files.length || uploading) return;
      setUploading(true);

      const readAsDataURL = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      try {
        for (const file of files) {
          const isImg = (file.type || "").startsWith("image/");
          let dataUrl = null;
          if (isImg) {
            try {
              dataUrl = await readAsDataURL(file);
            } catch {}
          }

          // Don't show the image in chat, only show analysis loading message
          const loadingMessage = formatMessage(
            isImg ? "Ich analysiere dein Bild..." : "Ich verarbeite deine Datei...",
            "agent",
            "status",
            { transient: true }
          );
          updateMessages((m) => [...m, loadingMessage]);

          try {
            if (onSendMedia) {
              await onSendMedia([file]);
            } else {
              const formData = new FormData();
              formData.append("file", file);
              // DO NOT append userId — server infers from auth

              const res = await api.post(`ai/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });

              const data = res?.data || {};
              const extracted =
                data?.scan?.raw_text || data?.extractedText || "";
              const qa = Array.isArray(data?.parsed?.questions)
                ? data.parsed.questions
                : Array.isArray(data?.qa)
                ? data.qa
                : [];

              updateMessages((m) => {
                const arr = [...m];
                const idx = arr.findIndex((msg) => msg.id === loadingMessage.id);
                if (idx !== -1)
                  arr[idx] = formatMessage("Analyse abgeschlossen.", "agent");
                if (extracted || qa.length > 0) {
                  arr.push(
                    formatMessage({ extractedText: extracted, qa }, "agent", "table")
                  );
                } else {
                  arr.push(
                    formatMessage(
                      "Ich habe das Dokument erhalten, konnte aber nichts Brauchbares extrahieren.",
                      "agent"
                    )
                  );
                }
                
                // Add greeting after analysis result
                const userName = authUser?.name || authUser?.username || "there";
                arr.push(
                  formatMessage(
                    `Hello ${userName}, I've analyzed your homework. How can I help you with what you've scanned?`,
                    "agent"
                  )
                );
                
                return arr;
              });

              const newCid = data?.conversationId;
              if (newCid && newCid !== conversationId) setConversationId(newCid);

              // Upsert a task so the homework list shows this scan
              try {
                const sid = studentId || "anon";
                const tasksKeyUser = `${TASKS_KEY}::u:${sid}`;
                const nowIso = new Date().toISOString();
                const effectiveTaskId = taskId || "global";
                const load = () => {
                  try {
                    return JSON.parse(localStorage.getItem(tasksKeyUser) || "[]");
                  } catch {
                    return [];
                  }
                };
                const save = (arr) => {
                  try {
                    localStorage.setItem(tasksKeyUser, JSON.stringify(arr));
                    return true;
                  } catch {
                    return false;
                  }
                };
                const tasks = load();
                const idx = tasks.findIndex((t) => t?.id === effectiveTaskId);
                const base = idx >= 0 ? tasks[idx] : {};
                
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
                
                // Extract and use analysis data
                const subjectFromAnalysis = extracted ? deriveSubject(extracted) : null;
                const whatFromAnalysis = deriveWhat(extracted, qa.length);
                const descriptionFromAnalysis = extracted 
                  ? extracted.slice(0, 120).trim() + (extracted.length > 120 ? '...' : '')
                  : null;
                
                const updated = {
                  id: effectiveTaskId,
                  createdAt: base.createdAt || nowIso,
                  updatedAt: nowIso,
                  subject: subjectFromAnalysis || base.subject || "Sonstiges",
                  what: whatFromAnalysis || base.what || "Foto-Aufgabe",
                  description: descriptionFromAnalysis || base.description || (files?.[0]?.name || ""),
                  due: base.due || null,
                  done: base.done ?? false,
                  source: base.source || "image",
                  fileName: base.fileName || files?.[0]?.name || null,
                  fileType: base.fileType || files?.[0]?.type || null,
                  fileSize: base.fileSize || files?.[0]?.size || null,
                  hasImage: true,
                  scanId: data?.scan?.id ?? base.scanId ?? null,
                  conversationId: newCid ?? base.conversationId ?? null,
                  userId: sid,
                };
                const next = [...tasks];
                if (idx >= 0) next[idx] = { ...base, ...updated };
                else next.unshift(updated);
                if (save(next)) {
                  try {
                    window.dispatchEvent(new Event("kibundo:tasks-updated"));
                  } catch {}
                }
              } catch {}
            }
          } catch (err) {
            const status = err?.response?.status;
            const serverMsg =
              err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              "Unbekannter Fehler";
            console.error(
              "Upload/Analyse failed:",
              status,
              serverMsg,
              err?.response?.data
            );
            updateMessages((m) => {
              const arr = [...m];
              const idx = arr.findIndex((msg) => msg.id === loadingMessage.id);
              if (idx !== -1) {
                arr[idx] = formatMessage(
                  `Analyse fehlgeschlagen (${status ?? "?"}). ${serverMsg}`,
                  "agent"
                );
              }
              return arr;
            });
            antdMessage.error(`Upload/Analyse fehlgeschlagen GGG: ${err}`);
            antdMessage.error(`My token is --- : ${err}`);
          }
        }
      } finally {
        setUploading(false);
      }
    },
    [onSendMedia, updateMessages, antdMessage, uploading, conversationId]
  );

  const sendText = useCallback(() => {
    if (!draft.trim()) return;
    if (sendingRef.current || sending) return;
    handleSendText(draft).then(() => {
      setDraft("");
      requestAnimationFrame(() => inputRef.current?.focus());
    });
  }, [draft, handleSendText, sending]);

  const onMinimise = () => {
    if (typeof onClose === "function") onClose();
    else navigate(minimiseTo);
  };

  const startNewChat = useCallback(() => {
    const modeKey = stableModeRef.current;
    const taskKey = stableTaskIdRef.current;
    clearChatMessages?.(modeKey, taskKey);
    const seed =
      Array.isArray(initialMessages) && initialMessages.length > 0
        ? [...initialMessages]
        : defaultInitialMessages;
    setChatMessages?.(modeKey, taskKey, seed);
    setLocalMessages(seed);
    setDraft("");
    setTyping(false);
    // clear the conversationId for this scoped chat
    setConversationId(null);
    requestAnimationFrame(() =>
      listRef.current?.scrollTo({ top: 999999, behavior: "smooth" })
    );
  }, [clearChatMessages, setChatMessages, initialMessages, defaultInitialMessages]);

  const handleCameraChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleMediaUpload([file]);
    e.target.value = "";
  };
  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) handleMediaUpload(files);
    e.target.value = "";
  };

  const renderMessageContent = (message) => {
    switch (message.type) {
      case "image":
        return (
          <div className="relative">
            <img
              src={
                typeof message.content === "string"
                  ? message.content
                  : message.content?.url || ""
              }
              alt={message.fileName || "Hochgeladenes Bild"}
              className="max-w-full max-h-64 rounded-lg"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallbackApplied === "1") return;
                img.dataset.fallbackApplied = "1";
                img.src = FALLBACK_IMAGE_DATA_URL;
              }}
            />
            {message.fileName && (
              <div className="text-xs text-gray-500 mt-1 truncate">
                {message.fileName}
              </div>
            )}
          </div>
        );
      case "table": {
        const extracted = message.content?.extractedText;
        const qa = Array.isArray(message.content?.qa) ? message.content.qa : [];
        return (
          <div className="w-full">
            {extracted && (
              <div className="mb-3">
                <div className="font-semibold mb-1">Erkannter Text</div>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 whitespace-pre-wrap">
                  {extracted}
                </div>
              </div>
            )}
            {qa.length > 0 && (
              <div>
                <div className="font-semibold mb-2">Erkannte Fragen und Antworten</div>
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="text-left bg-gray-100 border border-gray-200 px-2 py-1 rounded-tl">
                        Frage
                      </th>
                      <th className="text-left bg-gray-100 border border-gray-200 px-2 py-1 rounded-tr">
                        Antwort
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {qa.map((q, i) => (
                      <tr key={i}>
                        <td className="align-top border border-gray-200 px-2 py-2 whitespace-pre-wrap">
                          {q?.text || "-"}
                        </td>
                        <td className="align-top border border-gray-200 px-2 py-2 whitespace-pre-wrap">
                          {q?.answer || "(keine)"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
      default:
        return (
          <div className="whitespace-pre-wrap">
            {String(message.content ?? "")}
          </div>
        );
    }
  };

  return (
    <div
      className={["relative w-full h-full bg-white overflow-hidden", className].join(
        " "
      )}
    >
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        onChange={handleCameraChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={handleGalleryChange}
        className="hidden"
      />

      {/* Minimize strip */}
      <div
        onClick={onMinimise}
        className="w-full cursor-pointer"
        style={{
          height: `${minimiseHeight}px`,
          backgroundImage: `url(${minimiseBg})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-label="Chat minimieren"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onMinimise()}
      />

      {/* Messages */}
      <div
        ref={listRef}
        className="relative px-3 pt-2 pb-28 overflow-y-auto bg-[#f3f7eb]"
        style={{ height: `calc(100% - ${minimiseHeight}px)` }}
        aria-live="polite"
      >
        {msgs.map((message, idx) => {
          const roleLower = (message?.from ?? message?.sender ?? "agent").toLowerCase();
          const isStudent = roleLower === "student" || roleLower === "user";
          const isAgent = !isStudent;
          return (
            <div
              key={messageKey(message, idx)}
              className={`w-full flex ${isAgent ? "justify-start" : "justify-end"} mb-3`}
            >
              {isAgent && (
                <img
                  src={agentIcon}
                  alt="Kibundo"
                  className="w-7 h-7 rounded-full mr-2 self-end"
                />
              )}
              <div
                className={`max-w-[78%] px-3 py-2 rounded-2xl shadow-sm ${
                  isAgent ? "bg-white text-[#444]" : "bg-[#aee17b] text-[#1b3a1b]"
                }`}
              >
                {renderMessageContent(message)}
                <div
                  className={`text-xs mt-1 ${isAgent ? "text-[#1b3a1b]/80" : "text-gray-500"}`}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              {!isAgent && (
                <img
                  src={studentIcon}
                  alt="Schüler"
                  className="w-7 h-7 rounded-full ml-2 self-end"
                />
              )}
            </div>
          );
        })}

        {(typing || externalTyping) && (
          <div className="w-full flex justify-start mb-3">
            <img
              src={agentIcon}
              alt="Kibundo"
              className="w-7 h-7 rounded-full mr-2 self-end"
            />
            <div className="max-w-[78%] px-3 py-2 rounded-2xl shadow-sm bg-[#aee17b] text-[#1b3a1b]">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[#1b3a1b]/60 animate-bounce" />
                <div
                  className="w-2 h-2 rounded-full bg-[#1b3a1b]/60 animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-[#1b3a1b]/60 animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div
        className="absolute left-0 right-0 bottom-0 z-40"
        style={{ backgroundColor: "#b2c10a", paddingBottom: "env(safe-area-inset-bottom)" }}
        role="form"
        aria-label="Nachrichten-Eingabe"
      >
        <div className="mx-auto max-w-[900px] px-3 py-2 flex items-center gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-10 h-10 grid place-items-center rounded-full bg-white/30"
            aria-label="Kamera öffnen"
            type="button"
            disabled={sending || uploading}
          >
            <img src={cameraIcon} alt="" className="w-6 h-6" />
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="w-10 h-10 grid place-items-center rounded-full bg-white/30"
            aria-label="Galerie öffnen"
            type="button"
            disabled={sending || uploading}
          >
            <img src={galleryIcon} alt="" className="w-6 h-6" />
          </button>

          <div className="flex-1 h-10 flex items-center px-3 bg-white rounded-full">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing &&
                  !sendingRef.current &&
                  !sending &&
                  draft.trim()
                ) {
                  e.preventDefault();
                  handleSendText(draft);
                  setDraft("");
                }
              }}
              placeholder="Frag etwas zur Aufgabe oder lade ein Bild über die Kamera/Galerie hoch…"
              className="w-full bg-transparent outline-none text-[15px]"
              aria-label="Nachricht eingeben"
              disabled={sending || uploading}
            />
          </div>

          <button
            onClick={() => {
              if (!draft.trim()) return startNewChat();
              sendText();
            }}
            className={`w-10 h-10 grid place-items-center rounded-full transition-colors shadow-sm ${
              sending || uploading ? "opacity-70" : "hover:brightness-95"
            }`}
            style={{ backgroundColor: "#ff7a00" }}
            aria-label={sending ? "Wird gesendet..." : draft.trim() ? "Nachricht senden" : "Neuen Chat starten"}
            type="button"
            disabled={sending || uploading}
          >
            {sending || uploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : draft.trim() ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="#ffffff">
                <path d="M21.44 2.56a1 1 0 0 0-1.05-.22L3.6 9.06a1 1 0 0 0 .04 1.87l6.9 2.28 2.3 6.91a1 1 0 0 0 1.86.03l6.74-16.78a1 1 0 0 0-.99-1.81ZM11.8 13.18l-4.18-1.38 9.68-4.04-5.5 5.42Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="#ffffff">
                <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
              </svg>
            )}
          </button>

          {dockState?.mode === "homework" && (
            <button
              onClick={() => markHomeworkDone?.()}
              className="w-11 h-11 grid place-items-center rounded-full"
              style={{ backgroundColor: "#8fd85d" }}
              aria-label="Aufgabe abschließen"
              type="button"
              disabled={sending || uploading}
            >
              <CheckOutlined style={{ color: "#fff", fontSize: 16 }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
