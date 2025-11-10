// src/pages/student/homework/HomeworkFeedback.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App, Typography, Button } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { useChatDock } from "@/context/ChatDockContext";
import api from "@/api/axios";

/* ✅ Backgrounds (relative to this file location) */
import globalBg from "../../../assets/backgrounds/global-bg.png";
import intBack from "../../../assets/backgrounds/int-back.png";

const { Title, Text } = Typography;

const TASKS_KEY = "kibundo.homework.tasks.v1";
const PROGRESS_KEY = "kibundo.homework.progress.v1";

function loadTasks(keys = [TASKS_KEY]) {
  const merged = [];
  const seen = new Set();
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const task of parsed) {
        const id = task?.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
      const normalizedTask = { ...task };
      if (
        normalizedTask.completionPhotoDataUrl &&
        !normalizedTask.completionPhotoUrl
      ) {
        normalizedTask.completionPhotoUrl = normalizedTask.completionPhotoDataUrl;
        delete normalizedTask.completionPhotoDataUrl;
      }
      merged.push(normalizedTask);
      }
    } catch {}
  }
  return merged.sort(
    (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
  );
}

function readProgress(keys = [PROGRESS_KEY]) {
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      return {
        data: JSON.parse(raw),
        key,
      };
    } catch {}
  }
  return { data: {}, key: keys[0] };
}

