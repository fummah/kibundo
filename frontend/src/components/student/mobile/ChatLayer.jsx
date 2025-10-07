// src/components/student/mobile/ChatLayer.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "antd";
import api from "@/api/axios";
import { CheckOutlined } from "@ant-design/icons";
import { useChatDock } from "@/context/ChatDockContext.jsx";

// 🔽 NEW: safe renderer for any message.content shape
import { MessageBody } from "@/components/chats/MessageBody.jsx";

// Assets
import minimiseBg from "@/assets/backgrounds/minimise.png";
import agentIcon from "@/assets/mobile/icons/agent-icon.png";
import cameraIcon from "@/assets/mobile/icons/camera.png";
import galleryIcon from "@/assets/mobile/icons/galary.png";
import emojiIcon from "@/assets/mobile/icons/imoji.png";
import studentIcon from "@/assets/mobile/icons/stud-icon.png";
import agentChats from "@/assets/mobile/icons/agent-chats.png";

// Analytics + ASR
import { track } from "@/lib/analytics";
import useASR from "@/lib/voice/useASR";

// ✅ Keep this as a constant string (no JSX at top-level!)
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
  sender: from, // compatibility with payloads using `sender`
  type,
  content,
  timestamp: new Date().toISOString(),
  ...meta,
});

