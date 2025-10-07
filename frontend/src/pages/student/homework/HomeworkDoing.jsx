import React, { useRef, useEffect } from "react";
import { App } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useChatDock } from "@/context/ChatDockContext.jsx";

/* Icons (repo spellings) */
import cameraIcon from "@/assets/mobile/icons/camera.png";
import micIcon    from "@/assets/mobile/icons/mic.png";
import galleryIcon from "@/assets/mobile/icons/galary.png";

/* localStorage keys */
const TASKS_KEY = "kibundo.homework.tasks.v1";
const PROGRESS_KEY = "kibundo.homework.progress.v1";

/* ---- tiny storage helpers (quota-safe) ---- */
const loadTasks = () => {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); }
  catch { return []; }
};

const safeSaveTasks = (tasks) => {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    try {
      const pruned = tasks.slice(0, 30);
      localStorage.setItem(TASKS_KEY, JSON.stringify(pruned));
      return true;
    } catch {}
    return false;
  }
};

const makeId = () =>
  "task_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Format message for optional non-file seed
const formatMessage = (content, from = "agent", type = "text", meta = {}) => ({
  id: Date.now() + Math.random().toString(36).slice(2, 9),
  from,
  type,
  content,
  timestamp: new Date().toISOString(),
  ...meta,
});