const formatCompletionDate = (isoString) => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export default function HomeworkFeedback() {
  const { message: antdMessage } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuthContext();
  const { openChat, expandChat } = useChatDock() || {};

  const studentId = authUser?.id ?? "anon";
  const TASKS_KEY_USER = `${TASKS_KEY}::u:${studentId}`;
  const PROGRESS_KEY_USER = `${PROGRESS_KEY}::u:${studentId}`;

  const taskKeys = useMemo(
    () => [TASKS_KEY_USER, TASKS_KEY, `${TASKS_KEY}::u:anon`],
    [TASKS_KEY_USER]
  );
  const progressKeys = useMemo(
    () => [PROGRESS_KEY_USER, PROGRESS_KEY, `${PROGRESS_KEY}::u:anon`],
    [PROGRESS_KEY_USER]
  );

  const persistTasks = useCallback(
    (nextTasks) => {
      try {
        localStorage.setItem(TASKS_KEY_USER, JSON.stringify(nextTasks));
      } catch {}
      try {
        setTimeout(() => {
          try {
            window.dispatchEvent(new Event("kibundo:tasks-updated"));
          } catch {}
        }, 0);
      } catch {}
    },
    [TASKS_KEY_USER]
  );

  const initialProgressRef = useRef(readProgress(progressKeys));
  const [tasks, setTasks] = useState(() => loadTasks(taskKeys));
  const [progress, setProgress] = useState(initialProgressRef.current.data || {});
  const [completionPhotoUrl, setCompletionPhotoUrl] = useState(null);
  const [completedAt, setCompletedAt] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const taskIdFromState = location.state?.taskId || null;
  const taskIdFromQuery = new URLSearchParams(location.search).get("taskId");
  const taskIdFromProgress = progress?.taskId || null;
  const taskId = useMemo(
    () => taskIdFromState || taskIdFromQuery || taskIdFromProgress || null,
    [taskIdFromState, taskIdFromQuery, taskIdFromProgress]
  );

  const fallbackTask = progress?.task || null;

  const task = useMemo(() => {
    if (!taskId) return fallbackTask || null;
    const found = tasks.find((t) => t.id === taskId);
    if (found) return found;
    if (fallbackTask && fallbackTask.id === taskId) return fallbackTask;
    return null;
  }, [tasks, taskId, fallbackTask]);

  const conversationId = useMemo(() => {
    if (task?.conversationId) return task.conversationId;
    if (typeof window === "undefined" || !task?.id || !studentId) return null;
    try {
      const chatKey = `kibundo.convId.homework.${task.id}::u:${studentId}`;
      const stored = window.localStorage.getItem(chatKey);
      if (stored) return stored;
    } catch {}
    try {
      const fallback = window.localStorage.getItem(`kibundo.convId.homework.${studentId}`);
      if (fallback) return fallback;
    } catch {}
    return null;
  }, [task?.conversationId, task?.id, studentId]);

  const handleViewChat = useCallback(() => {
    const resolvedTask = task || fallbackTask || null;
    const resolvedId = resolvedTask?.id || taskId;
    if (!resolvedId) return;

    const taskPayload = {
      ...(resolvedTask || {}),
      id: resolvedId,
      userId: resolvedTask?.userId || studentId,
      conversationId: resolvedTask?.conversationId || (conversationId ? Number(conversationId) : undefined),
      done: true,
    };

    openChat?.({
      mode: "homework",
      task: taskPayload,
      readOnly: true,
    });

    setTimeout(() => {
      expandChat?.(true);
    }, 0);
  }, [task, fallbackTask, taskId, studentId, conversationId, openChat, expandChat]);

  const activeTaskId = task?.id || taskId || null;
  const isCompleted = Boolean(task?.done || completedAt);

  useEffect(() => {
    setTasks(loadTasks(taskKeys));
    const latestProgress = readProgress(progressKeys);
    setProgress(latestProgress.data || {});
  }, [taskKeys, progressKeys]);

  useEffect(() => {
    const refreshTasks = () => setTasks(loadTasks(taskKeys));
    const refreshProgress = () => {
      const next = readProgress(progressKeys);
      setProgress(next.data || {});
    };
    const onStorage = (event) => {
      if (!event?.key) return;
      if (taskKeys.includes(event.key)) refreshTasks();
      if (progressKeys.includes(event.key)) refreshProgress();
    };

    window.addEventListener("kibundo:tasks-updated", refreshTasks);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("kibundo:tasks-updated", refreshTasks);
      window.removeEventListener("storage", onStorage);
    };
  }, [taskKeys, progressKeys]);

  useEffect(() => {
    if (!taskId || !fallbackTask) return;
    setTasks((prev) => {
      if (prev.some((t) => t.id === taskId)) return prev;
      const next = [...prev, fallbackTask];
      persistTasks(next);
      return next;
    });
  }, [taskId, fallbackTask, persistTasks]);

  useEffect(() => {
    setProgress((prev) => {
      const currentStep = prev?.step || 0;
      const desiredStep = currentStep >= 3 ? currentStep : 3;
      const desiredTaskId = taskId || prev?.taskId || null;
      if (
        currentStep === desiredStep &&
        (prev?.taskId || null) === desiredTaskId
      ) {
        return prev;
      }
      const next = {
        ...prev,
        step: desiredStep,
        taskId: desiredTaskId,
      };
      try {
        localStorage.setItem(PROGRESS_KEY_USER, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [taskId, PROGRESS_KEY_USER]);

  useEffect(() => {
    setCompletionPhotoUrl(task?.completionPhotoUrl || null);
    setCompletedAt(task?.completedAt || null);
  }, [task?.completionPhotoUrl, task?.completedAt, task?.id]);

  const updateTaskInStorage = useCallback(
    (targetId, mutator) => {
      if (!targetId) return null;
      let updatedTask = null;
      setTasks((prev = []) => {
        const list = Array.isArray(prev) ? [...prev] : [];
        const idx = list.findIndex((t) => t && t.id === targetId);
        const baseTask = idx >= 0 ? list[idx] : null;
        const nextTask = mutator(baseTask);
        if (!nextTask) {
          return prev;
        }
        if (idx >= 0) {
          list[idx] = nextTask;
        } else {
          list.unshift(nextTask);
        }
        updatedTask = nextTask;
        persistTasks(list);
        return list;
      });
      return updatedTask;
    },
    [persistTasks]
  );

  const updateProgress = useCallback(
    (partial) => {
      setProgress((prev) => {
        const next = { ...prev, ...partial };
        try {
          localStorage.setItem(PROGRESS_KEY_USER, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [PROGRESS_KEY_USER]
  );

  const handleSelectPhoto = () => fileInputRef.current?.click();

  const uploadCompletionPhoto = useCallback(async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response?.data?.fileUrl || response?.data?.url || null;
  }, []);

  const syncCompletionToServer = useCallback(async (scanId, payload) => {
    if (!scanId) return;
    await api.put(`/homeworkscans/${scanId}/completion`, payload, {
      meta: { toast5xx: false },
    });
  }, []);

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeTaskId) return;
    setSavingPhoto(true);
    try {
      const uploadedUrl = await uploadCompletionPhoto(file);
      if (!uploadedUrl) {
        throw new Error("Foto konnte nicht hochgeladen werden");
      }
      const timestamp = new Date().toISOString();
      const baseTask = task || fallbackTask || { id: activeTaskId };
      const updatedTask =
        updateTaskInStorage(activeTaskId, (prevTask) => ({
          ...(prevTask || baseTask),
          completionPhotoUrl: uploadedUrl,
          completedAt: timestamp,
          done: true,
        })) || {
          ...baseTask,
          completionPhotoUrl: uploadedUrl,
          completedAt: timestamp,
          done: true,
        };

      setCompletionPhotoUrl(uploadedUrl);
      setCompletedAt(timestamp);

      updateProgress({
        completedAt: timestamp,
        done: true,
        taskId: activeTaskId,
        task: updatedTask,
      });

      if (updatedTask?.scanId) {
        await syncCompletionToServer(updatedTask.scanId, {
          completedAt: timestamp,
          completionPhotoUrl: uploadedUrl,
        });
      }
    } catch (error) {
      console.error("❌ Fehler beim Speichern des Abschlussfotos:", error);
      antdMessage?.error("Abschlussfoto konnte nicht gespeichert werden.");
    } finally {
      setSavingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!activeTaskId) return;
    setSavingPhoto(true);
    try {
      const baseTask = task || fallbackTask || { id: activeTaskId };
      const updatedTask =
        updateTaskInStorage(activeTaskId, (prevTask) => ({
          ...(prevTask || baseTask),
          completionPhotoUrl: null,
          completedAt: null,
          done: false,
        })) || {
          ...baseTask,
          completionPhotoUrl: null,
          completedAt: null,
          done: false,
        };

      setCompletionPhotoUrl(null);
      setCompletedAt(null);

      updateProgress({
        completedAt: null,
        done: false,
        taskId: activeTaskId,
        task: updatedTask,
      });

      if (updatedTask?.scanId) {
        await syncCompletionToServer(updatedTask.scanId, {
          completedAt: null,
          completionPhotoUrl: null,
        });
      }
    } catch (error) {
      console.error("❌ Fehler beim Entfernen des Abschlussfotos:", error);
      antdMessage?.error("Foto konnte nicht entfernt werden.");
    } finally {
      setSavingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleMarkCompleted = async () => {
    if (!activeTaskId) return;
    setSavingPhoto(true);
    try {
      const timestamp = new Date().toISOString();
      const baseTask = task || fallbackTask || { id: activeTaskId };
      const updatedTask =
        updateTaskInStorage(activeTaskId, (prevTask) => ({
          ...(prevTask || baseTask),
          done: true,
          completedAt: timestamp,
        })) || {
          ...baseTask,
          done: true,
          completedAt: timestamp,
        };

      setCompletedAt(timestamp);

      updateProgress({
        completedAt: timestamp,
        done: true,
        taskId: activeTaskId,
        task: updatedTask,
      });

      if (updatedTask?.scanId) {
        await syncCompletionToServer(updatedTask.scanId, {
          completedAt: timestamp,
          completionPhotoUrl: updatedTask?.completionPhotoUrl || completionPhotoUrl || null,
        });
      }
    } catch (error) {
      console.error("❌ Fehler beim Markieren als erledigt:", error);
      antdMessage?.error("Aufgabe konnte nicht als erledigt markiert werden.");
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleMarkUndone = async () => {
    if (!activeTaskId) return;
    setSavingPhoto(true);
    try {
      const baseTask = task || fallbackTask || { id: activeTaskId };
      const updatedTask =
        updateTaskInStorage(activeTaskId, (prevTask) => ({
          ...(prevTask || baseTask),
          done: false,
          completedAt: null,
        })) || {
          ...baseTask,
          done: false,
          completedAt: null,
        };

      setCompletedAt(null);

      updateProgress({
        completedAt: null,
        done: false,
        taskId: activeTaskId,
        task: updatedTask,
      });

      if (updatedTask?.scanId) {
        await syncCompletionToServer(updatedTask.scanId, {
          completedAt: null,
          completionPhotoUrl: updatedTask?.completionPhotoUrl || null,
        });
      }
    } catch (error) {
      console.error("❌ Fehler beim Zurücksetzen des Abschlussstatus:", error);
      antdMessage?.error("Aufgabe konnte nicht zurückgesetzt werden.");
    } finally {
      setSavingPhoto(false);
    }
  };

  const completionDateLabel = formatCompletionDate(
    completedAt || task?.completedAt
  );

  return (
    <div className="relative min-h-[50dvh] flex flex-col items-center justify-center px-6 overflow-hidden">
      <img
        src={globalBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none -z-20"
        draggable={false}
      />
      <img
        src={intBack}
        alt=""
        className="absolute bottom-0 left-0 w-full h-1/2 object-cover pointer-events-none -z-10"
        draggable={false}
      />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${(i * 13) % 100}%`,
              animationDelay: `${(i % 10) * 0.15}s`,
              background: ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#b892ff"][i % 5],
            }}
          />
        ))}
        <style>{`
          .confetti { 
            position: absolute; 
            top: -10px; 
            width: 8px; 
            height: 14px; 
            border-radius: 2px; 
            animation: kib-fall 2.8s linear infinite; 
          }
          @keyframes kib-fall { 
            0%   { transform: translateY(-10px) rotate(0) } 
            100% { transform: translateY(120vh) rotate(540deg) } 
          }
        `}</style>
      </div>

      <div className="relative z-10 text-center">
        <div className="text-[22px] font-extrabold text-[#4D4D4D] mb-2">
          Erfolgreich
        </div>

        <Title level={3} className="!mt-6 !mb-2 text-[#82B400] font-extrabold">
          Glückwunsch!
        </Title>
        <Text className="block text-neutral-700 max-w-md mx-auto leading-snug">
          Du hast deine Hausaufgabe geschafft 🎉<br />
          Kibundo ist stolz auf dich!
        </Text>

        {task && (
          <div className="mt-5 text-left max-w-md mx-auto bg-white/70 backdrop-blur rounded-xl p-3 shadow-sm">
            <div className="font-semibold text-[#2b6a5b]">
              {task.what || "Aufgabe"}
            </div>
            {task.description && (
              <div className="text-sm text-[#5c6b6a]">{task.description}</div>
            )}
            {task.imageDataUrl && (
              <img
                src={task.imageDataUrl}
                alt="Aufgabe"
                className="mt-3 rounded-lg max-h-64 object-contain w-full"
              />
            )}
          </div>
        )}

        {task && (
          <div className="mt-8 max-w-md mx-auto bg-white/80 backdrop-blur rounded-xl p-4 shadow-sm">
            <div className="text-left">
              <div className="font-semibold text-[#2b6a5b]">
                Zeig dein Ergebnis
              </div>
              <Text className="block text-sm text-[#5c6b6a] mt-1">
                Lade ein Foto hoch, damit Kibundo deine erledigte Hausaufgabe
                sehen kann.
              </Text>
            </div>

            {completionPhotoUrl ? (
              <img
                src={completionPhotoUrl}
                alt="Abschlussfoto"
                className="mt-4 rounded-lg max-h-64 object-contain w-full border border-[#d9e5df]"
              />
            ) : (
              <div className="mt-4 w-full rounded-lg border-2 border-dashed border-[#c7d7d1] bg-white/60 text-center py-10 text-[#7a8b85] text-sm">
                Noch kein Abschlussfoto hochgeladen
              </div>
            )}

            {completionDateLabel && (
              <Text className="block text-xs text-[#2b6a5b] mt-3">
                Erledigt am {completionDateLabel}
              </Text>
            )}

            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              <Button
                type="primary"
                size="large"
                className="rounded-xl !bg-[#2b6a5b] !border-none !px-6 !h-11 font-semibold"
                onClick={handleSelectPhoto}
                loading={savingPhoto}
              >
                {completionPhotoUrl ? "Foto ändern" : "Foto hinzufügen"}
              </Button>
              {completionPhotoUrl && (
                <Button
                  size="large"
                  className="rounded-xl !px-6 !h-11"
                  onClick={handleRemovePhoto}
                  disabled={savingPhoto}
                >
                  Foto entfernen
                </Button>
              )}
              <Button
                size="large"
                className="rounded-xl !px-6 !h-11"
                onClick={isCompleted ? handleMarkUndone : handleMarkCompleted}
                disabled={savingPhoto}
                type={isCompleted ? "default" : "primary"}
              >
                {isCompleted ? "Als offen markieren" : "Als erledigt markieren"}
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2 justify-center pb-[env(safe-area-inset-bottom)]">
          <Button
            type="primary"
            size="large"
            className="rounded-xl !bg-[#FF7900] !border-none !px-8 !h-12 text-[16px] font-bold"
            onClick={() => {
              navigate("/student/homework");
            }}
          >
            Zur Aufgabenliste
          </Button>
          {task && (conversationId || task?.scanId) && (
            <Button
              size="large"
              className="rounded-xl !px-8 !h-12"
              onClick={handleViewChat}
            >
              Chatverlauf ansehen
            </Button>
          )}
          <Button
            size="large"
            className="rounded-xl !px-8 !h-12"
            onClick={() => {
              navigate("/student/homework/doing");
            }}
          >
            Neue Aufgabe hinzufügen
          </Button>
        </div>
      </div>
    </div>
  );
}
