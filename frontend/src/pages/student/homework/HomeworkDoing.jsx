// src/pages/student/homework/HomeworkDoing.jsx
import React, { useRef, useEffect, useState, useMemo } from "react";
import { App } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useChatDock } from "@/context/ChatDockContext";
import api from "@/api/axios";

import cameraIcon from "@/assets/mobile/icons/camera.png";
import micIcon    from "@/assets/mobile/icons/mic.png";
import galleryIcon from "@/assets/mobile/icons/galary.png";

const TASKS_KEY = "kibundo.homework.tasks.v1";
const PROGRESS_KEY = "kibundo.homework.progress.v1";

/* ---------- storage helpers (quota-safe) ---------- */
const loadTasks = () => {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); }
  catch { return []; }
};
const stripVolatile = (task) => {
  if (!task) return task;
  const { file, ...rest } = task;
  return rest;
};
const safeSaveTasks = (tasks) => {
  try {
    const serializable = tasks.map(stripVolatile);
    localStorage.setItem(TASKS_KEY, JSON.stringify(serializable));
    return true;
  } catch {
    try {
      const pruned = tasks.slice(0, 30).map(stripVolatile);
      localStorage.setItem(TASKS_KEY, JSON.stringify(pruned));
      return true;
    } catch {}
    return false;
  }
};
const makeId = () =>
  "task_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const fmt = (content, from = "agent", type = "text", meta = {}) => ({
  id: Date.now() + Math.random().toString(36).slice(2, 9),
  from,
  type,
  content,
  timestamp: new Date().toISOString(),
  ...meta,
});

