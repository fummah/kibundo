// src/components/student/mobile/ChatLayer.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "antd";
import api from "@/api/axios";
import { useChatDock } from "@/context/ChatDockContext";
import { useAuthContext } from "@/context/AuthContext";

import minimiseBg from "@/assets/backgrounds/minimise.png";
import agentIcon from "@/assets/mobile/icons/agent-icon.png";
import studentIcon from "@/assets/mobile/icons/stud-icon.png";

/** Text-only ChatLayer (no media capture/upload) */

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

const mergeById = (a = [], b = []) => {
  const seen = new Set();
  const out = [];
  for (const arr of [a, b]) {
    if (!Array.isArray(arr)) continue;
    for (const m of arr) {
      const key = m?.id ?? `${m?.from}|${m?.timestamp}|${String(m?.content).slice(0, 64)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }
  }
  return out;
};

const messageKey = (m, i) =>
  m?.id ?? `${m?.from || "unk"}|${m?.timestamp || "t0"}|${String(m?.content ?? "").slice(0, 64)}|${i}`;

export default function ChatLayer({
  messages: controlledMessagesProp,
  onMessagesChange: onMessagesChangeProp,
  initialMessages = [
    formatMessage(
      "Hallo! Ich bin dein KI-Lernhelfer. Wie kann ich dir bei deinen Hausaufgaben helfen?",
      "agent"
    ),
  ],
  onSendText,
  isTyping: externalTyping = false,
  onClose,
  minimiseTo = "/student/home",
  minimiseHeight = 54,
  className = "",
}) {
  const navigate = useNavigate();
  const { message: antdMessage } = App.useApp();

  const { getChatMessages, setChatMessages, clearChatMessages } = useChatDock();
  const { user: authUser } = useAuthContext();

  // Always "general" mode — but now we SCOPE the key PER STUDENT
  const mode = "general";
  const baseTaskId = "global";
  const studentId =
    authUser?.id ??
    // fallback places if you carry it elsewhere in state:
    // dockState?.student?.id ?? dockState?.task?.userId ??
    "anon";

  // IMPORTANT: scoped key so storage/history is per-student
  const scopedTaskKey = useMemo(
    () => `${baseTaskId}::u:${studentId}`,
    [baseTaskId, studentId]
  );

  const stableModeRef = useRef(mode);
  const stableTaskIdRef = useRef(scopedTaskKey);

  // If student changes (or we log in/out), reset seed flags and switch thread
  const didSeedRef = useRef(false);
  useEffect(() => {
    if (scopedTaskKey !== stableTaskIdRef.current) {
      stableTaskIdRef.current = scopedTaskKey;
      didSeedRef.current = false;
    }
  }, [scopedTaskKey]);

  // Local UI buffer
  const [localMessages, setLocalMessages] = useState(
    controlledMessagesProp ??
      getChatMessages?.(stableModeRef.current, stableTaskIdRef.current) ??
      initialMessages
  );

  // Seed once if empty (per scoped key)
  useEffect(() => {
    if (didSeedRef.current) return;
    if (!setChatMessages || !getChatMessages) return;
    const current =
      getChatMessages(stableModeRef.current, stableTaskIdRef.current) || [];
    if (current.length === 0 && initialMessages?.length) {
      setChatMessages(
        stableModeRef.current,
        stableTaskIdRef.current,
        [...initialMessages]
      );
    }
    didSeedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setChatMessages, getChatMessages, initialMessages, scopedTaskKey]);

  // Single source for reading
  const msgs = useMemo(() => {
    if (controlledMessagesProp) return controlledMessagesProp;
    const persisted = getChatMessages?.(
      stableModeRef.current,
      stableTaskIdRef.current
    );
    if (Array.isArray(persisted) || Array.isArray(localMessages)) {
      return mergeById(persisted || [], localMessages || []);
    }
    return localMessages || [];
  }, [controlledMessagesProp, getChatMessages, localMessages]);

  // Never persist transient/base64 images
  const filterForPersist = useCallback((arr) => {
    return (arr || []).filter((m) => {
      if (m?.transient === true) return false;
      if (m?.type === "image" && typeof m.content === "string" && m.content.startsWith("data:")) {
        return false;
      }
      return true;
    });
  }, []);

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

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll
  const lastLenRef = useRef(0);
  useEffect(() => {
    if (!listRef.current) return;
    if (msgs?.length === lastLenRef.current && !typing && !externalTyping) return;
    lastLenRef.current = msgs?.length ?? 0;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight + 9999, behavior: "smooth" });
  }, [msgs, typing, externalTyping]);

  // Send text (do NOT send any userId; server must infer from auth)
  const handleSendText = useCallback(
    async (text) => {
      const t = (text || "").trim();
      if (!t || sending) return;

      setSending(true);
      const userMessage = formatMessage(t, "student");
      updateMessages((m) => [...m, userMessage]);

      try {
        if (onSendText) {
          await onSendText(t);
        } else {
          const { data } = await api.post("ai/chat", {
            question: t,
            ai_agent: "ChildAgent",
            mode: "general",
          });
          const aiMessage = formatMessage(
            data?.answer ?? "Entschuldigung, ich konnte keine Antwort generieren.",
            "agent"
          );
          updateMessages((m) => [...m, aiMessage]);
        }
      } catch (err) {
        updateMessages((m) => [
          ...m,
          formatMessage(
            "Es gab ein Problem beim Senden deiner Nachricht. Bitte versuche es später erneut.",
            "agent"
          ),
        ]);
        antdMessage.error(
          err?.response?.data?.message ||
            err?.message ||
            "Nachricht fehlgeschlagen."
        );
      } finally {
        setSending(false);
      }
    },
    [sending, onSendText, updateMessages, antdMessage]
  );

  const sendText = useCallback(() => {
    if (!draft.trim()) return;
    handleSendText(draft).then(() => {
      setDraft("");
      requestAnimationFrame(() => inputRef.current?.focus());
    });
  }, [draft, handleSendText]);

  const onMinimise = () => {
    if (typeof onClose === "function") onClose();
    else navigate(minimiseTo);
  };

  const startNewChat = useCallback(() => {
    clearChatMessages?.(stableModeRef.current, stableTaskIdRef.current);
    const seed =
      Array.isArray(initialMessages) && initialMessages.length > 0
        ? [...initialMessages]
        : [formatMessage("Hallo! Ich bin dein KI-Lernhelfer. Wie kann ich dir helfen?", "agent")];
    setChatMessages?.(stableModeRef.current, stableTaskIdRef.current, seed);
    setLocalMessages(seed);
    setDraft("");
    requestAnimationFrame(() =>
      listRef.current?.scrollTo({ top: 999999, behavior: "smooth" })
    );
  }, [clearChatMessages, setChatMessages, initialMessages]);

  /** ---------- RENDER CONTENT ---------- */
  const renderMessageContent = (message) => {
    const type = (message?.type || "text").toLowerCase();

    if (type === "image") {
      // Kept for safety if older messages exist with images
      const src = typeof message.content === "string" ? message.content : message?.content?.url || "";
      return (
        <div className="relative">
          <img
            src={src}
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
            <div className="text-xs text-gray-500 mt-1 truncate">{message.fileName}</div>
          )}
        </div>
      );
    }

    if (type === "table") {
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
                    <th className="text-left bg-gray-100 border border-gray-200 px-2 py-1 rounded-tl">Frage</th>
                    <th className="text-left bg-gray-100 border border-gray-200 px-2 py-1 rounded-tr">Antwort</th>
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

    // default: text/status; stringify unknown shapes safely
    const body =
      typeof message?.content === "string"
        ? message.content
        : message?.content == null
        ? ""
        : JSON.stringify(message.content, null, 2);

    return <div className="whitespace-pre-wrap">{body}</div>;
  };

  return (
    <div className={["relative w-full h-full bg-white overflow-hidden", className].join(" ")}>
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
        className="relative px-3 pt-4 pb-28 overflow-y-auto bg-[#f3f7eb]"
        style={{ height: `calc(100% - ${minimiseHeight}px)` }}
        aria-live="polite"
      >
        {msgs.map((message, idx) => {
          const roleLower = (message?.from ?? message?.sender ?? "agent").toLowerCase();
          const isStudent = roleLower === "student" || roleLower === "user";
          const isAgent = !isStudent;
          return (
            <div key={messageKey(message, idx)} className={`w-full flex ${isAgent ? "justify-start" : "justify-end"} mb-3`}>
              {isAgent && <img src={agentIcon} alt="Kibundo" className="w-7 h-7 rounded-full mr-2 self-end" />}
              <div className={`max-w-[78%] px-3 py-2 rounded-2xl shadow-sm ${isAgent ? "bg-white text-[#444]" : "bg-[#aee17b] text-[#1b3a1b]"}`}>
                {renderMessageContent(message)}
                <div className={`text-xs mt-1 ${isAgent ? "text-[#1b3a1b]/80" : "text-gray-600"}`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {!isAgent && <img src={studentIcon} alt="Schüler" className="w-7 h-7 rounded-full ml-2 self-end" />}
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

      {/* Composer (text only) */}
      <div
        className="absolute left-0 right-0 bottom-0 z-40"
        style={{ backgroundColor: "#b2c10a", paddingBottom: "env(safe-area-inset-bottom)" }}
        role="form"
        aria-label="Nachrichten-Eingabe"
      >
        <div className="mx-auto max-w-[900px] px-3 py-2 flex items-center gap-3">
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
                  draft.trim()
                ) {
                  e.preventDefault();
                  sendText();
                }
              }}
              placeholder="Schreibe eine Nachricht…"
              className="w-full bg-transparent outline-none text-[15px]"
              aria-label="Nachricht eingeben"
              disabled={sending}
            />
          </div>

          <button
            onClick={() => {
              if (!draft.trim()) return startNewChat();
              sendText();
            }}
            className={`w-10 h-10 grid place-items-center rounded-full transition-colors shadow-sm ${
              sending ? "opacity-70" : "hover:brightness-95"
            }`}
            style={{ backgroundColor: "#ff7a00" }}
            aria-label={sending ? "Wird gesendet..." : (draft.trim() ? "Nachricht senden" : "Neuen Chat starten")}
            type="button"
            disabled={sending}
          >
            {sending ? (
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
        </div>
      </div>
    </div>
  );
}