/* --------------------------------------------------------------- */
export default function HomeworkDoing() {
  const { message: antdMessage } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { openChat, expandChat } = useChatDock() || {};
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const initialLoad = useRef(true);

  // Initialize chat dock for deep-linked task (resume history if exists)
  useEffect(() => {
    if (!openChat) return;               // context not ready yet
    if (!initialLoad.current) return;
    initialLoad.current = false;

    const taskFromState = location.state?.task;
    if (!taskFromState) return;

    const existingTasks = loadTasks();
    const existingTask = existingTasks.find((t) => t.id === taskFromState.id);

    if (existingTask && Array.isArray(existingTask.messages) && existingTask.messages.length > 0) {
      openChat({
        mode: "homework",
        task: existingTask,
        // no analyze here; we're resuming
      });
      expandChat?.();
    } else {
      openChat({
        mode: "homework",
        task: taskFromState,
        initialMessages: [
          formatMessage(
            "Hallo! Ich bin dein KI-Lernhelfer. Wie kann ich dir bei deinen Hausaufgaben helfen?",
            "agent"
          ),
        ],
      });
      expandChat?.();
    }
  }, [location.state, openChat, expandChat]);

  /** Create/update a task and open the chat (auto-analyze when file is present) */
  const createTaskAndOpenChat = ({ file = null, meta = {} }) => {
    const tasks = loadTasks();

    const existingTask = meta.taskId ? tasks.find((t) => t.id === meta.taskId) : null;
    const id = existingTask?.id || makeId();
    const now = new Date().toISOString();

    const task = {
      id,
      createdAt: existingTask?.createdAt || now,
      updatedAt: now,
      subject: existingTask?.subject || meta.subject || "Sonstiges",
      what: existingTask?.what || meta.what || (file ? "Foto-Aufgabe" : "Neue Aufgabe"),
      description: existingTask?.description || meta.description || (file?.name ?? ""),
      due: existingTask?.due || meta.due || null,
      done: existingTask?.done ?? false,
      source: existingTask?.source || meta.source || (file ? "image" : "manual"),
      fileName: existingTask?.fileName || file?.name || null,
      fileType: existingTask?.fileType || file?.type || null,
      fileSize: existingTask?.fileSize || file?.size || null,
      hasImage: Boolean(existingTask?.hasImage || (file && file.type?.startsWith("image/"))),
      // IMPORTANT: attach the raw File so ChatDockContext can upload/analyze it
      file: file || existingTask?.file || null,
      // Keep any existing messages; we won't pre-seed image bubbles to avoid duplicates
      messages: Array.isArray(existingTask?.messages) ? existingTask.messages : [],
    };

    // Upsert task (avoid duplicates)
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx >= 0) tasks[idx] = { ...tasks[idx], ...task };
    else tasks.unshift(task);

    const storageOk = safeSaveTasks(tasks);

    // Persist progress (Doing)
    try {
      localStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({ step: 1, taskId: id, task })
      );
    } catch (error) {
      console.error("Error saving progress:", error);
    }

    // If no file (manual/audio), seed a friendly welcome; else let context add analyzing + preview
    const initialMessages =
      file
        ? task.messages // keep existing only (no new seed to avoid double bubbles)
        : [
            ...task.messages,
            formatMessage("Super! Lass uns mit der Aufgabe starten. Wie kann ich dir helfen?", "agent"),
          ];

    if (openChat) {
      openChat({
        mode: "homework",
        task,           // include task.file and (optionally) task.userId
        initialMessages, // optional seed (don’t include an image bubble if you want the Provider to show the preview)
        analyze: !!task.file   // 🔥 this kicks off the /api/ai/upload analyze flow
      });
      expandChat?.();            // show the chat immediately
    } else {
      navigate("/student/homework/chat", {
        state: { taskId: id, initialMessages, analyze: !!file },
      });
    }

    if (!storageOk) {
      antdMessage.warning(
        "Aufgabe erstellt, aber lokaler Speicher ist voll. Bild wird nicht dauerhaft gespeichert."
      );
    } else {
      antdMessage.success;
    }
  };

  /* ----- handlers ----- */
  const onCameraClick = () => cameraInputRef.current?.click();
  const onGalleryClick = () => galleryInputRef.current?.click();
  const onMicClick = () =>
    createTaskAndOpenChat({
      file: null,
      meta: {
        subject: "Sonstiges",
        what: "Audio-Aufgabe",
        description: "Diktierte Aufgabe",
        source: "audio",
      },
    });

  const onCameraChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const taskId = location.state?.task?.id;
      createTaskAndOpenChat({
        file,
        meta: { source: "image", taskId },
      });
    }
    e.target.value = ""; // reset
  };

  const onGalleryChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const taskId = location.state?.task?.id;
      createTaskAndOpenChat({
        file,
        meta: {
          source: file.type?.startsWith("image/") ? "image" : "file",
          taskId,
        },
      });
    }
    e.target.value = "";
  };

  /* ----- UI (big mic + two small buttons) ----- */
  return (
    <div className="relative w-full">
      {/* hidden inputs */}
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

      {/* Control row */}
      <div className="w-full flex items-center justify-center gap-16 py-10">
        {/* left: camera (small) */}
        <button
          type="button"
          aria-label="Kamera öffnen"
          onClick={onCameraClick}
          className="w-[54px] h-[54px] rounded-full grid place-items-center"
          style={{ backgroundColor: "#ff7a00", boxShadow: "0 12px 22px rgba(0,0,0,.18)" }}
        >
          <img src={cameraIcon} alt="" className="w-6 h-6 pointer-events-none" />
        </button>

        {/* center: mic (large) */}
        <button
          type="button"
          aria-label="Audio-Aufgabe starten"
          onClick={onMicClick}
          className="w-[96px] h-[96px] rounded-full grid place-items-center"
          style={{ backgroundColor: "#ff7a00", boxShadow: "0 16px 28px rgba(0,0,0,.22)" }}
        >
          <img src={micIcon} alt="" className="w-9 h-9 pointer-events-none" />
        </button>

        {/* right: gallery (small) */}
        <button
          type="button"
          aria-label="Galerie öffnen"
          onClick={onGalleryClick}
          className="w-[54px] h-[54px] rounded-full grid place-items-center"
          style={{ backgroundColor: "#ff7a00", boxShadow: "0 12px 22px rgba(0,0,0,.18)" }}
        >
          <img src={galleryIcon} alt="" className="w-6 h-6 pointer-events-none" />
        </button>
      </div>
    </div>
  );
}