// Merge helper that preserves items across sources and avoids drops when persistence lags
const mergeById = (a = [], b = []) => {
  const seen = new Set();
  const out = [];
  for (const arr of [a, b]) {
    if (!Array.isArray(arr)) continue;
    for (const m of arr) {
      const key = m?.id ?? `${m?.from}|${m?.timestamp}|${String(m?.content).slice(0,64)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }
  }
  return out;
};

// Stable key generator for React list items (handles missing/duplicate ids)
const messageKey = (m, i) =>
  m?.id ?? `${m?.from || "unk"}|${m?.timestamp || "t0"}|${String(m?.content ?? "").slice(0,64)}|${i}`;

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
  onSendMedia,
  isTyping: externalTyping = false,
  onClose,
  minimiseTo = "/student/homework",
  minimiseHeight = 54,
  className = "",
}) {
  const navigate = useNavigate();
  const { message: antdMessage } = App.useApp();
  const {
    state: dockState,
    markHomeworkDone,
    getChatMessages,
    setChatMessages,
    clearChatMessages,
  } = useChatDock?.() ?? {};

  const mode = dockState?.mode || "general";
  const taskId = dockState?.task?.id || null;
  // Freeze the chat key for the entire lifetime of this layer mount.
  const stableModeRef = useRef(mode);
  const stableTaskIdRef = useRef(taskId);

  // Local fallback when not persisted/controlled
  const [localMessages, setLocalMessages] = useState(
    controlledMessagesProp ?? getChatMessages?.(stableModeRef.current, stableTaskIdRef.current) ?? initialMessages
  );

  // ----- SEED PERSISTENCE ONCE (NO LOOPS) -----
  const didSeedRef = useRef(false);
  useEffect(() => {
    if (didSeedRef.current) return;
    if (!setChatMessages || !getChatMessages) return;

    const current = getChatMessages(stableModeRef.current, stableTaskIdRef.current) || [];
    if (current.length === 0 && initialMessages?.length) {
      setChatMessages(stableModeRef.current, stableTaskIdRef.current, [...initialMessages]);
    }
    didSeedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, taskId, setChatMessages, getChatMessages, initialMessages]);
  // --------------------------------------------

  // Single source of truth for reading
  const msgs = useMemo(() => {
    if (controlledMessagesProp) return controlledMessagesProp;
    const persisted = getChatMessages?.(stableModeRef.current, stableTaskIdRef.current);
    if (Array.isArray(persisted) || Array.isArray(localMessages)) {
      // Merge both sources so locally-added messages don't disappear if persistence lags
      return mergeById(persisted || [], localMessages || []);
    }
    return localMessages || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledMessagesProp, getChatMessages, localMessages]);

  // ---------- SAFE WRITER (no render-time churn) ----------
  const updateMessages = useCallback(
    (next) => {
      // Controlled usage from parent component
      if (controlledMessagesProp && onMessagesChangeProp) {
        const base =
          typeof next === "function" ? next(controlledMessagesProp) : next;
        // Only call if actually changed to avoid parent loops
        if (base !== controlledMessagesProp) onMessagesChangeProp(base);
        return;
      }

      // Persisted context
      if (setChatMessages && getChatMessages) {
        const current = getChatMessages(stableModeRef.current, stableTaskIdRef.current) || [];
        // Use merged view as base to avoid losing items during concurrent writes
        const baseArr = mergeById(current, Array.isArray(msgs) ? msgs : []);
        const nextVal = typeof next === "function" ? next(baseArr) : next;
        // Write to context store
        if (nextVal !== current) {
          setChatMessages(stableModeRef.current, stableTaskIdRef.current, nextVal);
        }
        // Also mirror into local state so UI never blanks between writes
        setLocalMessages(nextVal);
        return;
      }

      // Local state fallback
      setLocalMessages((curr) =>
        typeof next === "function" ? next(curr) : next
      );
    },
    [
      controlledMessagesProp,
      onMessagesChangeProp,
      setChatMessages,
      getChatMessages,
      mode,
      taskId,
      msgs,
    ]
  );
  // --------------------------------------------------------

  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [uploading, setUploading] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const objectUrlsRef = useRef([]);

  const { listening, start, stop, reset } = useASR?.({ lang: "de-DE" }) ?? {};
  const showDone = dockState?.mode === "homework";

  // Smooth autoscroll without causing loops
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

  // cleanup blobs
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  // Send text
  const handleSendText = useCallback(
    async (text) => {
      const t = (text || "").trim();
      if (!t || sending) return;

      setSending(true);
      const userMessage = formatMessage(t, "student");
  
      updateMessages((m) => [...m, userMessage]);
      track?.("chat_message_send", { length: t.length });

      try {
        if (onSendText) {
          await onSendText(t);
        } else {
          const { data } = await api.post("/ai/chat", {
            question: t,
            ai_agent: "ChildAgent",
          });
          const aiMessage = formatMessage(
            data?.answer ??
              "Entschuldigung, ich konnte keine Antwort generieren.",
            "agent"
          );
          updateMessages((m) => [...m, aiMessage]);
        }
      } catch (err) {
        const errorMessage = formatMessage(
          "Es gab ein Problem beim Senden deiner Nachricht. Bitte versuche es später erneut.",
          "agent"
        );
        updateMessages((m) => [...m, errorMessage]);
        antdMessage.error("Nachricht konnte nicht gesendet werden");
      } finally {
        setSending(false);
      }
    },
    [sending, onSendText, updateMessages, antdMessage]
  );

  // Send media
  const handleMediaUpload = useCallback(
    async (files) => {
      if (!files.length || uploading) return;
      setUploading(true);

      const newMessages = [];
      const formData = new FormData();

      // Read files as Data URLs for reliable immediate preview
      const readAsDataURL = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      for (const file of files) {
        try {
          const dataUrl = await readAsDataURL(file);
          const message = {
            id: Date.now() + Math.random().toString(36).slice(2, 9),
            from: "student",
            sender: "student",
            type: "image",
            content: dataUrl, // stable preview within session
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          };
          newMessages.push(message);
        } catch {}
        formData.append("files", file);
      }

      // Add loading message once, after enqueuing previews
      const loadingMessage = formatMessage("Ich analysiere dein Bild...", "agent");
      updateMessages((m) => [...m, ...newMessages, loadingMessage]);

      try {
        if (onSendMedia) {
          await onSendMedia(files);
        } else {
          const { data } = await api.post("/ai/analyze-image", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          updateMessages((m) => {
            const arr = [...m];
            const idx = arr.findIndex((msg) => msg.id === loadingMessage.id);
            if (idx !== -1) {
              // data.analysis can be string or object — MessageBody will handle either
              arr[idx] = formatMessage(
                data?.analysis ||
                  "Ich habe das Bild erhalten, aber konnte es nicht analysieren.",
                "agent"
              );
            }
            return arr;
          });
        }
      } catch (error) {
        console.error("Error uploading media:", error);
        updateMessages((m) => {
          const arr = [...m];
          const idx = arr.findIndex((msg) => msg.id === loadingMessage.id);
          if (idx !== -1) {
            arr[idx] = formatMessage(
              "Entschuldigung, beim Hochladen des Bildes ist ein Fehler aufgetreten. Bitte versuche es später erneut.",
              "agent"
            );
          }
          return arr;
        });
        antdMessage.error("Bild konnte nicht hochgeladen werden");
      } finally {
        setUploading(false);
      }
    },
    [onSendMedia, updateMessages, antdMessage, uploading]
  );

  const sendText = useCallback(() => {
    if (!draft.trim()) return;
    handleSendText(draft).then(() => {
      setDraft("");
      requestAnimationFrame(() => inputRef.current?.focus());
    });
  }, [draft, handleSendText]);

  const onCamera = () => cameraInputRef.current?.click();
  const onGallery = () => galleryInputRef.current?.click();
  const onEmoji = () => setShowEmoji((p) => !p);
  const onMinimise = () => {
    if (typeof onClose === "function") onClose();
    else navigate(minimiseTo);
  };

  // Start a new chat: clear persistence for current key and reseed greeting
  const startNewChat = useCallback(() => {
    const modeKey = stableModeRef.current;
    const taskKey = stableTaskIdRef.current;
    clearChatMessages?.(modeKey, taskKey);
    const seed = Array.isArray(initialMessages) && initialMessages.length > 0
      ? [...initialMessages]
      : [formatMessage("Hallo! Ich bin dein KI-Lernhelfer. Wie kann ich dir bei deinen Hausaufgaben helfen?", "agent")];
    setChatMessages?.(modeKey, taskKey, seed);
    setLocalMessages(seed);
    setDraft("");
    setTyping(false);
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: 999999, behavior: "smooth" }));
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

  // ⬇️ Render message bodies safely (strings, objects, arrays)
  const renderMessageContent = (message) => {
    switch (message.type) {
      case "image":
        return (
          <div className="relative">
            <img
              src={message.content}
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
      default:
        // ✅ This handles strings, objects (extractedText/qa/analysis), arrays, etc.
        return <MessageBody content={message.content} />;
    }
  };

  return (
    <div
      className={[
        "relative w-full h-full bg-white overflow-hidden",
        className,
      ].join(" ")}
    >
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleGalleryChange}
        className="hidden"
      />

      {/* Minimize strip (visual only, sits on top) */}
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
            <img src={agentIcon} alt="Kibundo" className="w-7 h-7 rounded-full mr-2 self-end" />
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

      {/* Emoji picker */}
      {showEmoji && (
        <div
          className="absolute bottom-20 left-0 right-0 bg-white shadow-md p-3 grid grid-cols-6 gap-2 text-xl z-50"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {["😀", "😂", "🥳", "🤔", "👍", "❤️"].map((emo) => (
            <button
              key={emo}
              type="button"
              onClick={() => {
                setDraft((d) => d + emo);
                setShowEmoji(false);
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
              className="hover:bg-neutral-100 rounded"
              aria-label={`Emoji ${emo}`}
            >
              {emo}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
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
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-10 h-10 grid place-items-center bg-white/30 rounded-full"
            aria-label="Kamera öffnen"
            type="button"
            disabled={sending || uploading}
          >
            <img src={cameraIcon} alt="" className="w-6 h-6" />
          </button>

          <button
            onClick={() => galleryInputRef.current?.click()}
            className="w-10 h-10 grid place-items-center bg-white/30 rounded-full"
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
              onKeyDown={(e) => e.key === "Enter" && sendText()}
              placeholder="Schreibe eine Nachricht…"
              className="w-full bg-transparent outline-none text-[15px]"
              aria-label="Nachricht eingeben"
              disabled={sending || uploading}
            />
          </div>

          <button
            onClick={() => setShowEmoji((p) => !p)}
            className={`w-10 h-10 grid place-items-center rounded-full transition-colors shadow-sm ${
              sending || uploading ? "opacity-70" : "hover:brightness-95"
            }`}
            style={{ backgroundColor: "#ff7a00" }}
            aria-label="Emoji auswählen"
            type="button"
            disabled={sending || uploading}
          >
            {/* White emoji icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-6 h-6"
              fill="#ffffff"
            >
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-3.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 18a6 6 0 0 1-5.196-3h10.392A6 6 0 0 1 12 18Z" />
            </svg>
          </button>

          {showDone && (
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

          <button
            onClick={() => {
              const hasText = !!draft.trim();
              if (hasText) {
                sendText();
              } else {
                startNewChat();
              }
            }}
            className={`w-10 h-10 grid place-items-center rounded-full transition-colors shadow-sm ${
              sending || uploading ? "opacity-70" : "hover:brightness-95"
            }`}
            style={{ backgroundColor: "#ff7a00" }}
            aria-label={sending ? "Wird gesendet..." : (draft.trim() ? "Nachricht senden" : "Neuen Chat starten")}
            type="button"
            disabled={sending || uploading}
          >
            {sending || uploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              draft.trim() ? (
                // Paper plane icon white on orange background (send)
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="#ffffff"
                >
                  <path d="M21.44 2.56a1 1 0 0 0-1.05-.22L3.6 9.06a1 1 0 0 0 .04 1.87l6.9 2.28 2.3 6.91a1 1 0 0 0 1.86.03l6.74-16.78a1 1 0 0 0-.99-1.81ZM11.8 13.18l-4.18-1.38 9.68-4.04-5.5 5.42Z" />
                </svg>
              ) : (
                // Plus icon white on orange background (new chat)
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="#ffffff"
                >
                  <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
                </svg>
              )
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
