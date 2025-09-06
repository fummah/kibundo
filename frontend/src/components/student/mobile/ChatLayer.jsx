// src/components/student/mobile/ChatLayer.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// Assets
import topBg from "@/assets/backgrounds/top.png";
import minimiseBg from "@/assets/backgrounds/minimise.png";
import buddyMascot from "@/assets/buddies/kibundo-buddy.png";
import agentIcon from "@/assets/mobile/icons/agent-icon.png";
import cameraIcon from "@/assets/mobile/icons/camera.png";
import galleryIcon from "@/assets/mobile/icons/galary.png"; // keep repo spelling
import emojiIcon from "@/assets/mobile/icons/imoji.png";   // keep repo spelling
import micIcon from "@/assets/mobile/icons/mic.png";
import studentIcon from "@/assets/mobile/icons/stud-icon.png";
import agentChats from "@/assets/mobile/icons/agent-chats.png";

// UI
import HomeRibbon from "@/components/student/mobile/HomeRibbon";
import SettingsRibbon from "@/components/student/mobile/SettingsRibbon";

// Optional: analytics + ASR hooks
import { track } from "@/lib/analytics";
import useASR from "@/lib/voice/useASR";

/**
 * ChatLayer (reusable)
 * Props:
 * - messages: controlled messages array [{id, from: "student"|"agent", text?, image?}]
 * - onMessagesChange(next) : called when messages change (if using controlled mode)
 * - initialMessages: seed messages (uncontrolled mode)
 * - onSendText(text), onSendMedia(filesArray)
 * - showHomeRibbon, showSettingsRibbon (default true)
 * - minimiseTo: route to navigate when tapping minimise strip (default "/student/home")
 * - headerHeight: px height for header area (default 200)
 * - className: extra container classes
 */
