import React, { useRef, useEffect } from "react";
import { message } from "antd";
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

// Format message for chat
const formatMessage = (content, from = "agent", type = 'text', meta = {}) => ({
  id: Date.now() + Math.random().toString(36).slice(2, 9),
  from,
  type,
  content,
  timestamp: new Date().toISOString(),
  ...meta
});

/* --------------------------------------------------------------- */
export default function HomeworkDoing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openChat, state: dockState } = useChatDock() || {};
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const initialLoad = useRef(true);

  // Initialize chat dock for new or existing tasks
  useEffect(() => {
    // Only run this effect on initial load or when location changes
    if (initialLoad.current) {
      initialLoad.current = false;
      
      // Check if we have a task in the location state (e.g., from deep link)
      const taskFromState = location.state?.task;
      if (taskFromState) {
        // Check if this is an existing task with chat history
        const existingTasks = loadTasks();
        const existingTask = existingTasks.find(t => t.id === taskFromState.id);
        
        if (existingTask && existingTask.messages && existingTask.messages.length > 0) {
          // Continue existing chat with previous messages
          openChat({
            mode: "homework",
            task: existingTask,
            initialMessages: existingTask.messages
          });
        } else {
          // Start a new chat for this task
          openChat({
            mode: "homework",
            task: taskFromState,
            initialMessages: [
              formatMessage("Hallo! Ich bin dein KI-Lernhelfer. Wie kann ich dir bei deinen Hausaufgaben helfen?", "agent")
            ]
          });
        }
      }
    }
  }, [location.state, openChat]);

  /** Create a slim task and open the bottom chat */
  const createTaskAndOpenChat = ({ file = null, meta = {} }) => {
    // Check if we're continuing an existing task
    const existingTask = meta.taskId ? loadTasks().find(t => t.id === meta.taskId) : null;
    
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
      done: false,
      source: existingTask?.source || meta.source || (file ? "image" : "manual"),
      fileName: existingTask?.fileName || file?.name || null,
      fileType: existingTask?.fileType || file?.type || null,
      fileSize: existingTask?.fileSize || file?.size || null,
      hasImage: !!existingTask?.hasImage || !!file,
      // Preserve existing messages if continuing a task
      messages: existingTask?.messages || []
    };

    // Save task to local storage
    const tasks = loadTasks();
    tasks.unshift(task);
    const storageOk = safeSaveTasks(tasks);

    // Set progress to step 1 (Doing)
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ 
        step: 1, 
        taskId: id, 
        task 
      }));
    } catch (error) {
      console.error("Error saving progress:", error);
    }

    // Prepare initial messages for the chat
    const initialMessages = [];
    
    // Add file message if a file was provided
    if (file) {
      let objectUrl = null;
      try { 
        objectUrl = URL.createObjectURL(file);
        // Clean up the object URL after 5 minutes
        setTimeout(() => URL.revokeObjectURL(objectUrl), 5 * 60 * 1000);
      } catch (error) {
        console.error("Error creating object URL:", error);
      }
      
      initialMessages.push({
        id: Date.now(),
        from: "student",
        type: "image",
        content: objectUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        timestamp: new Date().toISOString()
      });
    } else {
      // Default message for non-file tasks
      initialMessages.push({
        id: Date.now(),
        from: "student",
        type: "text",
        content: "Ich habe eine neue Aufgabe hinzugefügt.",
        timestamp: new Date().toISOString()
      });
    }
    
    // Add welcome message from agent
    initialMessages.push({
      id: Date.now() + 1,
      from: "agent",
      type: "text",
      content: "Super! Lass uns mit der Aufgabe starten. Wie kann ich dir helfen?",
      timestamp: new Date().toISOString()
    });

    // Open the chat dock with the task and initial messages
    if (openChat) {
      openChat({
        mode: "homework",
        task,
        initialMessages
      });
    } else {
      // Fallback to navigation if openChat is not available
      navigate("/student/homework/chat", { 
        state: { 
          taskId: id,
          initialMessages
        } 
      });
    }

    // Show appropriate message to user
    if (!storageOk) {
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
        description: "Diktierte Aufgabe",
        source: "audio",
      },
    });

  const onCameraChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if we're continuing an existing task
      const taskId = location.state?.task?.id;
      createTaskAndOpenChat({ 
        file, 
        meta: { 
          source: "image",
          taskId: taskId
        } 
      });
    }
    e.target.value = ""; // reset
  };

  const onGalleryChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if we're continuing an existing task
      const taskId = location.state?.task?.id;
      createTaskAndOpenChat({ 
        file, 
        meta: { 
          source: "image",
          taskId: taskId
        } 
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
