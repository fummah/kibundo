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
import api from "@/api/axios"; // ⬅️ use your centralized Axios instance

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
  },
  openChat: NOOP,
  expandChat: NOOP,
  minimizeChat: NOOP,
  closeChat: NOOP,
  markHomeworkDone: NOOP,
  getChatMessages: () => [],
  setChatMessages: NOOP,
  clearChatMessages: NOOP,
};

const ChatDockCtx = createContext(DEFAULT_CTX);

const getKey = (mode = "general", taskId = null) =>
  `${CHAT_NS}:${mode}:${taskId ?? "__"}`;

const loadAllChats = () => {
  try {
    return JSON.parse(localStorage.getItem(CHAT_NS) || "{}");
  } catch {
    return {};
  }
};
const saveAllChats = (chatByKey) => {
  try {
    localStorage.setItem(CHAT_NS, JSON.stringify(chatByKey));
  } catch {}
};

const mergeById = (a = [], b = []) => {
  const seen = new Set();
  const out = [];
  for (const arr of [a, b]) {
    if (!Array.isArray(arr)) continue;
    for (const m of arr) {
      const key =
        m?.id ??
        `${m?.from}|${m?.timestamp}|${String(m?.content).slice(0, 64)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }
  }
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

/** Build a Markdown table + extracted text (safe for text-only renderers) */
const qaToMarkdown = (extractedText = "", qa = []) => {
  const header = "| # | Frage | Antwort |\n|---:|-------|---------|";
  const rows =
    Array.isArray(qa) && qa.length
      ? qa
          .map((q, i) => {
            const question = (q?.text || q?.question || "—").replace(/\n+/g, " ");
            const answer = (q?.answer || "—").replace(/\n+/g, " ");
            return `| ${i + 1} | ${question} | ${answer} |`;
          })
          .join("\n")
      : "| – | Keine Fragen erkannt | – |";

  const extractedBlock = extractedText?.trim()
    ? `\n\n**Erkannter Text**\n\n\`\`\`\n${extractedText}\n\`\`\`\n`
    : "\n\n**Erkannter Text**\n\n_(keine Daten gefunden)_\n";

  return `**Analyse-Ergebnis**\n\n${header}\n${rows}${extractedBlock}`;
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
  }));

  /** One-time migration: convert any legacy {type:'qa', content:{...}} to Markdown text */
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
        try {
          localStorage.setItem(CHAT_NS, JSON.stringify(chatByKey));
        } catch {}
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
      const base = [...current];
      const nextVal =
        typeof next === "function"
          ? next(base)
          : Array.isArray(next)
          ? mergeById(base, next)
          : base;

      // 🚫 Persist only safe messages
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
    ({ mode = "general", task = null, initialMessages = null, analyze = false } = {}) => {
      const hasProvided = Array.isArray(initialMessages) && initialMessages.length > 0;
      const hasTaskMsgs = Array.isArray(task?.messages) && task.messages.length > 0;
      const existing = getChatMessages(mode, task?.id);

      if (existing.length === 0) {
        const seed = hasProvided ? initialMessages : hasTaskMsgs ? task.messages : [];
        if (seed.length > 0) setChatMessages(mode, task?.id, [...seed]);
      }

      setState((s) => ({
        ...s,
        visible: true,
        expanded: s.expanded,
        mode,
        task,
        initialMessages: null,
        analyzeOnOpen: Boolean(analyze && task?.file),
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
    () => setState((s) => ({ ...s, expanded: false, visible: false })),
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
      console.error("Error marking homework as done:", e);
    }

    navigate("/student/homework/feedback", { state: { taskId: task?.id || null } });
  }, [state.task, navigate]);

  /* -------------------- AUTO ANALYZE USING /api/ai/upload (Axios) -------------------- */
  useEffect(() => {
    const { analyzeOnOpen, task, mode } = state;
    if (!analyzeOnOpen || !task?.file || analyzingRef.current) return;

    analyzingRef.current = true;

    // snapshot values to avoid races if state flips mid-request
    const snapshot = {
      mode,
      taskId: task.id,
      file: task.file,
      fileName: task.fileName,
      userId: task.userId,
    };

    const isImage = snapshot.file.type?.startsWith("image/");
    const previewUrl = isImage ? URL.createObjectURL(snapshot.file) : null;

    // 1) Show “analyzing…” + optional image bubble (transient preview)
    setChatMessages(snapshot.mode, snapshot.taskId, (prev) => [
      ...prev,
      fmt("Ich analysiere dein Bild …", "system"),
      ...(previewUrl ? [fmt(previewUrl, "student", "image", { transient: true })] : []),
    ]);

    (async () => {
      try {
        // 2) Upload to your scanner API via Axios
        const fd = new FormData();
        fd.append("file", snapshot.file, snapshot.fileName || "upload");
        if (snapshot.userId) fd.append("userId", snapshot.userId);

        // Authorization is handled by axios interceptor; no need to set headers unless you want to force multipart
        const { data } = await api.post("/ai/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        // Extract structured info safely
        const extracted =
          data?.scan?.raw_text ??
          data?.parsed?.raw_text ??
          data?.extractedText ??
          "";
        const qa =
          (Array.isArray(data?.parsed?.questions) && data.parsed.questions) ||
          (Array.isArray(data?.qa) && data.qa) ||
          [];

        // 3) Emit Markdown (persistable)
        const md = qaToMarkdown(extracted, qa);
        setChatMessages(snapshot.mode, snapshot.taskId, (prev) => [
          ...prev,
          fmt(md, "agent", "text"),
        ]);

        // 4) Store scanId / conversationId on the current task (kept in state only)
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
        }
      } catch (err) {
        console.error(err);
        setChatMessages(snapshot.mode, snapshot.taskId, (prev) => [
          ...prev,
          fmt("Sorry, die Bildanalyse ist fehlgeschlagen. Bitte versuche es erneut.", "system"),
        ]);
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
    ]
  );

  return <ChatDockCtx.Provider value={value}>{children}</ChatDockCtx.Provider>;
}

export const useChatDock = () => {
  // Because we created the context with DEFAULT_CTX, this will never be null.
  return useContext(ChatDockCtx);
};
