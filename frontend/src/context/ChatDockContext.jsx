// src/context/ChatDockContext.jsx
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

export const TASKS_KEY = "kibundo.homework.tasks.v1";
export const PROGRESS_KEY = "kibundo.homework.progress.v1";
const CHAT_NS = "kibundo.chat.v1";

const NOOP = () => {};
const DEFAULT_CTX = {
  state: {
    visible: false,
    expanded: false,
    mode: null,
    task: null,
    initialMessages: null,
    chatByKey: {},              // ✅ persisted chats
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

export function ChatDockProvider({ children }) {
  const navigate = useNavigate();

  const [state, setState] = useState(() => ({
    visible: false, // start hidden
    expanded: false,
    mode: null,
    task: null,
    initialMessages: null,
    chatByKey: loadAllChats(), // ✅ hydrate
  }));

  const getChatMessages = useCallback(
    (mode = "general", taskId = null) => {
      const key = getKey(mode, taskId);
      return state.chatByKey[key] || [];
    },
    [state.chatByKey]
  );

  const setChatMessages = useCallback((mode, taskId, messages) => {
    setState((s) => {
      const key = getKey(mode, taskId);
      const chatByKey = { ...s.chatByKey, [key]: messages };
      saveAllChats(chatByKey);                 // ✅ persist
      return { ...s, chatByKey };
    });
  }, []);

  const clearChatMessages = useCallback((mode, taskId) => {
    setState((s) => {
      const key = getKey(mode, taskId);
      const { [key]: _, ...rest } = s.chatByKey;
      saveAllChats(rest);
      return { ...s, chatByKey: rest };
    });
  }, []);

  const openChat = useCallback(
    ({ mode = "general", task = null, initialMessages = null } = {}) => {
      // Seed history if empty and an initial payload is provided
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
        expanded: false,
        mode,
        task,
        initialMessages: null, // history now lives in chatByKey
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
            task: {
              ...task,
              done: true,
              completedAt: new Date().toISOString(),
            },
          })
        );
      }
    } catch (error) {
      console.error("Error marking homework as done:", error);
    }

    navigate("/student/homework/feedback", { state: { taskId: task?.id || null } });
  }, [state.task, navigate]);

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
  const context = useContext(ChatDockCtx);
  if (!context) {
    console.warn("useChatDock must be used within a ChatDockProvider");
    return DEFAULT_CTX;
  }
  return context;
};
