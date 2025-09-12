import React from "react";
import { Card, Upload, Button, Space, message } from "antd";
import { CameraOutlined, AudioOutlined, PictureOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useChatDock } from "@/context/ChatDockContext.jsx";

// localStorage keys
const TASKS_KEY = "kibundo.homework.tasks.v1";
const PROGRESS_KEY = "kibundo.homework.progress.v1";

/* ------------------------- tiny helpers ------------------------- */
const loadTasks = () => {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); }
  catch { return []; }
};
const safeSaveTasks = (tasks) => {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    return true;
  } catch (e) {
    // prune oldest if quota full
    try {
      const pruned = tasks.slice(0, 30);
      localStorage.setItem(TASKS_KEY, JSON.stringify(pruned));
      return true;
    } catch {}
    console.error("saveTasks failed:", e);
    return false;
  }
};
const makeId = () =>
  "task_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* -------------------------- component -------------------------- */
export default function HomeworkDoing() {
  const navigate = useNavigate();
  const { openHomework } = useChatDock() || {};

  // create & persist a new task (slim), move progress, then open footer chat
  const createTaskAndOpenChat = ({ file, meta }) => {
    const id = makeId();

    // ⚠️ Slim task: do NOT include big binary/base64
    const task = {
      id,
      createdAt: new Date().toISOString(),
      subject: meta.subject || "Sonstiges",
      what: meta.what || "Neue Aufgabe",
      description: meta.description || "",
      due: meta.due || null,
      done: false,
      source: meta.source || (file ? "image" : "manual"),
      // only small metadata
      fileName: file?.name || null,
      fileType: file?.type || null,
      fileSize: file?.size || null,
      hasImage: !!file,
    };

    const tasks = loadTasks();
    tasks.unshift(task);
    const ok = safeSaveTasks(tasks);

    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ step: 1, taskId: id, task }));
    } catch (e) {
      console.warn("progress save failed:", e);
    }

    // blob URL for chat preview (not stored)
    let objectUrl = null;
    if (file) {
      try { objectUrl = URL.createObjectURL(file); } catch {}
      setTimeout(() => objectUrl && URL.revokeObjectURL(objectUrl), 5 * 60 * 1000);
    }

    openHomework?.(task, [
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

    if (!ok) {
      message.warning("Aufgabe erstellt, aber lokaler Speicher ist voll. Bild wird nicht dauerhaft gespeichert.");
    } else {
      message.success("Aufgabe gespeichert – Chat geöffnet.");
    }
  };

  // Handle camera/gallery image
  const onPick = async (file) => {
    createTaskAndOpenChat({
      file,
      meta: {
        subject: "Sonstiges",
        what: "Foto-Aufgabe",
        description: file?.name || "Hochgeladenes Bild",
        source: "image",
      },
    });
    return false; // prevent antd auto-upload
  };

  // Handle “Audio” button → dummy text task (no API, no image)
  const onAudio = () => {
    createTaskAndOpenChat({
      file: null,
      meta: {
        subject: "Sonstiges",
        what: "Audio-Aufgabe",
        description: "Diktierte Aufgabe (Demo)",
        source: "audio",
      },
    });
  };

  // ✅ COMPLETE: mark current task done and go to feedback (step 2)
  const onCompleteNow = () => {
    try {
      const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      const taskId = progress?.taskId;
      if (!taskId) {
        message.warning("Lege zuerst eine Aufgabe an (Foto, Galerie oder Audio).");
        return;
      }

      // mark task as done
      const tasks = loadTasks();
      const next = tasks.map((t) => (t.id === taskId ? { ...t, done: true } : t));
      safeSaveTasks(next);

      // set step 2
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, step: 2 }));

      // route to feedback
      navigate("/student/homework/feedback", { state: { taskId } });
    } catch (e) {
      console.error(e);
      message.error("Konnte Aufgabe nicht abschließen.");
    }
  };

  return (
    <Card className="rounded-2xl text-center">
      <div className="mb-3">Foto aufnehmen/hochladen oder Audio-Beschreibung geben</div>

      <Space size="large">
        <Upload showUploadList={false} accept="image/*" capture="environment" beforeUpload={onPick}>
          <Button size="large" shape="circle" icon={<CameraOutlined />} />
        </Upload>

        <Button size="large" shape="circle" icon={<AudioOutlined />} onClick={onAudio} />

        <Upload showUploadList={false} accept="image/*" beforeUpload={onPick}>
          <Button size="large" shape="circle" icon={<PictureOutlined />} />
        </Upload>
      </Space>

      <div className="mt-4 text-sm text-gray-500">
        PNG/JPG – gut lesbar, gerade fotografiert
      </div>

      {/* ✅ Complete CTA */}
      <div className="mt-6">
        <Button
          type="primary"
          className="!bg-[#FF7900] !border-none !px-6 !h-10 font-semibold rounded-lg"
          onClick={onCompleteNow}
        >
          Als erledigt markieren
        </Button>
      </div>
    </Card>
  );
}
