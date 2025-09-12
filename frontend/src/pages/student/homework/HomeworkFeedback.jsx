// src/pages/student/homework/HomeworkFeedback.jsx
import React, { useEffect, useMemo } from "react";
import { Typography, Button } from "antd";
import { useNavigate, useLocation } from "react-router-dom";

/* ✅ Backgrounds (relative to this file location) */
import globalBg from "../../../assets/backgrounds/global-bg.png";
import intBack from "../../../assets/backgrounds/int-back.png";

const { Title, Text } = Typography;

const TASKS_KEY = "kibundo.homework.tasks.v1";
const PROGRESS_KEY = "kibundo.homework.progress.v1";

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); }
  catch { return []; }
}

export default function HomeworkFeedback() {
  const navigate = useNavigate();
  const location = useLocation();

  // taskId may come from state or ?taskId=...
  const taskId =
    location.state?.taskId ||
    new URLSearchParams(location.search).get("taskId");

  const tasks = useMemo(() => loadTasks(), []);
  const task = useMemo(
    () => tasks.find((t) => t.id === taskId),
    [tasks, taskId]
  );

  // Persist step 2 so ProgressBar shows "Done"
  useEffect(() => {
    try {
      localStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({ step: 2, taskId: taskId || null })
      );
    } catch {}
  }, [taskId]);

  return (
    <div className="relative min-h-[50dvh] flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* ---------- BACKGROUND LAYERS ---------- */}
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

      {/* ---------- CONFETTI ANIMATION ---------- */}
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

      {/* ---------- CONTENT ---------- */}
      <div className="relative z-10 text-center">
        <div className="text-[22px] font-extrabold text-[#4D4D4D] mb-2">Erfolgreich</div>

        {/* (Mascot removed — comes from HomeworkLayout) */}

        <Title level={3} className="!mt-6 !mb-2 text-[#82B400] font-extrabold">
          Glückwunsch!
        </Title>
        <Text className="block text-neutral-700 max-w-md mx-auto leading-snug">
          Du hast deine Hausaufgabe geschafft 🎉<br />
          Kibundo ist stolz auf dich!
        </Text>

        {/* Optional recap of the finished task */}
        {task && (
          <div className="mt-5 text-left max-w-md mx-auto bg-white/70 backdrop-blur rounded-xl p-3 shadow-sm">
            <div className="font-semibold text-[#2b6a5b]">{task.what || "Aufgabe"}</div>
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

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-2 justify-center">
          <Button
            type="primary"
            size="large"
            className="rounded-xl !bg-[#FF7900] !border-none !px-8 !h-12 text-[16px] font-bold"
            onClick={() => navigate("/student/homework")}
          >
            Zur Aufgabenliste
          </Button>
          <Button
            size="large"
            className="rounded-xl !px-8 !h-12"
            onClick={() => navigate("/student/homework/chat", { state: { taskId } })}
            disabled={!taskId}
          >
            Weiter chatten
          </Button>
          <Button
            size="large"
            className="rounded-xl !px-8 !h-12"
            onClick={() => navigate("/student/homework/doing")}
          >
            Neue Aufgabe hinzufügen
          </Button>
        </div>
      </div>
    </div>
  );
}