export default function HomeworkDoing() {
  const { message: antdMessage } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { openChat, expandChat } = useChatDock();

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const initialLoad = useRef(true);
  const [uploading, setUploading] = useState(false);

  // resume deep-linked task if any
  useEffect(() => {
    if (!openChat || !initialLoad.current) return;
    initialLoad.current = false;

    const taskFromState = location.state?.task;
    if (!taskFromState?.id) return;

    const existing = loadTasks().find((t) => t.id === taskFromState.id);
    openChat({
      mode: "homework",
      task: existing || taskFromState,
      initialMessages: existing?.messages?.length
        ? undefined
        : [fmt("Hallo! Ich bin dein KI-Lernhelfer. Wie kann ich dir bei deinen Hausaufgaben helfen?", "agent")],
      analyze: false, // we’re not passing a File here
    });
    expandChat?.();
  }, [openChat, expandChat, location.state]);

  /* ---------------- upload via shared axios api ---------------- */
  const uploadWithApi = async (file) => {
    const fd = new FormData();
    fd.append("file", file, file.name);
    // userId is optional; bearer token comes from interceptor
    const { data } = await api.post("/ai/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  };

  /* ------- create or update the task, then open chat (no re-upload) ------- */
  const createTaskAndOpenChat = async ({ file = null, meta = {} }) => {
    const tasks = loadTasks();
    const now = new Date().toISOString();

    const existingTask = meta.taskId ? tasks.find((t) => t.id === meta.taskId) : null;
    const id = existingTask?.id || makeId();

    let previewUrl = null;
    let scanData = null;

    if (file) {
      setUploading(true);
      try {
        // local preview (transient)
        try { previewUrl = URL.createObjectURL(file); } catch {}
        // ⬇️ real upload using shared axios instance
        scanData = await uploadWithApi(file);
      } catch (e) {
        antdMessage.error("Upload/Analyse fehlgeschlagen.");
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    // Build initial messages
    const initialMessages = [];
    if (file && previewUrl) {
      initialMessages.push(
        {
          id: Date.now() + Math.random().toString(36).slice(2, 9),
          from: "student",
          type: "image",
          content: previewUrl, // a blob: URL (not base64)
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          timestamp: now,
          transient: true, // 🚫 don’t persist previews
        }
      );
    }
    if (scanData) {
      const extracted = scanData?.scan?.raw_text ?? scanData?.extractedText ?? "";
      const qa =
        Array.isArray(scanData?.parsed?.questions) ? scanData.parsed.questions :
        Array.isArray(scanData?.qa) ? scanData.qa : [];
      if (extracted || qa.length) {
        initialMessages.push(
          fmt({ extractedText: extracted, qa }, "agent", "table")
        );
      } else {
        initialMessages.push(
          fmt("Das Bild wurde analysiert, aber ich konnte nichts Brauchbares extrahieren.", "agent")
        );
      }
    } else if (!file) {
      initialMessages.push(fmt("Super! Lass uns mit der Aufgabe starten. Wie kann ich dir helfen?", "agent"));
    }

    // Persistable task (no File)
    const taskForStorage = {
      id,
      createdAt: existingTask?.createdAt || now,
      updatedAt: now,
      subject: existingTask?.subject || meta.subject || (file ? "Mathe" : "Sonstiges"),
      what: existingTask?.what || meta.what || (file ? "Foto-Aufgabe" : "Neue Aufgabe"),
      description: existingTask?.description || meta.description || (file?.name ?? ""),
      due: existingTask?.due || meta.due || null,
      done: existingTask?.done ?? false,
      source: existingTask?.source || meta.source || (file ? "image" : "manual"),
      fileName: existingTask?.fileName || file?.name || null,
      fileType: existingTask?.fileType || file?.type || null,
      fileSize: existingTask?.fileSize || file?.size || null,
      hasImage: Boolean(existingTask?.hasImage || (file && file.type?.startsWith("image/"))),
      // 🔗 important so the chat can continue without 404s
      scanId: scanData?.scan?.id ?? existingTask?.scanId ?? null,
      conversationId: scanData?.conversationId ?? existingTask?.conversationId ?? null,
      // we don’t store messages in the task anymore; the dock stores chat history separately
    };

    // upsert and save (quota-safe, silent fallbacks)
const tasksNext = (() => {
  const copy = [...tasks];
  const idx = copy.findIndex((t) => t.id === id);
  if (idx >= 0) copy[idx] = { ...copy[idx], ...taskForStorage };
  else copy.unshift(taskForStorage);
  return copy;
})();

// try full save → then trimmed → then minimal
let storageMode = "full";
try {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasksNext));
} catch {
  storageMode = "trimmed";
  try {
    // drop messages & shrink description, keep top 20
    const trimmed = tasksNext
      .slice(0, 20)
      .map(({ messages, file, description = "", ...t }) => ({
        ...t,
        messages: [],                 // never persist heavy msg arrays here
        description: description.slice(0, 180),
      }));
    localStorage.setItem(TASKS_KEY, JSON.stringify(trimmed));
  } catch {
    storageMode = "minimal";
    try {
      // store the bare minimum so the list still renders
      const minimal = tasksNext.slice(0, 12).map(({ id, what, createdAt, updatedAt, done, hasImage }) => ({
        id,
        what,
        createdAt,
        updatedAt,
        done: !!done,
        hasImage: !!hasImage,
      }));
    localStorage.setItem(TASKS_KEY, JSON.stringify(minimal));
    } catch {
      storageMode = "fail";
      // last resort: do nothing; we'll still open the chat
    }
  }
}

// progress is best-effort; keep it small
try {
  localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({ step: 1, taskId: id, task: { id, what: taskForStorage.what, hasImage: taskForStorage.hasImage } })
  );
} catch {}

// open chat — we ALREADY uploaded, so analyze:false
openChat?.({
  mode: "homework",
  task: taskForStorage,
  initialMessages,
  analyze: false,
});
expandChat?.();

// user messaging: always positive unless every fallback failed
if (storageMode === "fail") {
  // optional: you can still show a tiny info/toast if you want
  antdMessage.success("Aufgabe erstellt – öffne den Chat, um deine Hausaufgaben anzusehen.");
} else {
  antdMessage.success("Aufgabe erstellt – öffne den Chat, um deine Hausaufgaben anzusehen.");
}

// revoke preview later
if (previewUrl) setTimeout(() => URL.revokeObjectURL(previewUrl), 5 * 60 * 1000);

  };

  /* ---------- UI handlers ---------- */
  const onCameraClick = () => cameraInputRef.current?.click();
  const onGalleryClick = () => galleryInputRef.current?.click();
  const onMicClick = () =>
    createTaskAndOpenChat({
      file: null,
      meta: { subject: "Sonstiges", what: "Audio-Aufgabe", description: "Diktierte Aufgabe", source: "audio" },
    });

  const onCameraChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const taskId = location.state?.task?.id;
      createTaskAndOpenChat({ file, meta: { source: "image", taskId } });
    }
    e.target.value = "";
  };
  const onGalleryChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const taskId = location.state?.task?.id;
      createTaskAndOpenChat({
        file,
        meta: { source: file.type?.startsWith("image/") ? "image" : "file", taskId },
      });
    }
    e.target.value = "";
  };

  /* ---------- View ---------- */
  return (
    <div className="relative w-full">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onCameraChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={onGalleryChange}
      />

      <div className="w-full flex items-center justify-center gap-16 py-10">
        <button
          type="button"
          aria-label="Kamera öffnen"
          onClick={onCameraClick}
          className="w-[54px] h-[54px] rounded-full grid place-items-center"
          style={{ backgroundColor: "#ff7a00", boxShadow: "0 12px 22px rgba(0,0,0,.18)" }}
          disabled={uploading}
        >
          <img src={cameraIcon} alt="" className="w-6 h-6 pointer-events-none" />
        </button>

        <button
          type="button"
          aria-label="Audio-Aufgabe starten"
          onClick={onMicClick}
          className="w-[96px] h-[96px] rounded-full grid place-items-center"
          style={{ backgroundColor: "#ff7a00", boxShadow: "0 16px 28px rgba(0,0,0,.22)" }}
          disabled={uploading}
        >
          <img src={micIcon} alt="" className="w-9 h-9 pointer-events-none" />
        </button>

        <button
          type="button"
          aria-label="Galerie öffnen"
          onClick={onGalleryClick}
          className="w-[54px] h-[54px] rounded-full grid place-items-center"
          style={{ backgroundColor: "#ff7a00", boxShadow: "0 12px 22px rgba(0,0,0,.18)" }}
          disabled={uploading}
        >
          <img src={galleryIcon} alt="" className="w-6 h-6 pointer-events-none" />
        </button>
      </div>
    </div>
  );
}
