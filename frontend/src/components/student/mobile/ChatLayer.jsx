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
  
  // Always "general" mode — but we SCOPE the key PER STUDENT
  const mode = "general";
  const baseTaskId = "global";
  const studentId = authUser?.id || "anon";
  
  const [backendMessages, setBackendMessages] = useState([]);
  const [loadingBackendMessages, setLoadingBackendMessages] = useState(false);
  
  // 🔥 Load conversationId from localStorage on mount
  const conversationIdKey = `kibundo.convId.${mode}.${studentId}`;
  const [conversationId, setConversationId] = useState(() => {
    try {
      const saved = localStorage.getItem(conversationIdKey);
      if (saved) {
        return parseInt(saved, 10);
      }
    } catch (e) {
      // Failed to load conversationId
    }
    return null;
  });

  // AI agent state - MOVED BEFORE fetchBackendMessages to fix initialization order
  const [assignedAgent, setAssignedAgent] = useState({
    type: "Kibundo",
    id: null,
    name: "Kibundo",
  });

  // Track which conversations we've already fetched
  const fetchedConversationsRef = useRef(new Set());
  
  // Fetch messages from backend
  const fetchBackendMessages = useCallback(async (convId) => {
    if (!convId) return;
    
    // Prevent duplicate fetches for the same conversation
    if (fetchedConversationsRef.current.has(convId)) {
      return;
    }
    
    fetchedConversationsRef.current.add(convId);
    
    setLoadingBackendMessages(true);
    try {
      const response = await api.get(`/conversations/${convId}/messages`, {
        withCredentials: true,
      });
      if (response?.data && Array.isArray(response.data)) {
        const formattedMessages = response.data.map(msg => {
          // 🔥 Extract agent name from meta field (stored by backend)
          const agentName = msg?.meta?.agentName || msg?.agent_name || assignedAgent.name || "Kibundo";
          
          return formatMessage(
            msg.content || "",
            msg.sender === "student" ? "student" : "agent",
            "text",
            { 
              id: msg.id,
              timestamp: msg.created_at || msg.timestamp,
              agentName: agentName
            }
          );
        });
        setBackendMessages(formattedMessages);
      }
    } catch (error) {
      console.error("❌ CHATLAYER: Error fetching messages:", error.message);
      setBackendMessages([]);
      // Remove from fetched set so we can retry later
      fetchedConversationsRef.current.delete(convId);
    } finally {
      setLoadingBackendMessages(false);
    }
  }, [assignedAgent.name]);

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
      // Chat migration failed
    }
  }, [studentId, getChatMessages, setChatMessages, clearChatMessages, baseTaskId]);

  // 🔥 Save conversationId to localStorage whenever it changes
  useEffect(() => {
    if (conversationId) {
      try {
        localStorage.setItem(conversationIdKey, conversationId.toString());
      } catch (e) {
        // Failed to save conversationId
      }
    }
  }, [conversationId, conversationIdKey]);

  // Fetch backend messages when conversation ID changes (ONLY in uncontrolled mode)
  useEffect(() => {
    // 🔥 Don't fetch if in controlled mode (parent manages messages)
    if (controlledMessagesProp) {
      return;
    }
    
    if (conversationId) {
      fetchBackendMessages(conversationId);
    } else {
      setBackendMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, controlledMessagesProp]); // Only depend on conversationId, not the fetch function

  // Fetch selected AI agent from AIAgent.jsx settings
  useEffect(() => {
    const fetchSelectedAgent = async () => {
      try {
        // Only fetch if authenticated
        const token = localStorage.getItem('kibundo_token') || sessionStorage.getItem('kibundo_token');
        if (!token) {
          return;
        }
        
        const { data } = await api.get('/aisettings', {
          validateStatus: (status) => status < 500, // Don't throw on 403/404
          withCredentials: true,
        });
        if (data?.child_default_ai) {
          const selectedAgent = data.child_default_ai;
          setAssignedAgent({
            type: selectedAgent,
            id: null,
            name: selectedAgent,
          });
        }
      } catch (err) {
        console.error("❌ CHATLAYER: Failed to fetch AI agent:", err);
      }
    };
    fetchSelectedAgent();
  }, []);

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

  // Single source for reading - backend is source of truth when available
  const msgs = useMemo(() => {
    if (controlledMessagesProp) {
      return controlledMessagesProp;
    }
    
    // 🔥 If we have backend messages, USE ONLY THEM - they are the complete source of truth
    if (backendMessages.length > 0) {
      return backendMessages; // Don't merge - backend is complete conversation history
    }
    
    // 🔥 Otherwise, use localStorage OR local state (when backend not yet loaded)
    const persisted = getChatMessages?.(stableModeRef.current, scopedTaskKey) || [];
    const merged = mergeById(persisted, localMessages);
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
  const sendingInProgressRef = useRef(false); // 🔥 Prevent concurrent sends

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
      if (!t || sending || sendingInProgressRef.current) {
        return;
      }
      
      // 🔥 LOCK: Prevent any concurrent sends
      sendingInProgressRef.current = true;

      // Prevent duplicate messages within 2 seconds
      const now = Date.now();
      if (
        lastSentMessageRef.current === t &&
        now - lastSentTimeRef.current < 2000
      ) {
        sendingInProgressRef.current = false; // 🔥 UNLOCK
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
          sendingInProgressRef.current = false; // 🔥 UNLOCK
          return;
        }
      }

      lastSentMessageRef.current = t;
      lastSentTimeRef.current = now;

      setSending(true);
      setTyping(true); // Show thinking indicator in chat area
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
            mode: "general", // ✅ Changed from "homework" to "general" for general chat
            student_id: studentId,
            conversationId: conversationId, // 🔥 Send conversation ID for memory
          }, {
            withCredentials: true,
          });
          
          // 🔥 Update conversation ID if backend returns a new one (first message)
          if (data?.conversationId && data.conversationId !== conversationId) {
            setConversationId(data.conversationId);
          } else if (data?.conversationId) {
            // 🔥 Refetch messages to get the latest from backend
            fetchedConversationsRef.current.delete(data.conversationId); // Clear cache
            fetchBackendMessages(data.conversationId); // Refetch
          }
          
          const aiMessage = formatMessage(
            data?.answer ??
              "Entschuldigung, ich konnte keine Antwort generieren.",
            "agent",
            "text",
            { agentName: data?.agentName || assignedAgent.name || "Kibundo" }
          );
          updateMessages((m) => [...m, aiMessage]);
        }
      } catch (err) {
        
        updateMessages((m) => [
          ...m,
          formatMessage(
            "Es gab ein Problem beim Senden deiner Nachricht. Bitte versuche es später erneut.",
            "agent",
            "text",
            { agentName: assignedAgent.name || "Kibundo" }
          ),
        ]);
        antdMessage.error(
          err?.response?.data?.message ||
            err?.message ||
            "Nachricht fehlgeschlagen."
        );
      } finally {
        setSending(false);
        setTyping(false); // Hide thinking indicator when done
        sendingInProgressRef.current = false; // 🔥 UNLOCK
      }
    },
    [sending, onSendText, updateMessages, antdMessage, assignedAgent, msgs, conversationId, studentId]
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

  // Start new chat directly without confirmation
  const startNewChat = useCallback(() => {
    // 🔥 Clear conversation ID to start fresh
    setConversationId(null);
    setBackendMessages([]);
    try {
      localStorage.removeItem(conversationIdKey);
    } catch (e) {
      // Failed to clear conversationId
    }
    
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
    conversationIdKey,
  ]);

  /** ---------- RENDER CONTENT ---------- */
  const renderMessageContent = (message) => {
    const type = (message?.type || "text").toLowerCase();
    

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

      {/* Messages - Responsive padding */}
      <div
        ref={listRef}
        className="relative px-2 sm:px-3 pt-3 sm:pt-4 pb-24 sm:pb-28 overflow-y-auto bg-[#f3f7eb]"
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
                <div className="flex flex-col mr-2 self-end">
                  <img
                    src={agentIcon}
                    alt="Kibundo"
                    className="w-7 h-7 rounded-full"
                  />
                  {message?.agentName && (
                    <div className="text-xs text-[#1b3a1b]/60 mt-1 text-center max-w-[60px] break-words">
                      {message.agentName}
                    </div>
                  )}
                </div>
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
                <div className="flex flex-col ml-2 self-end">
                  <img
                    src={studentIcon}
                    alt="Schüler"
                    className="w-7 h-7 rounded-full"
                  />
                  <div className="text-xs text-[#1b3a1b]/60 mt-1 text-center max-w-[60px] break-words">
                    You
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {(typing || externalTyping) && (
          <div className="w-full flex justify-start mb-3">
            <div className="flex flex-col mr-2 self-end">
              <img
                src={agentIcon}
                alt={assignedAgent.name || "Kibundo"}
                className="w-7 h-7 rounded-full"
              />
              <div className="text-xs text-gray-600 mt-1 text-center max-w-[60px] break-words">
                {assignedAgent.name || "Kibundo"}
              </div>
            </div>
            <div className="max-w-[78%] px-3 py-2 rounded-2xl shadow-sm bg-white border border-gray-200">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                <div
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Composer (text only) - Responsive */}
      <div
        className="absolute left-0 right-0 bottom-0 z-40"
        style={{
          backgroundColor: "#b2c10a",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          paddingTop: "0.5rem",
        }}
        role="form"
        aria-label="Nachrichten-Eingabe"
      >
        <div className="mx-auto max-w-[900px] px-2 sm:px-3 py-2 flex items-center gap-2 sm:gap-3">
          <div className="flex-1 h-10 sm:h-11 flex items-center px-2 sm:px-3 bg-white rounded-full">
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
              className="w-full bg-transparent outline-none text-sm sm:text-[15px]"
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
            className={`w-10 h-10 sm:w-11 sm:h-11 grid place-items-center rounded-full transition-colors shadow-sm ${
              sending ? "opacity-70" : "hover:brightness-95 active:scale-95"
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
