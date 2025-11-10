// src/context/ChatDockContext.jsx
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios"; // ⬅️ your centralized Axios instance
import { resolveStudentAgent } from "@/utils/studentAgent";

export const TASKS_KEY = "kibundo.homework.tasks.v1";
export const PROGRESS_KEY = "kibundo.homework.progress.v1";
const CHAT_NS = "kibundo.chat.v1";

const NOOP = () => {};
const DEFAULT_CTX = {
  state: {
    visible: false,
    expanded: false,
    mode: null,              // "general" | "homework"
    task: null,              // { id, file?, fileName?, userId?, scanId?, conversationId? }
    initialMessages: null,
    chatByKey: {},
    analyzeOnOpen: false,
    readOnly: false,
  },
  openChat: NOOP,
  expandChat: NOOP,
  minimizeChat: NOOP,
  closeChat: NOOP,
  markHomeworkDone: NOOP,
  getChatMessages: () => [],
  setChatMessages: NOOP,
  clearChatMessages: NOOP,
  setReadOnly: NOOP,
};

const ChatDockCtx = createContext(DEFAULT_CTX);

const getKey = (mode = "general", taskId = null) =>
  `${CHAT_NS}:${mode}:${taskId ?? "__"}`;

/* ---------- persistence helpers ---------- */
const loadAllChats = () => {
  try {
    const raw = localStorage.getItem(CHAT_NS);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};
const saveAllChats = (chatByKey) => {
  try {
    localStorage.setItem(CHAT_NS, JSON.stringify(chatByKey || {}));
  } catch {}
};

/* ---------- FIXED: robust mergeById (no Array.isArray(m) checks) ---------- */
const mergeById = (left = [], right = []) => {
  const out = [];
  const seen = new Set();

  const createKey = (m) => {
    if (!m || typeof m !== "object") return "";
    if (m.id) return String(m.id);
    if (m?.from === "student" && m?.content) {
      const content = String(m.content).trim();
      const ts = m?.timestamp || "";
      return `student|${content}|${ts}`;
    }
    return `${m?.from}|${m?.timestamp}|${String(m?.content ?? "").slice(0, 64)}`;
  };

  const pushUnique = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const m of arr) {
      if (!m || typeof m !== "object") continue;
      const key = createKey(m);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }
  };

  // Priority order: left, then right
  pushUnique(left);
  pushUnique(right);

  // Time ascending
  out.sort((a, b) => new Date(a?.timestamp || 0) - new Date(b?.timestamp || 0));
  return out;
};

const fmt = (content, from = "agent", type = "text", extra = {}) => ({
  id: Date.now() + Math.random().toString(36).slice(2, 9),
  from,
  type,
  content,
  timestamp: new Date().toISOString(),
  ...extra,
});

/** Build child-friendly markdown format for homework analysis (safe for text-only renderers) */
const qaToMarkdown = (extractedText = "", qa = [], isUnclear = false) => {
  if (isUnclear) {
    return `📸 **Das Bild ist nicht klar genug!**

✨ **Tipps für ein besseres Foto:**
• Halte das Handy ruhig
• Achte auf gutes Licht (nicht zu dunkel)
• Das Blatt soll ganz im Bild sein
• Der Text soll scharf und klar zu lesen sein

Dann kann ich dir viel besser helfen! 😊`;
  }

  const extractedBlock = extractedText?.trim()
    ? `\n\n📖 **Was ich in deinem Bild gesehen habe:**\n\n${extractedText}\n`
    : "\n\n📖 **Was ich in deinem Bild gesehen habe:**\n\n_(nichts gefunden)_\n";

  const qaBlock = Array.isArray(qa) && qa.length
    ? `\n\n🎯 **Deine Aufgaben (${qa.length}):**\n\n` + qa.map((q, i) => {
        const question = (q?.text || q?.question || "—").replace(/\n+/g, " ");
        const answer = (q?.answer || "—").replace(/\n+/g, " ");
        return `${i + 1}. 💭 **Frage:** ${question}\n   ✅ **Antwort:** ${answer}`;
      }).join("\n\n")
    : "\n\n🎯 **Deine Aufgaben:**\n\n_(keine Aufgaben erkannt)_\n";

  return `🎉 **Deine Hausaufgabe wurde gefunden!**\n${extractedBlock}${qaBlock}`;
};

