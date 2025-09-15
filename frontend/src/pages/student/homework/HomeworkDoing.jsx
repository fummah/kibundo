import React, { useRef } from "react";
import { message } from "antd";
import { useNavigate } from "react-router-dom";
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
    // prune if full
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

/* --------------------------------------------------------------- */
export default function HomeworkDoing() {
  const navigate = useNavigate();
  const { openHomework } = useChatDock() || {};
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  /** Create a slim task, advance progress to Doing (1), and open the footer chat */
  const createTaskAndOpenChat = ({ file = null, meta = {} }) => {
    const id = makeId();

    const task = {
      id,
      createdAt: new Date().toISOString(),
      subject: meta.subject || "Sonstiges",
      what: meta.what || (file ? "Foto-Aufgabe" : "Neue Aufgabe"),
      description: meta.description || (file?.name ?? ""),
      due: meta.due || null,
      done: false,
      source: meta.source || (file ? "image" : "manual"),
      // only small metadata (no base64)
      fileName: file?.name || null,
      fileType: file?.type || null,
      fileSize: file?.size || null,
      hasImage: !!file,
    };

    const tasks = loadTasks();
    tasks.unshift(task);
    const ok = safeSaveTasks(tasks);

    // step 1 = Doing
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ step: 1, taskId: id, task }));
    } catch {}

    // temporary blob URL for chat preview
    let objectUrl = null;
    if (file) {
      try { objectUrl = URL.createObjectURL(file); } catch {}
      setTimeout(() => objectUrl && URL.revokeObjectURL(objectUrl), 5 * 60 * 1000);
    }

    if (openHomework) {
      openHomework(task, [
        file
          ? {
              id: Date.now(),
              from: "student",
              image: objectUrl,
              fileName: file?.name,
              fileType: file?.type,
              fileSize: file?.size,
            }
          : { id: Date.now(), from: "student", text: "Ich habe die Aufgabe hinzugefügt." },
        { id: Date.now() + 1, from: "agent", text: "Super! Lass uns gleich starten." },
      ]);
    } else {
      // fallback: navigate; HomeworkChat will open the dock on mount
      navigate("/student/homework/chat", { state: { taskId: id } });
    }

    if (!ok) {
      message.warning("Aufgabe erstellt, aber lokaler Speicher ist voll. Bild wird nicht dauerhaft gespeichert.");
    } else {
      message.success("Aufgabe gespeichert – Chat geöffnet.");
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
        description: "Diktierte Aufgabe (Demo)",
        source: "audio",
      },
    });

  const onCameraChange = (e) => {
    const file = e.target.files?.[0];
    if (file) createTaskAndOpenChat({ file, meta: { source: "image" } });
    e.target.value = ""; // reset
  };
  const onGalleryChange = (e) => {
    const file = e.target.files?.[0];
    if (file) createTaskAndOpenChat({ file, meta: { source: "image" } });
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
        accept="image/*"
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
          style={{
            backgroundColor: "#ff7a00",
            boxShadow: "0 12px 22px rgba(0,0,0,.18)",
          }}
        >
          <img src={cameraIcon} alt="" className="w-6 h-6 pointer-events-none" />
        </button>

        {/* center: mic (large) */}
        <button
          type="button"
          aria-label="Audio-Aufgabe starten"
          onClick={onMicClick}
          className="w-[96px] h-[96px] rounded-full grid place-items-center"
          style={{
            backgroundColor: "#ff7a00",
            boxShadow: "0 16px 28px rgba(0,0,0,.22)",
          }}
        >
          <img src={micIcon} alt="" className="w-9 h-9 pointer-events-none" />
        </button>

        {/* right: gallery (small) */}
        <button
          type="button"
          aria-label="Galerie öffnen"
          onClick={onGalleryClick}
          className="w-[54px] h-[54px] rounded-full grid place-items-center"
          style={{
            backgroundColor: "#ff7a00",
            boxShadow: "0 12px 22px rgba(0,0,0,.18)",
          }}
        >
          <img src={galleryIcon} alt="" className="w-6 h-6 pointer-events-none" />
        </button>
      </div>
    </div>
  );
}
