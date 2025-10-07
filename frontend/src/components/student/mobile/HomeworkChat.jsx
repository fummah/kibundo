// src/components/student/mobile/HomeworkChat.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App, Tabs } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import api from "@/api/axios"; // still used for image analyze if needed elsewhere
import { useChatDock } from "@/context/ChatDockContext.jsx";

// Assets (reuse from ChatLayer for identical look)
import minimiseBg from "@/assets/backgrounds/minimise.png";
import agentIcon from "@/assets/mobile/icons/agent-icon.png";
import cameraIcon from "@/assets/mobile/icons/camera.png";
import galleryIcon from "@/assets/mobile/icons/galary.png";
import studentIcon from "@/assets/mobile/icons/stud-icon.png";

// Local helpers
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

export default function HomeworkChat({
  messages: controlledMessagesProp,
  onMessagesChange: onMessagesChangeProp,
  initialMessages = [
    formatMessage(
      "Lade ein Foto deiner Hausaufgabe hoch, oder frag mich etwas darüber!",
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
  const { state: dockState, markHomeworkDone, getChatMessages, setChatMessages, clearChatMessages } =
    useChatDock?.() ?? {};

  const taskId = dockState?.task?.id || null;
  const stableModeRef = useRef("homework");
  const stableTaskIdRef = useRef(taskId);

  // Single interface: uploads + chatbot in one composer
  const BASE = "http://localhost:3001";
  const scanId = dockState?.task?.scanId || dockState?.task?.id || null;
  const userId = dockState?.task?.userId || null;
  const [conversationId, setConversationId] = useState(dockState?.task?.conversationId || null);

  const [localMessages, setLocalMessages] = useState(
    controlledMessagesProp ?? getChatMessages?.(stableModeRef.current, stableTaskIdRef.current) ?? initialMessages
  );

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
  }, [setChatMessages, getChatMessages, initialMessages]);

  const msgs = useMemo(() => {
    if (controlledMessagesProp) return controlledMessagesProp;
    const persisted = getChatMessages?.(stableModeRef.current, stableTaskIdRef.current);
    if (Array.isArray(persisted) || Array.isArray(localMessages)) {
      return mergeById(persisted || [], localMessages || []);
    }
    return localMessages || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledMessagesProp, getChatMessages, localMessages]);

  const updateMessages = useCallback(
    (next) => {
      if (controlledMessagesProp && onMessagesChangeProp) {
        const base = typeof next === "function" ? next(controlledMessagesProp) : next;
        if (base !== controlledMessagesProp) onMessagesChangeProp(base);
        return;
      }
      if (setChatMessages && getChatMessages) {
        const current = getChatMessages(stableModeRef.current, stableTaskIdRef.current) || [];
        const baseArr = mergeById(current, Array.isArray(msgs) ? msgs : []);
        const nextVal = typeof next === "function" ? next(baseArr) : next;
        if (nextVal !== current) {
          setChatMessages(stableModeRef.current, stableTaskIdRef.current, nextVal);
        }
        setLocalMessages(nextVal);
        return;
      }
      setLocalMessages((curr) => (typeof next === "function" ? next(curr) : next));
    },
    [controlledMessagesProp, onMessagesChangeProp, setChatMessages, getChatMessages, msgs]
  );

  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [uploading, setUploading] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight + 9999, behavior: "smooth" });
  }, [msgs, typing, externalTyping]);

  // Helpers to normalize server messages -> internal format
  const toArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.messages)) return data.messages;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  };

  const mapServerToInternal = (arr) =>
    toArray(arr).map((m) =>
      formatMessage(
        m?.content ?? "",
        (m?.sender || "agent").toLowerCase() === "student" ? "student" : "agent",
        "text",
        {}
      )
    );

  // Text send (Chatbot tab) using conversations API
  const handleSendText = useCallback(
    async (text) => {
      const t = (text || "").trim();
      if (!t || sending) return;
      setSending(true);
      const optimisticMsg = formatMessage(t, "student");
      updateMessages((m) => [...m, optimisticMsg]);
      try {
        if (onSendText) {
          await onSendText(t);
          setSending(false);
          return;
        }

        // Build URL properly: create vs. existing conversation
        let url = conversationId
          ? `${BASE}/api/ai/conversations/${conversationId}/message`
          : `${BASE}/api/ai/conversations/message`;
        let resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, message: t, scanId }),
        });

        if (!resp.ok && conversationId) {
          const _ = await resp.text().catch(() => "");
          // Retry once without conversation id (server will create conversation)
          url = `${BASE}/api/ai/conversations/message`;
          resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, message: t, scanId }),
          });
        }

        if (!resp.ok) {
          const _err = await resp.text().catch(() => "");
          throw new Error(`sendMessage failed: ${resp.status}`);
        }

        const j = await resp.json();
        if (j?.conversationId) setConversationId(j.conversationId);
        const cid = j?.conversationId || conversationId;
        if (!cid) return;

        const r2 = await fetch(`${BASE}/api/ai/conversations/${cid}/messages`);
        if (!r2.ok) throw new Error(`fetch messages failed: ${r2.status}`);
        const msgs = await r2.json();
        const normalized = mapServerToInternal(msgs);
        updateMessages(normalized);
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
    [sending, onSendText, updateMessages, antdMessage, BASE, conversationId, scanId, userId]
  );

  // Media upload (Scan tab) using user's upload API
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
          // show preview/message from student
          const isImg = (file.type || "").startsWith("image/");
          let dataUrl = null;
          if (isImg) {
            try { dataUrl = await readAsDataURL(file); } catch {}
          }
          const studentMsg = isImg
            ? {
                id: Date.now() + Math.random().toString(36).slice(2, 9),
                from: "student",
                sender: "student",
                type: "image",
                content: dataUrl,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                timestamp: new Date().toISOString(),
              }
            : formatMessage(`Datei hochgeladen: ${file.name}`, "student");

          const loadingMessage = formatMessage("Ich analysiere dein Bild...", "agent");
          updateMessages((m) => [...m, studentMsg, loadingMessage]);

          // upload to user's API
          const formData = new FormData();
          formData.append("file", file);
          if (userId) formData.append("userId", userId);

          let res;
          try {
            if (onSendMedia) {
              await onSendMedia([file]);
              res = null;
            } else {
              res = await fetch(`${BASE}/api/ai/upload`, { method: "POST", body: formData });
            }
          } catch (e) {
            res = null;
          }

          if (!res || !res.ok) {
            // Replace loading with a brief note and append error at bottom
            updateMessages((m) => {
              const arr = [...m];
              const idx = arr.findIndex((msg) => msg.id === loadingMessage.id);
              if (idx !== -1) {
                arr[idx] = formatMessage("Analyse fehlgeschlagen.", "agent");
              }
              arr.push(
                formatMessage(
                  "Entschuldigung, beim Hochladen/Analysieren ist ein Fehler aufgetreten. Bitte versuche es später erneut.",
                  "agent"
                )
              );
              return arr;
            });
            continue;
          }

          const data = await res.json().catch(() => ({}));
          const extracted = data?.scan?.raw_text;
          const qa = Array.isArray(data?.parsed?.questions) ? data.parsed.questions : [];

          // Turn loading into a short done note, then append full analysis at the bottom
          updateMessages((m) => {
            const arr = [...m];
            const idx = arr.findIndex((msg) => msg.id === loadingMessage.id);
            if (idx !== -1) {
              arr[idx] = formatMessage("Analyse abgeschlossen.", "agent");
            }
            if (extracted || qa.length > 0) {
              arr.push(
                formatMessage(
                  { extractedText: extracted || "", qa },
                  "agent",
                  "table"
                )
              );
            } else {
              arr.push(
                formatMessage(
                  "Ich habe das Dokument erhalten, konnte aber keine verwertbaren Informationen extrahieren.",
                  "agent"
                )
              );
            }
            return arr;
          });
        }
      } catch (error) {
        antdMessage.error("Bild/Dokument konnte nicht hochgeladen werden");
      } finally {
        setUploading(false);
      }
    },
    [onSendMedia, updateMessages, antdMessage, uploading, userId, BASE]
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

  const renderMessageContent = (message) => {
    switch (message.type) {
      case "image":
        return (
          <div className="relative">
            <img
              src={typeof message.content === "string" ? message.content : (message.content?.url || "")}
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
      case "table": {
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
      default:
        return <div className="whitespace-pre-wrap">{message.content}</div>;
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

      {/* Single header space to match spacing */}
      <div className="px-3 pt-2 bg-[#f3f7eb] border-b" />

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
            <div key={messageKey(message, idx)} className={`w-full flex ${isAgent ? "justify-start" : "justify-end"} mb-3`}>
              {isAgent && (
                <img src={agentIcon} alt="Kibundo" className="w-7 h-7 rounded-full mr-2 self-end" />
              )}
              <div className={`max-w-[78%] px-3 py-2 rounded-2xl shadow-sm ${isAgent ? "bg-white text-[#444]" : "bg-[#aee17b] text-[#1b3a1b]"}`}>
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
          {/* Camera and gallery buttons (always enabled) */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className={`w-10 h-10 grid place-items-center rounded-full bg-white/30`}
            aria-label="Kamera öffnen"
            type="button"
            disabled={sending || uploading}
          >
            <img src={cameraIcon} alt="" className="w-6 h-6" />
          </button>

          <button
            onClick={() => galleryInputRef.current?.click()}
            className={`w-10 h-10 grid place-items-center rounded-full bg-white/30`}
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
              placeholder="Frag etwas zur Aufgabe oder lade ein Bild über die Kamera/Galerie hoch…"
              className="w-full bg-transparent outline-none text-[15px]"
              aria-label="Nachricht eingeben"
              disabled={sending || uploading}
            />
          </div>

          {/* Reset/new chat button: always enabled */}
          <button
            onClick={() => startNewChat()}
            className={`w-10 h-10 grid place-items-center rounded-full transition-colors shadow-sm`}
            style={{ backgroundColor: "#ff7a00" }}
            aria-label="Neuen Chat starten"
            type="button"
            disabled={sending || uploading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="#ffffff">
              <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
            </svg>
          </button>

          {/* Send button (chatbot) */}
          <button
            onClick={() => draft.trim() && sendText()}
            className={`w-10 h-10 grid place-items-center rounded-full transition-colors shadow-sm ${
              sending || uploading ? "opacity-70" : "hover:brightness-95"
            }`}
            style={{ backgroundColor: "#ff7a00" }}
            aria-label={sending ? "Wird gesendet..." : "Nachricht senden"}
            type="button"
            disabled={sending || uploading || !draft.trim()}
          >
            {sending || uploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="#ffffff">
                <path d="M21.44 2.56a1 1 0 0 0-1.05-.22L3.6 9.06a1 1 0 0 0 .04 1.87l6.9 2.28 2.3 6.91a1 1 0 0 0 1.86.03l6.74-16.78a1 1 0 0 0-.99-1.81ZM11.8 13.18l-4.18-1.38 9.68-4.04-5.5 5.42Z" />
              </svg>
            )}
          </button>

          {/* Done button if in homework mode */}
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