/** 🚫 Never persist transient messages or base64 previews (Data URLs) */
const filterPersistable = (arr = []) =>
  (arr || []).filter((m) => {
    if (m?.transient === true) return false;
    if (m?.type === "image" && typeof m.content === "string" && m.content.startsWith("data:")) {
      return false;
    }
    return true;
  });

export function ChatDockProvider({ children }) {
  const navigate = useNavigate();
  const analyzingRef = useRef(false);

  const [state, setState] = useState(() => ({
    visible: false,
    expanded: false,
    mode: null,
    task: null,
    initialMessages: null,
    chatByKey: loadAllChats(),
    analyzeOnOpen: false,
    readOnly: false,
  }));
  
  const [selectedAgent, setSelectedAgent] = useState("Kibundo"); // Default fallback

  // Fetch selected agent from backend (only if authenticated)
  useEffect(() => {
    const fetchSelectedAgent = async () => {
      const agent = await resolveStudentAgent();
      if (agent?.name) {
        setSelectedAgent(agent.name);
      }
    };

    fetchSelectedAgent();
  }, []);

  /** Keep in sync if other tabs modify localStorage */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== CHAT_NS) return;
      try {
        const parsed = e.newValue ? JSON.parse(e.newValue) : {};
        if (parsed && typeof parsed === "object") {
          setState((s) => ({ ...s, chatByKey: parsed }));
        }
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** One-time migration: convert legacy {type:'qa', content:{...}} to Markdown text */
  useEffect(() => {
    setState((s) => {
      let changed = false;
      const chatByKey = Object.fromEntries(
        Object.entries(s.chatByKey || {}).map(([key, arr]) => {
          const nextArr = Array.isArray(arr)
            ? arr.map((m) => {
                if (m?.type === "qa" && m?.content && typeof m.content === "object") {
                  const extracted = m.content.analysisText || "";
                  const rows = Array.isArray(m.content.rows) ? m.content.rows : [];
                  const qa = rows.map((r) => ({
                    text: r?.question || "",
                    answer: r?.answer || "",
                  }));
                  const md = qaToMarkdown(extracted, qa);
                  changed = true;
                  return { ...m, type: "text", content: md };
                }
                return m;
              })
            : arr;
          return [key, nextArr];
        })
      );
      if (changed) {
        saveAllChats(chatByKey);
        return { ...s, chatByKey };
      }
      return s;
    });
  }, []);

  const getChatMessages = useCallback(
    (mode = "general", taskId = null) => {
      const key = getKey(mode, taskId);
      return state.chatByKey[key] || [];
    },
    [state.chatByKey]
  );

  const setChatMessages = useCallback((mode, taskId, next) => {
    setState((s) => {
      const key = getKey(mode, taskId);
      const current = s.chatByKey[key] || [];

      const nextVal =
        typeof next === "function"
          ? next([...current])
          : Array.isArray(next)
          ? mergeById(current, next)       // ✅ fixed merge
          : current;

      const safeToPersist = filterPersistable(nextVal);
      const chatByKey = { ...s.chatByKey, [key]: safeToPersist };
      saveAllChats(chatByKey);
      return { ...s, chatByKey };
    });
  }, []);

  const clearChatMessages = useCallback((mode, taskId) => {
    setState((s) => {
      const key = getKey(mode, taskId);
      const { [key]: _drop, ...rest } = s.chatByKey;
      saveAllChats(rest);
      return { ...s, chatByKey: rest };
    });
  }, []);

  const openChat = useCallback(
    ({ mode = "general", task = null, initialMessages = null, analyze = false, readOnly = false } = {}) => {
      const hasProvided = Array.isArray(initialMessages) && initialMessages.length > 0;
      const hasTaskMsgs = Array.isArray(task?.messages) && task.messages.length > 0;
      const existing = getChatMessages(mode, task?.id);

      if (existing.length === 0) {
        const seed = hasProvided ? initialMessages : hasTaskMsgs ? task.messages : [];
        if (seed.length > 0) {
          // use array branch -> mergeById (now correct)
          setChatMessages(mode, task?.id, [...seed]);
        }
      }

      setState((s) => ({
        ...s,
        visible: true,
        expanded: s.expanded,
        mode,
        task,
        initialMessages: null,
        analyzeOnOpen: Boolean(analyze && task?.file),
        readOnly: Boolean(readOnly),
      }));
    },
    [getChatMessages, setChatMessages]
  );

  const expandChat = useCallback(
    () => setState((s) => ({ ...s, expanded: true, visible: true })),
    []
  );
  const minimizeChat = useCallback(
    () => setState((s) => ({ ...s, expanded: false, visible: true })),
    []
  );
  const closeChat = useCallback(
    () =>
      setState((s) => ({
        ...s,
        expanded: false,
        visible: false,
        readOnly: false,
      })),
    []
  );

  const markHomeworkDone = useCallback(() => {
    const task = state.task;
    const hasStorage = typeof window !== "undefined" && !!window.localStorage;

    try {
      if (hasStorage && task?.id) {
        const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
        const nextTasks = tasks.map((t) =>
          t.id === task.id
            ? { ...t, done: true, completedAt: new Date().toISOString() }
            : t
        );
        localStorage.setItem(TASKS_KEY, JSON.stringify(nextTasks));
      }
      if (hasStorage) {
        const prevProgress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
        localStorage.setItem(
          PROGRESS_KEY,
          JSON.stringify({
            ...prevProgress,
            step: 3,
            taskId: task?.id || null,
            task: { ...task, done: true, completedAt: new Date().toISOString() },
          })
        );
      }
    } catch (e) {
      // Error marking homework as done
    }

    navigate("/student/homework/feedback", { state: { taskId: task?.id || null } });
  }, [state.task, navigate]);

  const setReadOnly = useCallback((value) => {
    setState((s) => ({ ...s, readOnly: Boolean(value) }));
  }, []);

  /* -------------------- AUTO ANALYZE USING /api/ai/upload (Axios) -------------------- */
  useEffect(() => {
    const { analyzeOnOpen, task, mode } = state;
    if (!analyzeOnOpen || !task?.file || analyzingRef.current) return;

    analyzingRef.current = true;

    // snapshot to avoid races
    const snapshot = {
      mode,
      taskId: task.id,
      file: task.file,
      fileName: task.fileName,
      userId: task.userId,
    };

    const isImage = snapshot.file.type?.startsWith("image/");
    const previewUrl = isImage ? URL.createObjectURL(snapshot.file) : null;

    // 1) show transient preview + analyzing notice
    setChatMessages(snapshot.mode, snapshot.taskId, (prev) => [
      ...prev,
      fmt("Ich analysiere dein Bild …", "system"),
      ...(previewUrl ? [fmt(previewUrl, "student", "image", { transient: true })] : []),
    ]);

    (async () => {
      try {
        const fd = new FormData();
        fd.append("file", snapshot.file, snapshot.fileName || "upload");
        // Backend gets userId from auth token, not form data

        const { data } = await api.post("ai/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true, // Include auth headers
        });

        const extracted =
          data?.scan?.raw_text ??
          data?.parsed?.raw_text ??
          data?.extractedText ??
          (data?.aiText || ""); // Fallback to raw AI response
        const qa =
          (Array.isArray(data?.parsed?.questions) && data.parsed.questions) ||
          (Array.isArray(data?.qa) && data.qa) ||
          [];

        // Show analysis results immediately with structured format
        setChatMessages(snapshot.mode, snapshot.taskId, (prev) => {
          const newMessages = [...prev];
          
          // Replace the loading message with completion message
          const loadingIndex = newMessages.findIndex(msg => 
            msg.content === "Ich analysiere dein Bild …" && msg.from === "system"
          );
          if (loadingIndex !== -1) {
            newMessages[loadingIndex] = fmt("✅ Analyse abgeschlossen!", "agent", "text", { agentName: selectedAgent || "Kibundo" });
          }
          
          // Add analysis results - be more flexible about what we show
          if (extracted || qa.length > 0) {
            newMessages.push(fmt({ extractedText: extracted, qa }, "agent", "table", { agentName: selectedAgent || "Kibundo" }));
            // Add follow-up message to encourage interaction
            newMessages.push(fmt("Wie kann ich dir bei deiner Aufgabe helfen? Du kannst mir Fragen stellen oder um Erklärungen bitten!", "agent", "text", { agentName: selectedAgent || "Kibundo" }));
          } else {
            // Even if no structured data, show that we got the image and offer help
            newMessages.push(fmt("Ich habe dein Bild erhalten! Du kannst mir trotzdem Fragen stellen. Beschreibe mir einfach, womit ich dir helfen kann.", "agent", "text", { agentName: selectedAgent || "Kibundo" }));
          }
          
          return newMessages;
        });

        const scanId = data?.scan?.id ?? data?.scanId ?? null;
        const conversationId = data?.conversationId ?? null;

        if (scanId || conversationId) {
          setState((s) => ({
            ...s,
            task: {
              ...s.task,
              scanId: scanId ?? s.task?.scanId,
              conversationId: conversationId ?? s.task?.conversationId,
            },
          }));
          
          // Store conversation ID in localStorage for persistence
          if (conversationId) {
            try {
              const convKey = `kibundo.convId.${snapshot.mode}.${snapshot.taskId}::u:${snapshot.userId}`;
              localStorage.setItem(convKey, conversationId);
            } catch (e) {
              // Failed to store conversation ID
            }
          }
        }
      } catch (err) {
        // Upload/Analyse failed
        
        // Handle specific backend errors
        const errorMessage = err?.response?.data?.message || err?.message || "Unbekannter Fehler";
        const isImageUrlError = errorMessage.includes("image_url") || errorMessage.includes("Invalid type");
        
        let userMessage;
        if (isImageUrlError) {
          userMessage = "Das Bild konnte nicht automatisch analysiert werden. Du kannst mir trotzdem Fragen stellen! Beschreibe mir einfach, was du für Hilfe brauchst.";
        } else {
          userMessage = `Die Bildanalyse ist fehlgeschlagen: ${errorMessage}. Bitte versuche es erneut.`;
        }
        
        setChatMessages(snapshot.mode, snapshot.taskId, (prev) => {
          const newMessages = [...prev];
          
          // Replace the loading message with error message
          const loadingIndex = newMessages.findIndex(msg => 
            msg.content === "Ich analysiere dein Bild …" && msg.from === "system"
          );
          if (loadingIndex !== -1) {
            newMessages[loadingIndex] = fmt(userMessage, "agent", "text", { agentName: selectedAgent || "Kibundo" });
          } else {
            newMessages.push(fmt(userMessage, "agent", "text", { agentName: selectedAgent || "Kibundo" }));
          }
          
          // Add helpful suggestion
          newMessages.push(fmt("Du kannst mir Fragen zu deiner Aufgabe stellen, auch ohne Bildanalyse. Was möchtest du wissen?", "agent", "text", { agentName: selectedAgent || "Kibundo" }));
          
          return newMessages;
        });
      } finally {
        setState((s) => ({ ...s, analyzeOnOpen: false }));
        analyzingRef.current = false;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      }
    })();
  }, [state.analyzeOnOpen, state.task, state.mode, setChatMessages]);

  const value = useMemo(
    () => ({
      state,
      openChat,
      expandChat,
      minimizeChat,
      closeChat,
      markHomeworkDone,
      getChatMessages,
      setChatMessages,
      clearChatMessages,
      setReadOnly,
    }),
    [
      state,
      openChat,
      expandChat,
      minimizeChat,
      closeChat,
      markHomeworkDone,
      getChatMessages,
      setChatMessages,
      clearChatMessages,
      setReadOnly,
    ]
  );

  return <ChatDockCtx.Provider value={value}>{children}</ChatDockCtx.Provider>;
}

export const useChatDock = () => useContext(ChatDockCtx);
