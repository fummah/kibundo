// src/pages/student/homework/HomeworkDoing.jsx
import React, { useRef, useEffect, useState } from "react";
import { App } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useChatDock } from "@/context/ChatDockContext";
import { useAuthContext } from "@/context/AuthContext";
import api from "@/api/axios";

import cameraIcon from "@/assets/mobile/icons/camera.png";
import micIcon    from "@/assets/mobile/icons/mic.png";
import galleryIcon from "@/assets/mobile/icons/galary.png";

// Base keys (scoped per-student below)
const TASKS_KEY = "kibundo.homework.tasks.v1";
const PROGRESS_KEY = "kibundo.homework.progress.v1";

/* ---------- helpers ---------- */
const makeId = () =>
  "task_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const fmt = (content, from = "agent", type = "text", meta = {}) => ({
  id: Date.now() + Math.random().toString(36).slice(2, 9),
  from,
  sender: from,
  type,
  content,
  timestamp: new Date().toISOString(),
  ...meta,
});

// Quota-safe save with progressive fallback
const trySaveJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export default function HomeworkDoing() {
  const { message: antdMessage } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // write into chat storage directly so preview + status show instantly
  const { openChat, expandChat, getChatMessages, setChatMessages } = useChatDock();
  const { user: authUser } = useAuthContext();

  const studentId = authUser?.id ?? "anon";
  const TASKS_KEY_USER = `${TASKS_KEY}::u:${studentId}`;
  const PROGRESS_KEY_USER = `${PROGRESS_KEY}::u:${studentId}`;

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const initialLoad = useRef(true);

  const [uploading, setUploading] = useState(false);   // controls centered overlay

  const loadTasks = () => {
    try {
      return JSON.parse(localStorage.getItem(TASKS_KEY_USER) || "[]");
    } catch {
      return [];
    }
  };

  // Resume deep-linked task (if any)
  useEffect(() => {
    if (!openChat || !initialLoad.current) return;
    initialLoad.current = false;

    const taskFromState = location.state?.task;
    if (!taskFromState?.id) return;

    const existing = loadTasks().find((t) => t.id === taskFromState.id);
    const t = existing || taskFromState;

    openChat({
      mode: "homework",
      task: { ...t, userId: studentId },
      key: `homework:${t.id}::u:${studentId}`,
      restore: true,
      focus: "last",
    });
    expandChat?.(true);
  }, [openChat, expandChat, location.state, studentId]);

  /* ---------------- upload via API ---------------- */
  const uploadWithApi = async (file) => {
    const fd = new FormData();
    fd.append("file", file, file.name);
    // Do NOT send userId; server infers from auth (bearer token)
    const { data } = await api.post("ai/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      meta: { forceAuthHeader: true },
    });
    return data;
  };

  /* ------ write/replace messages in dock store ------ */
  const appendToChat = (mode, scopedKey, msgsToAppend) => {
    const prev = getChatMessages?.(mode, scopedKey) || [];
    setChatMessages?.(mode, scopedKey, [...prev, ...msgsToAppend]);
  };

  const replaceMessageInChat = (mode, scopedKey, msgId, replacer) => {
    const prev = getChatMessages?.(mode, scopedKey) || [];
    const next = prev.map((m) => (m.id === msgId ? replacer(m) : m));
    setChatMessages?.(mode, scopedKey, next);
  };

  const openAndFocusChat = (taskId) => {
    openChat?.({
      mode: "homework",
      task: { id: taskId, userId: studentId },
      key: `homework:${taskId}::u:${studentId}`,
      restore: true,
      focus: "last",
    });
    expandChat?.(true); // ensure dock expands when analysis begins
  };

  /* ------- create/update task, show preview + loader, then analyse ------- */
  const createTaskAndOpenChat = async ({ file = null, meta = {} }) => {
    const tasks = loadTasks();
    const now = new Date().toISOString();

    const existingTask = meta.taskId ? tasks.find((t) => t.id === meta.taskId) : null;
    const id = existingTask?.id || makeId();

    const mode = "homework";
    const scopedKey = `${id}::u:${studentId}`;

    // Prepare preview + loader messages FIRST so the chat shows them immediately
    let previewUrl = null;
    let studentImageMsg = null;
    let loadingMsg = null;

    if (file) {
      try { previewUrl = URL.createObjectURL(file); } catch {}
      if (previewUrl) {
        studentImageMsg = {
          id: Date.now() + Math.random().toString(36).slice(2, 9),
          from: "student",
          sender: "student",
          type: "image",
          content: previewUrl, // blob: URL (persisted; valid for current session)
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          timestamp: now,
        };
      }

      // status bubble with spinner (rendered by HomeworkChat for type="status")
      loadingMsg = fmt("Ich analysiere dein Bild…", "agent", "status", { transient: true });

      // Push preview + loader, then open & expand the dock right away
      appendToChat(mode, scopedKey, [studentImageMsg, loadingMsg].filter(Boolean));
      openAndFocusChat(id);
    } else {
      // No file: seed a friendly agent message and open chat
      appendToChat(mode, scopedKey, [
        fmt("Super! Lass uns mit der Aufgabe starten. Wie kann ich dir helfen?", "agent"),
      ]);
      openAndFocusChat(id);
    }

    // Upload & analysis (if there is a file)
    let scanData = null;
    if (file) {
      setUploading(true); // ⬅️ show centered overlay
      try {
        scanData = await uploadWithApi(file);
      } catch (e) {
        const status = e?.response?.status;
        const serverMsg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Unbekannter Fehler";
        if (loadingMsg) {
          replaceMessageInChat(mode, scopedKey, loadingMsg.id, () =>
            fmt(
              `Analyse fehlgeschlagen (${status ?? "?"}). ${serverMsg}`,
              "agent"
            )
          );
        }
        console.error("Upload/Analyse failed (HomeworkDoing)", status, serverMsg, e?.response?.data);
        antdMessage.error(`Upload/Analyse fehlgeschlagen: ${serverMsg}`);
      } finally {
        setUploading(false); // hide overlay; chat keeps status bubble until result
      }
    }

    // Build/update the task object
    const subjectGuess = existingTask?.subject || meta.subject || (file ? "Mathe" : "Sonstiges");
    const whatGuess = existingTask?.what || meta.what || (file ? "Foto-Aufgabe" : "Neue Aufgabe");

    const taskForStorage = {
      id,
      createdAt: existingTask?.createdAt || now,
      updatedAt: now,
      subject: subjectGuess,
      what: whatGuess,
      description: existingTask?.description || meta.description || (file?.name ?? ""),
      due: existingTask?.due || meta.due || null,
      done: existingTask?.done ?? false,
      source: existingTask?.source || meta.source || (file ? "image" : "manual"),
      fileName: existingTask?.fileName || file?.name || null,
      fileType: existingTask?.fileType || file?.type || null,
      fileSize: existingTask?.fileSize || file?.size || null,
      hasImage: Boolean(existingTask?.hasImage || (file && file.type?.startsWith("image/"))),
      scanId: scanData?.scan?.id ?? existingTask?.scanId ?? null,
      conversationId: scanData?.conversationId ?? existingTask?.conversationId ?? null,
      userId: studentId, // convenience only
    };

    // Upsert tasks (scoped)
    const upserted = (() => {
      const copy = [...tasks];
      const idx = copy.findIndex((t) => t.id === id);
      if (idx >= 0) copy[idx] = { ...copy[idx], ...taskForStorage };
      else copy.unshift(taskForStorage);
      return copy;
    })();

    let storageMode = "full";
    if (!trySaveJson(TASKS_KEY_USER, upserted)) {
      storageMode = "trimmed";
      const trimmed = upserted
        .slice(0, 20)
        .map(({ messages, file, description = "", ...t }) => ({
          ...t,
          messages: [],
          description: description.slice(0, 180),
        }));
      if (!trySaveJson(TASKS_KEY_USER, trimmed)) {
        storageMode = "minimal";
        const minimal = upserted
          .slice(0, 12)
          .map(({ id, what, createdAt, updatedAt, done, hasImage }) => ({
            id,
            what,
            createdAt,
            updatedAt,
            done: !!done,
            hasImage: !!hasImage,
          }));
        if (!trySaveJson(TASKS_KEY_USER, minimal)) {
          storageMode = "fail";
        }
      }
    }

    // Notify same-tab listeners that tasks have changed (storage event won't fire in same tab)
    try {
      window.dispatchEvent(new Event("kibundo:tasks-updated"));
    } catch {}

    // progress is best-effort; keep it small
    try {
      localStorage.setItem(
        PROGRESS_KEY_USER,
        JSON.stringify({
          step: 1,
          taskId: id,
          task: { id, what: taskForStorage.what, hasImage: taskForStorage.hasImage },
        })
      );
    } catch {}

    // If analysis succeeded, update status + append result
    if (scanData) {
      // Replace loader status
      if (loadingMsg) {
        replaceMessageInChat(mode, scopedKey, loadingMsg.id, () =>
          fmt("Analyse abgeschlossen.", "agent", "status", { transient: true })
        );
      }
      // Append extraction/table or fallback
      const extracted = scanData?.scan?.raw_text ?? scanData?.extractedText ?? "";
      const qa = Array.isArray(scanData?.parsed?.questions)
        ? scanData.parsed.questions
        : Array.isArray(scanData?.qa)
        ? scanData.qa
        : [];
      const resultMsg =
        extracted || qa.length
          ? fmt({ extractedText: extracted, qa }, "agent", "table")
          : fmt(
              "Ich habe das Dokument erhalten, konnte aber nichts Brauchbares extrahieren.",
              "agent"
            );

      appendToChat(mode, scopedKey, [resultMsg]);
    }

    antdMessage.success("Aufgabe erstellt – der Chat zeigt jetzt die Analyse.");
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
      {/* Hidden inputs */}
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

      {/* Controls */}
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

      {/* ⬇️ Centered full-screen LOADER OVERLAY while uploading/analyzing */}
      {uploading && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          role="status"
          aria-live="assertive"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3 px-5 py-4 rounded-2xl bg-white shadow-2xl">
            <span className="inline-block w-9 h-9 border-2 border-[#1b3a1b] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#1b3a1b]">Bild wird hochgeladen…</span>
          </div>
        </div>
      )}
    </div>
  );
}
