import React, { createContext, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const ChatDockCtx = createContext(null);

const TASKS_KEY = "kibundo.homework.tasks.v1";
const PROGRESS_KEY = "kibundo.homework.progress.v1";

export function ChatDockProvider({ children }) {
  const navigate = useNavigate();

  // visible: the dock exists (footer strip visible)
  // expanded: open sheet vs minimized strip
  const [state, setState] = useState({
    visible: true,
    expanded: false,
    mode: null,            // 'homework' | 'general' | ...
    task: null,            // { id, subject, ... } (optional)
    initialMessages: null, // optional seed messages
  });

  const openChat = ({ mode = "homework", task = null, initialMessages = null } = {}) => {
    try {
      if (mode === "homework") {
        const prev = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
        localStorage.setItem(
          PROGRESS_KEY,
          JSON.stringify({ ...prev, step: 1, taskId: task?.id || null, task })
        );
      }
    } catch {}
    setState({ visible: true, expanded: true, mode, task, initialMessages });
  };

  const expandChat = () => setState((s) => ({ ...s, expanded: true, visible: true }));
  const minimizeChat = () => setState((s) => ({ ...s, expanded: false, visible: true }));

  // "close" now behaves like minimize (footer remains)
  const closeChat = () => minimizeChat();

  // (rare) completely hide the dock if ever needed
  const hideChat = () => setState((s) => ({ ...s, visible: false, expanded: false }));

  const markHomeworkDone = () => {
    const { task } = state || {};
    try {
      if (task?.id) {
        const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
        const next = tasks.map((t) => (t.id === task.id ? { ...t, done: true } : t));
        localStorage.setItem(TASKS_KEY, JSON.stringify(next));
      }
      const prev = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      localStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({ ...prev, step: 2, taskId: task?.id || null, task })
      );
    } catch {}
    minimizeChat(); // keep footer visible
    navigate("/student/homework/feedback", { state: { taskId: task?.id || null } });
  };

  const value = useMemo(
    () => ({ state, openChat, expandChat, minimizeChat, closeChat, hideChat, markHomeworkDone }),
    [state]
  );

  return <ChatDockCtx.Provider value={value}>{children}</ChatDockCtx.Provider>;
}

export const useChatDock = () => useContext(ChatDockCtx);
