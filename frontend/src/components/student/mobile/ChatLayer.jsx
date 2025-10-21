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
    
    // Return the first available key
    return keys[0];
  };

  const isDuplicate = (m) => {
    const content = String(m?.content || "").trim().toLowerCase();
    const from = (m?.from ?? m?.sender ?? "agent").toLowerCase();
    
    // Check against all possible keys
    const keys = [
      m?.id ? `id:${m.id}` : null,
      `content:text|${from}|${content}`,
      `simple:${from}|${content}`
    ].filter(Boolean);
    
    return keys.some(key => seen.has(key));
  };

  for (const arr of [a, b]) {
    if (!Array.isArray(arr)) continue;
    for (const m of arr) {
      if (!m || typeof m !== "object") continue;
      
      if (isDuplicate(m)) {
        console.log("🔍 [ChatLayer mergeById] Skipping duplicate message:", {
          content: typeof m.content === 'string' ? m.content.substring(0, 50) + "..." : String(m.content || ""),
          from: m.from,
          id: m.id
        });
        continue;
      }
      
      const key = createKey(m);
      if (key) seen.add(key);
      out.push(m);
    }
  }
  return out.sort(
    (x, y) => new Date(x.timestamp || 0) - new Date(y.timestamp || 0)
  );
};

const messageKey = (m, i) =>
  m?.id ??
  `${m?.from || "unk"}|${m?.timestamp || "t0"}|${String(m?.content ?? "").slice(
    0,
    64
  )}|${i}`;

