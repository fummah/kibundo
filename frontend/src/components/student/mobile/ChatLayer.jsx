// src/components/student/mobile/ChatLayer.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "antd";
import api from "@/api/axios";
import { CheckOutlined } from "@ant-design/icons";
import { useChatDock } from "@/context/ChatDockContext.jsx";

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
  } = useChatDock?.() ?? {};

  const mode = dockState?.mode || "general";
  const taskId = dockState?.task?.id || null;

  // Local fallback when not persisted/controlled
  const [localMessages, setLocalMessages] = useState(
    controlledMessagesProp ?? getChatMessages?.(mode, taskId) ?? initialMessages
  );

  // ----- SEED PERSISTENCE ONCE (NO LOOPS) -----
  const didSeedRef = useRef(false);
  useEffect(() => {
    if (didSeedRef.current) return;
    if (!setChatMessages || !getChatMessages) return;

    const current = getChatMessages(mode, taskId) || [];
    if (current.length === 0 && initialMessages?.length) {
      setChatMessages(mode, taskId, [...initialMessages]);
    }
    didSeedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, taskId, setChatMessages, getChatMessages, initialMessages]);
  // --------------------------------------------

  // Single source of truth for reading
  const msgs = useMemo(() => {
    if (controlledMessagesProp) return controlledMessagesProp;
    const persisted = getChatMessages?.(mode, taskId);
    if (Array.isArray(persisted)) {
      // Prefer whichever currently holds more items to avoid flicker when persistence is empty
      const pLen = persisted.length;
      const lLen = Array.isArray(localMessages) ? localMessages.length : 0;
      return pLen >= lLen ? persisted : localMessages;
    }
    return localMessages;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledMessagesProp, getChatMessages, mode, taskId, localMessages]);

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
        const current = getChatMessages(mode, taskId) || [];
        // If persistence is empty (first write), fall back to currently rendered msgs
        const baseArr = current.length > 0 ? current : (Array.isArray(msgs) ? msgs : []);
        const nextVal = typeof next === "function" ? next(baseArr) : next;
        // Write to context store
        if (nextVal !== current) setChatMessages(mode, taskId, nextVal);
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
            data?.answer ||
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
              src={message.content}
              alt={message.fileName || "Hochgeladenes Bild"}
              className="max-w-full max-h-64 rounded-lg"
              onError={(e) => {
                const img = e.currentTarget;
                // prevent endless onError loops
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
        return <div className="whitespace-pre-wrap">{message.content}</div>;
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
        {msgs.map((message) => {
          const roleLower = (message?.from ?? message?.sender ?? "agent").toLowerCase();
          const isStudent = roleLower === "student" || roleLower === "user";
          const isAgent = !isStudent;
          return (
            <div
              key={message.id}
              className={`w-full flex ${isAgent ? "justify-end" : "justify-start"} mb-3`}
            >
              {!isAgent && (
                <img
                  src={studentIcon}
                  alt="Schüler"
                  className="w-7 h-7 rounded-full mr-2 self-end"
                />
              )}

              <div
                className={`max-w-[78%] px-3 py-2 rounded-2xl shadow-sm ${
                  isAgent ? "bg-[#aee17b] text-[#1b3a1b]" : "bg-white text-[#444]"
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

              {isAgent && (
                <img
                  src={agentIcon}
                  alt="Kibundo"
                  className="w-7 h-7 rounded-full ml-2 self-end"
                />
              )}
            </div>
          );
        })}

        {(typing || externalTyping) && (
          <div className="w-full flex justify-end mb-3">
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
            <img src={agentIcon} alt="Kibundo" className="w-7 h-7 rounded-full ml-2 self-end" />
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
            className="w-10 h-10 grid place-items-center bg-white/30 rounded-full"
            aria-label="Emoji auswählen"
            type="button"
            disabled={sending || uploading}
          >
            <img src={emojiIcon} alt="" className="w-6 h-6" />
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
            onClick={sendText}
            className={`w-11 h-11 grid place-items-center rounded-full ${
              sending || uploading ? "opacity-50" : ""
            }`}
            style={{ backgroundColor: "#ff7a00" }}
            aria-label={sending ? "Wird gesendet..." : "Nachricht senden"}
            type="button"
            disabled={sending || uploading || !draft.trim()}
          >
            {sending || uploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <img src={agentChats} alt="Senden" className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
