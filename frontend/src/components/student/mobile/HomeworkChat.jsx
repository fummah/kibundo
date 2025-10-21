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

/** stable signature for de-dupe */
const msgSig = (m) => {
  const type = m?.type ?? "text";
  const from = (m?.from ?? m?.sender ?? "agent").toLowerCase();
  const body =
    typeof m?.content === "string"
      ? m.content.trim().replace(/\s+/g, " ")
      : JSON.stringify(m?.content ?? "");
  return `${type}|${from}|${body.slice(0, 160)}`;
};

/** ✅ ENHANCED: More aggressive deduplication to prevent duplicate messages */
const mergeById = (serverMessages = [], localMessages = []) => {
  const seen = new Set();
  const out = [];

  const createKey = (m) => {
    // Normalize the message content for comparison
    const content = String(m?.content || "").trim().toLowerCase();
    const from = (m?.from ?? m?.sender ?? "agent").toLowerCase();
    const type = m?.type ?? "text";
    
    // Create multiple keys to catch different types of duplicates
    const keys = [];
    
    // Key 1: Use ID if available (most reliable)
    if (m?.id) {
      keys.push(`id:${m.id}`);
    }
    
    // Key 2: Content-based signature (primary deduplication)
    keys.push(`content:${type}|${from}|${content}`);
    
    // Key 3: Simplified content key for exact matches
    keys.push(`simple:${from}|${content}`);
    
    // Key 4: Student-specific key for better matching
    if (from === "student") {
      keys.push(`student:${content}`);
    }
    
    // Key 5: Timestamp-based key for very recent messages
    if (m?.timestamp) {
      keys.push(`time:${from}|${content}|${new Date(m.timestamp).getTime()}`);
    }
    
    // Return the first available key
    return keys[0];
  };

  const isDuplicate = (m) => {
    const content = String(m?.content || "").trim().toLowerCase();
    const from = (m?.from ?? m?.sender ?? "agent").toLowerCase();
    
    // For student messages, be more aggressive about matching by content
    // since they often don't have IDs from the server initially
    const isStudentMessage = from === "student";
    
    // Check against all possible keys
    const keys = [
      m?.id ? `id:${m.id}` : null,
      `content:text|${from}|${content}`,
      `simple:${from}|${content}`,
      // For student messages, also check without type prefix for better matching
      isStudentMessage ? `student:${content}` : null,
      // Add timestamp-based key for very recent messages
      m?.timestamp ? `time:${from}|${content}|${new Date(m.timestamp).getTime()}` : null
    ].filter(Boolean);
    
    return keys.some(key => seen.has(key));
  };

  const pushUnique = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const m of arr) {
      if (!m || typeof m !== "object") continue;
      
      if (isDuplicate(m)) {
        console.log("🔍 [mergeById] Skipping duplicate message:", {
          content: typeof m.content === 'string' ? m.content.substring(0, 50) + "..." : String(m.content || ""),
          from: m.from,
          id: m.id,
          timestamp: m.timestamp,
          pending: m.pending
        });
        continue;
      }
      
      const key = createKey(m);
      if (key) seen.add(key);
      out.push(m);
    }
  };

  // priority: server messages first (they have real IDs and timestamps)
  // then local messages (optimistic messages should be filtered out if server equivalent exists)
  pushUnique(serverMessages);
  pushUnique(localMessages);
  
  // Final cleanup: remove any remaining duplicates by content for student messages
  const finalDedup = [];
  const studentContentSeen = new Set();
  
  for (const msg of out) {
    if (msg.from === "student") {
      const contentKey = typeof msg.content === 'string' ? msg.content.trim().toLowerCase() : String(msg.content || "").trim().toLowerCase();
      if (contentKey && studentContentSeen.has(contentKey)) {
        console.log("🔍 [mergeById] Final cleanup - removing duplicate student message:", contentKey.substring(0, 30));
        continue;
      }
      if (contentKey) studentContentSeen.add(contentKey);
    }
    finalDedup.push(msg);
  }
  
  return finalDedup.sort(
    (a, b) => new Date(a?.timestamp || 0) - new Date(b?.timestamp || 0)
  );
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


  // per-student scoping
  const mode = "homework";
  const taskId = dockState?.task?.id ?? null;
  const studentId =
    authUser?.id ?? dockState?.task?.userId ?? dockState?.student?.id ?? "anon";

  const scopedTaskKey = useMemo(
    () => `${taskId ?? "global"}::u:${studentId}`,
    [taskId, studentId]
  );

  const stableModeRef = useRef(mode);
  const stableTaskIdRef = useRef(scopedTaskKey);

  // conversation id per thread
  const convKey = useMemo(
    () => `kibundo.convId.${mode}.${scopedTaskKey}`,
    [mode, scopedTaskKey]
  );

  const [conversationId, setConversationId] = useState(() => {
    if (dockState?.task?.conversationId) return dockState.task.conversationId;
    try {
      const stored =
        typeof window !== "undefined" && window.localStorage.getItem(convKey);
      return stored || null;
    } catch {
      return null;
    }
  });
  
  // Update conversationId when dockState changes
  useEffect(() => {
    if (dockState?.task?.conversationId) {
      setConversationId(dockState.task.conversationId);
    }
  }, [dockState?.task?.conversationId]);

  const [scanId, setScanId] = useState(() => dockState?.task?.scanId ?? null);
  
  // Update scanId when dockState changes
  useEffect(() => {
    if (dockState?.task?.scanId) {
      setScanId(dockState.task.scanId);
    }
  }, [dockState?.task?.scanId]);
  
  const [backendMessages, setBackendMessages] = useState([]);
  const [loadingBackendMessages, setLoadingBackendMessages] = useState(false);

  // Fetch messages from backend
  const fetchBackendMessages = useCallback(async (convId) => {
    if (!convId || loadingBackendMessages) return;
    
    setLoadingBackendMessages(true);
    try {
      const response = await api.get(`ai/conversations/${convId}/messages`, {
        withCredentials: true,
      });
      if (response?.data && Array.isArray(response.data)) {
        const formattedMessages = response.data.map(msg => formatMessage(
          msg.content || "",
          msg.sender === "student" ? "student" : "agent",
          "text",
          { 
            id: msg.id,
            timestamp: msg.created_at || msg.timestamp 
          }
        ));
        setBackendMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Failed to fetch backend messages:", error);
      setBackendMessages([]);
    } finally {
      setLoadingBackendMessages(false);
    }
  }, [loadingBackendMessages]);

  // Fetch backend messages when conversationId is available
  useEffect(() => {
    if (conversationId) {
      fetchBackendMessages(conversationId);
    }
  }, [conversationId, fetchBackendMessages]);

  useEffect(() => {
    if (scopedTaskKey !== stableTaskIdRef.current) {
      stableTaskIdRef.current = scopedTaskKey;
      didSeedRef.current = false;
      uploadNudgeShownRef.current = false;
    }
  }, [scopedTaskKey]);

  useEffect(() => {
    const tConv = dockState?.task?.conversationId;
    const tScan = dockState?.task?.scanId;
    if (tConv && tConv !== conversationId) setConversationId(tConv);
    if (!tConv && !conversationId) {
      try {
        const stored =
          typeof window !== "undefined" && window.localStorage.getItem(convKey);
        if (stored && stored !== conversationId) setConversationId(stored);
      } catch {}
    }
    if (tScan && tScan !== scanId) setScanId(tScan);
  }, [
    convKey,
    dockState?.task?.conversationId,
    dockState?.task?.scanId,
    conversationId,
    scanId,
  ]);

  useEffect(() => {
    try {
      if (conversationId) localStorage.setItem(convKey, conversationId);
      else localStorage.removeItem(convKey);
    } catch {}
  }, [conversationId, convKey]);

  // Fetch backend messages when conversation ID changes
  useEffect(() => {
    if (conversationId) {
      fetchBackendMessages(conversationId);
    } else {
      setBackendMessages([]);
    }
  }, [conversationId, fetchBackendMessages]);

  // Local buffer
  const [localMessages, setLocalMessages] = useState(() => {
    if (controlledMessagesProp) return controlledMessagesProp;
    const persisted = getChatMessages?.(
      stableModeRef.current,
      stableTaskIdRef.current
    );
    if (persisted?.length) return persisted;
    if (initialMessages?.length) return initialMessages;
    return [];
  });

  // 🌱 Seed ONLY when no persisted thread; otherwise hydrate from persisted
  const didSeedRef = useRef(false);
  useEffect(() => {
    if (!setChatMessages || !getChatMessages) return;

    const persisted =
      getChatMessages(stableModeRef.current, stableTaskIdRef.current) || [];
    const seedMessages = initialMessages?.length
      ? initialMessages
      : [];

    if (!didSeedRef.current) {
      if (persisted.length === 0 && seedMessages.length > 0) {
        setChatMessages(
          stableModeRef.current,
          stableTaskIdRef.current,
          [...seedMessages]
        );
        setLocalMessages(seedMessages);
      } else if (persisted.length > 0) {
        setLocalMessages(persisted);
      }
      didSeedRef.current = true;
    }
  }, [
    setChatMessages,
    getChatMessages,
    initialMessages,
    scopedTaskKey,
  ]);

  // Recompute messages (merge backend with existing messages to avoid duplicates)
  const msgs = useMemo(() => {
    if (controlledMessagesProp) return controlledMessagesProp;
    
    // Get existing messages
    const persisted = getChatMessages?.(stableModeRef.current, stableTaskIdRef.current) || [];
    const existingLocal = localMessages || [];
    
    // If we have backend messages, merge them with existing messages
    if (backendMessages.length > 0) {
      console.log("🔍 [HomeworkChat] Merging backend messages:", {
        backend: backendMessages.length,
        persisted: persisted.length,
        local: existingLocal.length
      });
      const merged = mergeById(backendMessages, [...persisted, ...existingLocal]);
      console.log("🔍 [HomeworkChat] Merged result:", merged.length, "messages");
      return merged;
    }
    
    // Fallback to local storage if no backend messages
    const merged = mergeById(persisted, existingLocal);
    if (merged.length === 0 && existingLocal.length > 0) {
      return existingLocal;
    }
    return merged;
  }, [controlledMessagesProp, backendMessages, getChatMessages, localMessages]);

  // never persist transient/base64 previews
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

  // ✅ Use msgs (rendered source) as base so we don't drop persisted items
  const updateMessages = useCallback(
    (next) => {
      const compute = (base) => (typeof next === "function" ? next(base) : next);

      if (controlledMessagesProp && onMessagesChangeProp) {
        const base = compute(controlledMessagesProp);
        if (base !== controlledMessagesProp) onMessagesChangeProp(base);
        return;
      }

      const baseNow = Array.isArray(msgs) ? msgs : [];
      const nextVal = compute(baseNow);

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
      filterForPersist,
      msgs,
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

  const sendingRef = useRef(false);
  const lastSentMessageRef = useRef(null);
  const lastSentTimeRef = useRef(0);

  // autoscroll
  const lastLenRef = useRef(0);
  useEffect(() => {
    if (!listRef.current) return;
    if (msgs?.length === lastLenRef.current && !typing && !externalTyping) return;
    lastLenRef.current = msgs?.length ?? 0;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight + 9999,
      behavior: "smooth",
    });
  }, [msgs, typing, externalTyping]);

  const toArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.messages)) return data.messages;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  };
  const mapServerToInternal = (arr) => {
    const messages = toArray(arr).map((m) =>
      formatMessage(
        m?.content ?? "",
        (m?.sender || "agent").toLowerCase() === "student" ? "student" : "agent",
        "text",
        { 
          id: m.id,
          timestamp: m.created_at || m.timestamp 
        }
      )
    );
    const seen = new Set();
    return messages.filter((m) => {
      const key = `${m.from}|${m.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const hasAnyImage = useMemo(
    () => Array.isArray(msgs) && msgs.some((m) => m?.type === "image"),
    [msgs]
  );

  const uploadNudgeShownRef = useRef(false);

  const handleSendText = useCallback(
    async (text) => {
      const t = (text || "").trim();
      if (!t) return;
      if (sendingRef.current || sending) return;

      const now = Date.now();
      if (
        lastSentMessageRef.current === t &&
        now - lastSentTimeRef.current < 2000
      ) {
        return;
      }

      const recentStudentMessages = (msgs || [])
        .filter((m) => m?.from === "student" && m?.content === t)
        .slice(-2);
      if (recentStudentMessages.length > 0) {
        const lastMessage = recentStudentMessages[recentStudentMessages.length - 1];
        const messageTime = new Date(lastMessage.timestamp).getTime();
        if (now - messageTime < 3000) return;
      }

      lastSentMessageRef.current = t;
      lastSentTimeRef.current = now;

      sendingRef.current = true;
      setSending(true);

      const optimisticMsg = formatMessage(t, "student", "text", { pending: true });
      updateMessages((m) => [...m, optimisticMsg]);

      try {
        if (onSendText) {
          await onSendText(t);
          return;
        }

        const firstUrl = conversationId
          ? `ai/conversations/${conversationId}/message`
          : `ai/conversations/message`;

        let resp;
        try {
          resp = await api.post(firstUrl, { message: t, scanId }, {
            withCredentials: true,
          });
        } catch (err) {
          const code = err?.response?.status;
          if (code === 404) {
            const r = await api.post("ai/chat", {
              question: t,
              ai_agent: "ChildAgent",
              mode: "homework",
              scanId,
              conversationId,
            }, {
              withCredentials: true,
            });
            updateMessages((m) => [
              ...m.filter((x) => !x?.pending),
              formatMessage(r?.data?.answer || "Okay!", "agent"),
            ]);
            return;
          }
          if (conversationId && (code === 400 || code === 404)) {
            resp = await api.post(`ai/conversations/message`, { message: t, scanId }, {
              withCredentials: true,
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
          const serverMessages = mapServerToInternal(r2.data);
          updateMessages((current) => {
            const withoutPending = current.filter((m) => !m?.pending);
            console.log("🔍 [HomeworkChat] Before merge - Local:", withoutPending.length, "Server:", serverMessages.length);
            console.log("🔍 [HomeworkChat] Local messages:", withoutPending.map(m => ({ from: m.from, content: typeof m.content === 'string' ? m.content.substring(0, 30) : String(m.content || ""), pending: m.pending })));
            console.log("🔍 [HomeworkChat] Server messages:", serverMessages.map(m => ({ from: m.from, content: typeof m.content === 'string' ? m.content.substring(0, 30) : String(m.content || ""), id: m.id })));
            
            // Merge server messages with local messages to avoid duplicates
            const merged = mergeById(serverMessages, withoutPending);
            console.log("🔍 [HomeworkChat] Merged result:", merged.length, "messages");
            return merged;
          });
        } else if (j?.answer) {
          updateMessages((current) => [
            ...current.filter((m) => !m?.pending),
            formatMessage(j.answer, "agent"),
          ]);
        }
      } catch (err) {
        const status = err?.response?.status;
        const serverMsg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Unbekannter Fehler";
        updateMessages((current) => [
          ...current.filter((m) => !m?.pending),
          formatMessage(`Fehler beim Senden (${status ?? "?"}). ${serverMsg}`, "agent"),
        ]);
        antdMessage.error(`Nachricht fehlgeschlagen: ${serverMsg}`);
      } finally {
        setSending(false);
        sendingRef.current = false;
      }
    },
    [sending, onSendText, updateMessages, antdMessage, conversationId, scanId, msgs]
  );

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

          const loadingMessage = formatMessage(
            isImg ? "🔍 Ich schaue mir dein Bild an..." : "📄 Ich lese deine Datei...",
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
              const needsClearerImage = data?.needsClearerImage || data?.parsed?.unclear || data?.error;

              updateMessages((m) => {
                const arr = [...m];
                const idx = arr.findIndex((msg) => msg.id === loadingMessage.id);
                
                if (needsClearerImage) {
                  // Handle unclear image case
                  if (idx !== -1)
                    arr[idx] = formatMessage("🤔 Ich kann das Bild nicht gut lesen...", "agent");
                  
                  arr.push(
                    formatMessage(
                      "📸 **Bitte mach ein besseres Foto!**\n\n" +
                      "✨ **Tipps für ein gutes Foto:**\n" +
                      "• Halte das Handy ruhig\n" +
                      "• Achte auf gutes Licht (nicht zu dunkel)\n" +
                      "• Das Blatt soll ganz im Bild sein\n" +
                      "• Der Text soll scharf und klar zu lesen sein\n\n" +
                      "Dann kann ich dir viel besser helfen! 😊",
                      "agent"
                    )
                  );
                } else if (extracted || qa.length > 0) {
                  // Handle successful analysis
                  if (idx !== -1)
                    arr[idx] = formatMessage("🎉 Fertig! Ich habe deine Hausaufgabe gelesen!", "agent");
                  
                  arr.push(formatMessage({ extractedText: extracted, qa }, "agent", "table"));
                  arr.push(
                    formatMessage(
                      "🎉 Super! Ich habe deine Hausaufgabe gefunden! Du kannst mir jetzt Fragen stellen oder um Hilfe bitten. Ich helfe dir gerne! 😊",
                      "agent"
                    )
                  );
                } else {
                  // Handle other cases
                  if (idx !== -1)
                    arr[idx] = formatMessage("🤔 Ich kann das Bild nicht gut lesen...", "agent");
                  
                  arr.push(
                    formatMessage(
                      "📸 **Das Bild ist nicht klar genug!**\n\n" +
                      "✨ **Versuche es nochmal mit:**\n" +
                      "• Mehr Licht\n" +
                      "• Ruhiger Hand\n" +
                      "• Scharfem Text\n\n" +
                      "Dann kann ich dir helfen! 😊",
                      "agent"
                    )
                  );
                }
                return arr;
              });

              const newCid = data?.conversationId;
              if (newCid && newCid !== conversationId) setConversationId(newCid);

              // Upsert task in local storage
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

                const deriveSubject = (text) => {
                  const lower = (text || "").toLowerCase();
                  if (lower.match(/mathe|rechnen|zahl/)) return "Mathe";
                  if (lower.match(/deutsch|text|lesen/)) return "Deutsch";
                  if (lower.match(/englisch|english/)) return "Englisch";
                  if (lower.match(/wissenschaft|science/)) return "Science";
                  return "Sonstiges";
                };
                const deriveWhat = (text, count) => {
                  if (count > 0) return `${count} Frage${count > 1 ? "n" : ""}`;
                  if ((text || "").length > 50) return "Hausaufgabe";
                  return "Foto-Aufgabe";
                };

                const subjectFromAnalysis = extracted ? deriveSubject(extracted) : null;
                const whatFromAnalysis = deriveWhat(extracted, qa.length);
                const descriptionFromAnalysis = extracted
                  ? extracted.slice(0, 120).trim() + (extracted.length > 120 ? "..." : "")
                  : null;

                const updated = {
                  id: effectiveTaskId,
                  createdAt: base.createdAt || nowIso,
                  updatedAt: nowIso,
                  subject: subjectFromAnalysis || base.subject || "Sonstiges",
                  what: whatFromAnalysis || base.what || "Foto-Aufgabe",
                  description:
                    descriptionFromAnalysis || base.description || (file?.name || ""),
                  due: base.due || null,
                  done: base.done ?? false,
                  source: base.source || "image",
                  fileName: base.fileName || file?.name || null,
                  fileType: base.fileType || file?.type || null,
                  fileSize: base.fileSize || file?.size || null,
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
            antdMessage.error(`Upload/Analyse fehlgeschlagen: ${serverMsg}`);
          }
        }
      } finally {
        setUploading(false);
      }
    },
    [onSendMedia, updateMessages, antdMessage, uploading, conversationId, studentId, taskId]
  );

  const sendText = useCallback(() => {
    if (!draft.trim()) return;
    if (sendingRef.current || sending) return;
    const originalDraft = draft;
    setDraft("");
    handleSendText(originalDraft).then(() => {
      requestAnimationFrame(() => inputRef.current?.focus());
    }).catch(() => {
      setDraft(originalDraft);
    });
  }, [draft, handleSendText, sending]);

  const onMinimise = () => {
    if (typeof onClose === "function") onClose();
    else navigate(minimiseTo);
  };

  const startNewChat = useCallback(() => {
    const ok =
      typeof window !== "undefined"
        ? window.confirm("Neuen Chat starten? Der Verlauf für diese Aufgabe wird gelöscht.")
        : true;
    if (!ok) return;

    const seed =
      Array.isArray(initialMessages) && initialMessages.length > 0
        ? [...initialMessages]
        : [];

    clearChatMessages?.(stableModeRef.current, stableTaskIdRef.current);
    setChatMessages?.(stableModeRef.current, stableTaskIdRef.current, seed);
    setLocalMessages(seed);
    setDraft("");
    setTyping(false);
    setConversationId(null);
    requestAnimationFrame(() =>
      listRef.current?.scrollTo({ top: 999999, behavior: "smooth" })
    );
  }, [clearChatMessages, setChatMessages, initialMessages]);

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
      case "table":
      case "analysis": {
        const extracted =
          message.content?.extractedText ||
          message.content?.raw_text ||
          message.content?.analysisText;
        const qa = Array.isArray(message.content?.qa)
          ? message.content.qa
          : Array.isArray(message.content?.questions)
          ? message.content.questions
          : [];
        return (
          <div className="w-full">
            {extracted && (
              <div className="mb-4">
                <div className="font-bold mb-2 text-green-600 text-base flex items-center gap-2">
                  📖 <span>Was ich in deinem Bild gesehen habe:</span>
                </div>
                <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200 whitespace-pre-wrap text-base leading-relaxed">
                  {extracted}
                </div>
              </div>
            )}
            {qa.length > 0 && (
              <div>
                <div className="font-bold mb-3 text-blue-600 text-base flex items-center gap-2">
                  🎯 <span>Deine Aufgaben ({qa.length}):</span>
                </div>
                <div className="space-y-3">
                  {qa.map((q, i) => (
                    <div key={i} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="mb-2">
                            <div className="font-bold text-blue-800 text-base mb-1 flex items-center gap-2">
                              💭 <span>Frage:</span>
                            </div>
                            <div className="text-gray-800 text-base leading-relaxed pl-6">
                              {q?.text || q?.question || "-"}
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-green-700 text-base mb-1 flex items-center gap-2">
                              ✅ <span>Antwort:</span>
                            </div>
                            <div className="text-gray-700 text-base leading-relaxed pl-6 bg-white rounded-lg p-3 border border-green-200">
                              {q?.answer || "(Keine Antwort gefunden)"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!extracted && qa.length === 0 && (
              <div className="text-center p-6 bg-orange-50 rounded-xl border-2 border-orange-200">
                <div className="text-4xl mb-3">📸</div>
                <div className="text-orange-700 font-bold text-base mb-2">
                  Das Bild ist nicht klar genug!
                </div>
                <div className="text-orange-600 text-sm space-y-1">
                  <div>✨ <strong>Tipps für ein besseres Foto:</strong></div>
                  <div>• Halte das Handy ruhig</div>
                  <div>• Achte auf gutes Licht</div>
                  <div>• Das Blatt soll ganz im Bild sein</div>
                  <div>• Der Text soll scharf sein</div>
                </div>
                <div className="text-orange-700 font-medium text-sm mt-3">
                  Dann kann ich dir viel besser helfen! 😊
                </div>
              </div>
            )}
          </div>
        );
      }
      default:
        return <div className="whitespace-pre-wrap">{String(message.content ?? "")}</div>;
    }
  };

  return (
    <div className={["relative w-full h-full bg-white overflow-hidden", className].join(" ")}>
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
                <img src={agentIcon} alt="Kibundo" className="w-7 h-7 rounded-full mr-2 self-end" />
              )}
              <div
                className={`max-w-[78%] px-3 py-2 rounded-2xl shadow-sm ${
                  isAgent ? "bg-white text-[#444]" : "bg-[#aee17b] text-[#1b3a1b]"
                }`}
              >
                {renderMessageContent(message)}
                <div className={`text-xs mt-1 ${isAgent ? "text-[#1b3a1b]/80" : "text-gray-500"}`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {!isAgent && (
                <img src={studentIcon} alt="Schüler" className="w-7 h-7 rounded-full ml-2 self-end" />
              )}
            </div>
          );
        })}

        {(typing || externalTyping) && (
          <div className="w-full flex justify-start mb-3">
            <img src={agentIcon} alt="Kibundo" className="w-7 h-7 rounded-full mr-2 self-end" />
            <div className="max-w-[78%] px-3 py-2 rounded-2xl shadow-sm bg-[#aee17b] text-[#1b3a1b]">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[#1b3a1b]/60 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-[#1b3a1b]/60 animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-2 h-2 rounded-full bg-[#1b3a1b]/60 animate-bounce" style={{ animationDelay: "0.2s" }} />
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
                  sendText();
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
              if (draft.trim()) {
                sendText();
              } else {
                startNewChat();
              }
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