export default function ChatLayer({
  messages: controlledMessagesProp,
  onMessagesChange: onMessagesChangeProp,
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
  
  const [backendMessages, setBackendMessages] = useState([]);
  const [loadingBackendMessages, setLoadingBackendMessages] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  // Fetch messages from backend
  const fetchBackendMessages = useCallback(async (convId) => {
    if (!convId || loadingBackendMessages) return;
    
    setLoadingBackendMessages(true);
    try {
      const response = await api.get(`/conversations/${convId}/messages`);
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

  // Always "general" mode — but we SCOPE the key PER STUDENT
  const mode = "general";
  const baseTaskId = "global";
  const studentId = authUser?.id || "anon";

  // AI agent state
  const [assignedAgent, setAssignedAgent] = useState({
    type: "ChildAgent",
    id: null,
    name: null,
  });

  // Scoped key: per-student thread
  const scopedTaskKey = useMemo(
    () => `${baseTaskId}::u:${studentId}`,
    [baseTaskId, studentId]
  );

  const stableModeRef = useRef(mode);
  const stableTaskIdRef = useRef(scopedTaskKey);

  // When the student changes, update the ref and allow reseeding/migration
  const didSeedRef = useRef(false);
  useEffect(() => {
    if (scopedTaskKey !== stableTaskIdRef.current) {
      stableTaskIdRef.current = scopedTaskKey;
      didSeedRef.current = false;
    }
  }, [scopedTaskKey]);

  // ── NEW: migrate anon → real student thread once we know studentId
  useEffect(() => {
    if (!getChatMessages || !setChatMessages) return;
    if (!studentId || studentId === "anon") return;

    const anonKey = `${baseTaskId}::u:anon`;
    const realKey = `${baseTaskId}::u:${studentId}`;

    try {
      const anonMsgs = getChatMessages(stableModeRef.current, anonKey) || [];
      const realMsgs = getChatMessages(stableModeRef.current, realKey) || [];

      if (anonMsgs.length && realMsgs.length === 0) {
        // Move anon history to the student's thread so it doesn't look like it "disappeared"
        const merged = mergeById(realMsgs, anonMsgs);
        setChatMessages(stableModeRef.current, realKey, merged);
        // optional: clear anon to avoid duplicate threads lingering
        clearChatMessages?.(stableModeRef.current, anonKey);
      }
    } catch (e) {
      console.warn("Chat migration (anon → student) failed:", e?.message);
    }
  }, [studentId, getChatMessages, setChatMessages, clearChatMessages, baseTaskId]);

  // Fetch backend messages when conversation ID changes
  useEffect(() => {
    if (conversationId) {
      fetchBackendMessages(conversationId);
    } else {
      setBackendMessages([]);
    }
  }, [conversationId, fetchBackendMessages]);

  // Fetch student's assigned AI agent on mount
  useEffect(() => {
    const fetchAssignedAgent = async () => {
      if (!studentId || studentId === "anon") return;
      try {
        const { data } = await api.get(`/student/${studentId}/assigned-agent`);
        if (data?.assigned_agent_type) {
          setAssignedAgent({
            type: data.assigned_agent_type,
            id: data.assigned_agent_id || null,
            name: data.assigned_agent?.name || data.assigned_agent_type,
          });
          console.log(
            "📌 Loaded assigned agent for student:",
            data.assigned_agent_type,
            data.assigned_agent?.name
          );
        }
      } catch (err) {
        console.warn(
          "Could not fetch assigned agent, using default ChildAgent:",
          err.message
        );
      }
    };
    fetchAssignedAgent();
  }, [studentId]);

  // Local UI buffer
  const [localMessages, setLocalMessages] = useState(
    controlledMessagesProp ??
      getChatMessages?.(stableModeRef.current, stableTaskIdRef.current) ??
      []
  );

  // ── NEW: when the scoped key changes (e.g., anon → real student), re-read persisted
  useEffect(() => {
    if (controlledMessagesProp) return; // controlled mode drives everything
    if (!getChatMessages) return;

    const persisted =
      getChatMessages(stableModeRef.current, scopedTaskKey) || [];

    if (persisted.length) {
      setLocalMessages(persisted);
      didSeedRef.current = true; // don't seed over existing
    } else if (!didSeedRef.current) {
      // If brand new thread, start with empty messages
      setLocalMessages([]);
      setChatMessages?.(
        stableModeRef.current,
        scopedTaskKey,
        []
      );
      didSeedRef.current = true;
    }
  }, [
    scopedTaskKey,
    getChatMessages,
    setChatMessages,
    controlledMessagesProp,
  ]);

  // Seed once if empty (for first mount)
  useEffect(() => {
    if (didSeedRef.current) return;
    if (!setChatMessages || !getChatMessages) return;
    const current =
      getChatMessages(stableModeRef.current, stableTaskIdRef.current) || [];
    if (current.length === 0) {
      setChatMessages(
        stableModeRef.current,
        stableTaskIdRef.current,
        []
      );
    }
    didSeedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setChatMessages, getChatMessages, scopedTaskKey]);

  // Single source for reading (merge backend with existing messages to avoid duplicates)
  const msgs = useMemo(() => {
    if (controlledMessagesProp) {
      console.log(
        "🔍 [ChatLayer] Using controlled messages:",
        controlledMessagesProp.length
      );
      return controlledMessagesProp;
    }
    
    // Get existing messages
    const persisted = getChatMessages?.(stableModeRef.current, scopedTaskKey) || [];
    const existingLocal = localMessages || [];
    
    // If we have backend messages, merge them with existing messages
    if (backendMessages.length > 0) {
      const merged = mergeById(backendMessages, [...persisted, ...existingLocal]);
      console.log(
        "🔍 [ChatLayer] Using merged backend messages:",
        merged.length,
        "(backend:",
        backendMessages.length,
        "persisted:",
        persisted.length,
        "local:",
        existingLocal.length,
        ")"
      );
      return merged;
    }
    
    // Fallback to local storage if no backend messages
    const merged = mergeById(persisted, existingLocal);
    console.log(
      "🔍 [ChatLayer] merged len:",
      merged.length,
      "(persisted:",
      persisted?.length || 0,
      "local:",
      existingLocal?.length || 0,
      ")"
    );
    return merged;
  }, [controlledMessagesProp, backendMessages, getChatMessages, localMessages, scopedTaskKey]);

  // Never persist transient/base64 images
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

  const updateMessages = useCallback(
    (next) => {
      const compute = (base) => (typeof next === "function" ? next(base) : next);

      if (controlledMessagesProp && onMessagesChangeProp) {
        const base = compute(controlledMessagesProp);
        if (base !== controlledMessagesProp) onMessagesChangeProp(base);
        return;
      }

      // Use the currently displayed messages (merged) as base to avoid dropping persisted history
      const currentBase = msgs || [];
      const nextVal = compute(currentBase);

      // Persist filtered copy under the CURRENT scoped key
      if (setChatMessages) {
        const persisted = filterForPersist(nextVal);
        setChatMessages(stableModeRef.current, scopedTaskKey, persisted);
      }

      // Keep local buffer in sync with what we display
      setLocalMessages(nextVal);
    },
    [
      controlledMessagesProp,
      onMessagesChangeProp,
      setChatMessages,
      filterForPersist,
      msgs,
      scopedTaskKey,
    ]
  );

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Track last sent message to prevent duplicates
  const lastSentMessageRef = useRef(null);
  const lastSentTimeRef = useRef(0);

  // Auto scroll
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

  // Send text (server infers user from auth)
  const handleSendText = useCallback(
    async (text) => {
      const t = (text || "").trim();
      if (!t || sending) return;

      // Prevent duplicate messages within 2 seconds
      const now = Date.now();
      if (
        lastSentMessageRef.current === t &&
        now - lastSentTimeRef.current < 2000
      ) {
        console.log("🚫 Preventing duplicate message:", t);
        return;
      }

      // Extra guard against accidental duplicates in recent history
      const recentStudentMessages = (msgs || [])
        .filter((m) => m?.from === "student" && m?.content === t)
        .slice(-2);
      if (recentStudentMessages.length > 0) {
        const lastMessage =
          recentStudentMessages[recentStudentMessages.length - 1];
        const messageTime = new Date(lastMessage.timestamp).getTime();
        if (now - messageTime < 3000) {
          console.log("🚫 Preventing duplicate message in chat history:", t);
          return;
        }
      }

      lastSentMessageRef.current = t;
      lastSentTimeRef.current = now;

      setSending(true);
      const userMessage = formatMessage(t, "student");

      // Only append immediately if it doesn't already exist
      const exists = (msgs || []).some(
        (m) =>
          m?.from === "student" &&
          m?.content === t &&
          new Date(m.timestamp).getTime() > now - 1000
      );
      if (!exists) updateMessages((m) => [...m, userMessage]);

      try {
        if (onSendText) {
          await onSendText(t);
        } else {
          const { data } = await api.post("ai/chat", {
            question: t,
            ai_agent: assignedAgent.type,
            agent_id: assignedAgent.id,
            mode: "general",
          });
          const aiMessage = formatMessage(
            data?.answer ??
              "Entschuldigung, ich konnte keine Antwort generieren.",
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
    [sending, onSendText, updateMessages, antdMessage, assignedAgent, msgs]
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

  // Safer "new chat": confirm before clearing anything
  const startNewChat = useCallback(() => {
    const ok =
      typeof window !== "undefined"
        ? window.confirm(
            "Neuen Chat starten? Der Verlauf für diesen Schüler wird gelöscht."
          )
        : true;
    if (!ok) return;

    clearChatMessages?.(stableModeRef.current, stableTaskIdRef.current);
    setChatMessages?.(stableModeRef.current, stableTaskIdRef.current, []);
    setLocalMessages([]);
    setDraft("");
    requestAnimationFrame(() =>
      listRef.current?.scrollTo({ top: 999999, behavior: "smooth" })
    );
  }, [
    clearChatMessages,
    setChatMessages,
  ]);

  /** ---------- RENDER CONTENT ---------- */
  const renderMessageContent = (message) => {
    const type = (message?.type || "text").toLowerCase();
    
    // Debug logging for analysis messages
    if (type === "table" || message?.content?.qa || message?.content?.extractedText) {
      console.log('🔍 [ChatLayer] Rendering analysis message:', {
        type,
        hasExtractedText: !!message?.content?.extractedText,
        hasQA: !!message?.content?.qa,
        qaLength: Array.isArray(message?.content?.qa) ? message.content.qa.length : 0
      });
    }

    if (type === "image") {
      const src =
        typeof message.content === "string"
          ? message.content
          : message?.content?.url || "";
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
            <div className="text-xs text-gray-500 mt-1 truncate">
              {message.fileName}
            </div>
          )}
        </div>
      );
    }

    if (type === "table" || type === "analysis" || message?.content?.qa || message?.content?.extractedText) {
      const extracted = message.content?.extractedText || message.content?.raw_text || message.content?.analysisText;
      const qa = Array.isArray(message.content?.qa) ? message.content.qa : 
                Array.isArray(message.content?.questions) ? message.content.questions : [];
      
      console.log('🔍 [ChatLayer] Analysis data:', {
        extracted: extracted ? extracted.substring(0, 100) + '...' : 'none',
        qaCount: qa.length,
        qa: qa.slice(0, 2) // Show first 2 Q&A pairs for debugging
      });
      
      return (
        <div className="w-full">
          {extracted && (
            <div className="mb-3">
              <div className="font-semibold mb-1 text-green-700">📄 Erkannter Text</div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200 whitespace-pre-wrap text-sm">
                {extracted}
              </div>
            </div>
          )}
          {qa.length > 0 && (
            <div>
              <div className="font-semibold mb-2 text-blue-700">
                ❓ Erkannte Fragen und Antworten ({qa.length})
              </div>
              <div className="bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="text-left px-3 py-2 font-medium text-blue-800">
                        Frage
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-blue-800">
                        Antwort
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {qa.map((q, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-25'}>
                        <td className="align-top px-3 py-2 whitespace-pre-wrap border-b border-blue-100">
                          <div className="font-medium text-gray-800">
                            {q?.text || q?.question || "-"}
                          </div>
                        </td>
                        <td className="align-top px-3 py-2 whitespace-pre-wrap border-b border-blue-100">
                          <div className="text-gray-700">
                            {q?.answer || "(keine Antwort)"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!extracted && qa.length === 0 && (
            <div className="text-gray-500 italic text-sm">
              Keine analysierbaren Inhalte gefunden.
            </div>
          )}
        </div>
      );
    }

    const body =
      typeof message?.content === "string"
        ? message.content
        : message?.content == null
        ? ""
        : JSON.stringify(message.content, null, 2);

    return <div className="whitespace-pre-wrap">{body}</div>;
  };

  return (
    <div
      className={["relative w-full h-full bg-white overflow-hidden", className].join(
        " "
      )}
    >
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
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && onMinimise()
        }
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
            <div
              key={messageKey(message, idx)}
              className={`w-full flex ${
                isAgent ? "justify-start" : "justify-end"
              } mb-3`}
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
                  isAgent
                    ? "bg-white text-[#444]"
                    : "bg-[#aee17b] text-[#1b3a1b]"
                }`}
              >
                {renderMessageContent(message)}
                <div
                  className={`text-xs mt-1 ${
                    isAgent ? "text-[#1b3a1b]/80" : "text-gray-600"
                  }`}
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

      {/* Composer (text only) */}
      <div
        className="absolute left-0 right-0 bottom-0 z-40"
        style={{
          backgroundColor: "#b2c10a",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
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
              if (draft.trim()) {
                sendText();
              } else {
                startNewChat();
              }
            }}
            className={`w-10 h-10 grid place-items-center rounded-full transition-colors shadow-sm ${
              sending ? "opacity-70" : "hover:brightness-95"
            }`}
            style={{ backgroundColor: "#ff7a00" }}
            aria-label={
              sending
                ? "Wird gesendet..."
                : draft.trim()
                ? "Nachricht senden"
                : "Neuen Chat starten"
            }
            type="button"
            disabled={sending}
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : draft.trim() ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="#ffffff"
              >
                <path d="M21.44 2.56a1 1 0 0 0-1.05-.22L3.6 9.06a1 1 0 0 0 .04 1.87l6.9 2.28 2.3 6.91a1 1 0 0 0 1.86.03l6.74-16.78a1 1 0 0 0-.99-1.81ZM11.8 13.18l-4.18-1.38 9.68-4.04-5.5 5.42Z" />
              </svg>
            ) : (
              // With the safety above, this icon won't trigger reset anymore.
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="#ffffff"
              >
                <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
              </svg>
            )}
          </button>

          {/* If you still want a manual "Reset" action, keep it explicit: */}
          {/* <button onClick={startNewChat} ...>Reset</button> */}
        </div>
      </div>
    </div>
  );
}