export default function ChatLayer({
  messages: controlledMessages,
  onMessagesChange,
  initialMessages = [
    { id: 1, from: "student", text: "Hallo Kibundo" },
    { id: 2, from: "agent",   text: "Hallo Michael, hattest Du einen schönen Tag in der Schule?" },
    { id: 3, from: "student", text: "Ja, ausser Mathe und Reli war doof, sonst gut." },
    { id: 4, from: "agent",   text: "Freut mich! Für Religion und Mathe können wir zusammen üben. Soll ich Dir helfen?" },
    { id: 5, from: "student", text: "ok, aber nur wenn du lustig bist." },
  ],
  onSendText,
  onSendMedia,
  showHomeRibbon = true,
  showSettingsRibbon = true,
  minimiseTo = "/student/home",
  headerHeight = 200,
  className = "",
}) {
  const [localMessages, setLocalMessages] = useState(initialMessages);
  const msgs = controlledMessages ?? localMessages;

  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const objectUrlsRef = useRef([]);

  const navigate = useNavigate();
  const { listening, start, stop, reset } = useASR?.({ lang: "de-DE" }) ?? {};

  // utilities
  const setMessages = (next) => {
    const nextVal = typeof next === "function" ? next(msgs) : next;
    if (controlledMessages && onMessagesChange) onMessagesChange(nextVal);
    else setLocalMessages(nextVal);
  };

  // scroll after message append
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight + 9999, behavior: "smooth" });
  }, [msgs.length]);

  // cleanup blobs
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  // close emoji on Esc
  useEffect(() => {
    if (!showEmoji) return;
    const onKey = (e) => e.key === "Escape" && setShowEmoji(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showEmoji]);

  // actions
  const sendText = () => {
    const t = draft.trim();
    if (!t) return;
    setMessages((m) => [...m, { id: Date.now(), from: "student", text: t }]);
    onSendText?.(t);
    track?.("chat_message_send", { length: t.length });
    setDraft("");
  };

  const onCamera = () => cameraInputRef.current?.click();
  const onGallery = () => galleryInputRef.current?.click();
  const onEmoji = () => setShowEmoji((p) => !p);
  const onMinimise = () => navigate(minimiseTo);

  const onPrimaryButton = async () => {
    if (draft.trim()) {
      sendText();
      return;
    }
    if (!start || !stop) return;
    if (!listening) {
      reset?.();
      track?.("chat_mic_started");
      start();
    } else {
      const t = await stop();
      track?.("chat_mic_stopped", { transcript_len: t?.length || 0 });
      if (t?.trim()) {
        setMessages((m) => [...m, { id: Date.now(), from: "student", text: t.trim() }]);
        onSendText?.(t.trim());
      }
    }
  };

  // file handlers
  const handleCameraChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    const msg = {
      id: Date.now(),
      from: "student",
      image: url,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    };
    setMessages((m) => [...m, msg]);
    onSendMedia?.([file]);
    track?.("chat_image_send", { source: "camera", name: file.name, size: file.size });
    e.target.value = "";
  };

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newMsgs = files.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      return {
        id: Date.now() + Math.random(),
        from: "student",
        image: url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      };
    });
    setMessages((m) => [...m, ...newMsgs]);
    onSendMedia?.(files);
    track?.("chat_images_send", { source: "gallery", count: files.length });
    e.target.value = "";
  };

  return (
    <div className={["relative w-full h-full bg-white overflow-hidden", className].join(" ")}>
      {/* hidden inputs */}
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
        accept="image/*,video/*"
        multiple
        onChange={handleGalleryChange}
        className="hidden"
      />

      {/* header */}
      <div
        className="relative w-full"
        style={{
          backgroundImage: `url(${topBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          height: `${headerHeight}px`,
        }}
      >
        {showHomeRibbon && <HomeRibbon />}
        {showSettingsRibbon && <SettingsRibbon />}

        <div className="absolute left-1/2 -translate-x-1/2 bottom-[10px]">
          <img
            src={buddyMascot}
            alt="Buddy"
            className="h-[160px] object-contain drop-shadow-lg select-none"
            draggable={false}
          />
        </div>

        <div
          onClick={onMinimise}
          className="absolute left-0 right-0 -bottom-[1px] h-[54px] cursor-pointer"
          style={{
            backgroundImage: `url(${minimiseBg})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-label="Minimise chat"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onMinimise()}
        />
      </div>

      {/* messages */}
      <div
        ref={listRef}
        className="relative px-3 pt-4 pb-28 overflow-y-auto bg-[#f3f7eb]"
        style={{ height: `calc(100% - ${headerHeight}px)` }}
        aria-live="polite"
      >
        {msgs.map((m) => {
          const isAgent = m.from === "agent";
          return (
            <div
              key={m.id}
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
                className={`max-w-[78%] px-3 py-2 rounded-2xl shadow-sm overflow-hidden ${
                  isAgent ? "bg-[#aee17b] text-[#1b3a1b]" : "bg-[#f3ebe6] text-[#444]"
                }`}
              >
                {m.image ? (
                  <a
                    href={m.image}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                    title={m.fileName || "image"}
                  >
                    <img
                      src={m.image}
                      alt={m.fileName || "Attachment"}
                      className="rounded-xl w-full h-auto max-h-72 object-cover"
                      draggable={false}
                    />
                    {m.fileName && (
                      <div className="mt-1 text-xs opacity-70 truncate">{m.fileName}</div>
                    )}
                  </a>
                ) : (
                  m.text
                )}
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
      </div>

      {/* emoji picker */}
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

      {/* composer */}
      <div
        className="absolute left-0 right-0 bottom-0 z-40"
        style={{ backgroundColor: "#b2c10a", paddingBottom: "env(safe-area-inset-bottom)" }}
        role="form"
        aria-label="Message composer"
      >
        <div className="mx-auto max-w-[900px] px-3 py-2 flex items-center gap-3">
          <button
            onClick={onCamera}
            className="w-10 h-10 grid place-items-center bg-white/30 rounded-full"
            aria-label="Open Camera"
            type="button"
          >
            <img src={cameraIcon} alt="" className="w-6 h-6" />
          </button>

          <button
            onClick={onGallery}
            className="w-10 h-10 grid place-items-center bg-white/30 rounded-full"
            aria-label="Open Gallery"
            type="button"
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
            />
          </div>

          <button
            onClick={onEmoji}
            className="w-10 h-10 grid place-items-center bg-white/30 rounded-full"
            aria-label="Emoji"
            type="button"
          >
            <img src={emojiIcon} alt="" className="w-6 h-6" />
          </button>

          <button
            onClick={onPrimaryButton}
            className="w-11 h-11 grid place-items-center rounded-full"
            style={{ backgroundColor: "#ff7a00" }}
            aria-label={draft.trim() ? "Send" : listening ? "Stop recording" : "Start recording"}
            type="button"
          >
            {draft.trim() ? (
              <img src={agentChats} alt="Send" className="w-5 h-5" />
            ) : (
              <img src={micIcon} alt="Mic" className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
