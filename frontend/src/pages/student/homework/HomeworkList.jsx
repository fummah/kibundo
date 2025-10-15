// src/pages/student/homework/HomeworkList.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChatStripSpacer } from "@/components/student/mobile/FooterChat.jsx";
import {
  CheckOutlined,
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  CalculatorOutlined,
  ReadOutlined,
  EditOutlined,
  ScissorOutlined,
  ExperimentOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import { useChatDock } from "@/context/ChatDockContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import api from "@/api/axios";

// ───────────────────────────────────────────────────────────────────────────────
// Base (unscoped) localStorage keys — will be scoped per-student below
const TASKS_KEY = "kibundo.homework.tasks.v1";
const PROGRESS_KEY = "kibundo.homework.progress.v1";

// Columns (incl. “Gescannt am”)
const COLS = "140px 72px minmax(0,0.9fr) 96px 110px 64px";

// Subject visual meta
const SUBJECTS = {
  Mathe: { color: "#bfe3ff", icon: "🔢" },
  Deutsch: { color: "#e6f6c9", icon: "📗" },
  Sonstiges: { color: "#ffe2e0", icon: "🧩" },
};

// Transform API homework scan data to task format
function transformHomeworkScanToTask(scan) {
  // Derive "what" (task type) from raw_text
  const deriveWhat = (text) => {
    if (!text) return 'Foto-Aufgabe';
    const questionMatch = text.match(/\d+\s*Frage/i);
    if (questionMatch) return questionMatch[0];
    if (text.length > 50) return 'Hausaufgabe';
    return 'Foto-Aufgabe';
  };
  
  return {
    id: `scan_${scan.id}`,
    scanId: scan.id,
    createdAt: scan.created_at,
    updatedAt: scan.created_at,
    subject: scan.detected_subject || 'Sonstiges',
    what: deriveWhat(scan.raw_text),
    description: scan.raw_text ? scan.raw_text.slice(0, 120).trim() + (scan.raw_text.length > 120 ? '...' : '') : (scan.notes || '—'),
    due: null,
    done: false, // Default to false (status column doesn't exist in DB yet)
    source: 'image',
    hasImage: !!scan.file_url,
    fileName: null,
    fileType: null,
    fileSize: null,
    conversationId: null,
    userId: scan.student_id,
  };
}

// Load tasks from one or more keys and merge (sorted newest first)
function loadTasksFromKeys(keys = []) {
  const out = [];
  const seen = new Set();
  for (const k of keys) {
    try {
      const arr = JSON.parse(localStorage.getItem(k) || "[]");
      if (Array.isArray(arr)) {
        for (const t of arr) {
          const id = t?.id || `${t?.what || ""}|${t?.createdAt || ""}`;
          if (seen.has(id)) continue;
          seen.add(id);
          out.push(t);
        }
      }
    } catch {}
  }
  return out.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

// Nice date (Gescannt am)
function formatScanDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

// Derive subject from any available text (analysis/what/description)
function deriveSubjectFromText(text = "") {
  const t = (text || "").toLowerCase();

  // math-ish
  if (
    /mathe|rechnung|addieren|subtrahieren|multiplizieren|division|dividieren|bruch|geometrie|gleichung|reihe|arbeitsblatt|aufgaben|worksheet|task|numbers?|times? table|multiply|divide/.test(
      t
    )
  ) {
    return "Mathe";
  }

  // german/reading/writing-ish
  if (
    /deutsch|lesen|vorlesen|buch|text|aufsatz|schreiben|diktat|grammatik|rechtschreibung|vokabeln|erzählen|bericht/.test(
      t
    )
  ) {
    return "Deutsch";
  }

  return "Sonstiges";
}

// Choose icon by what/subject text
function WhatIcon({ what = "", subject = "" }) {
  const w = (what || "").toLowerCase();
  const s = (subject || "").toLowerCase();
  if (
    s.includes("mathe") ||
    /multiply|division|divide|reihe|worksheet|aufgaben|task|rechnung|arith|blatt/.test(
      w
    )
  ) {
    return <CalculatorOutlined style={{ fontSize: 18, color: "#2b6a5b" }} />;
  }
  if (/lesen|read|vorlesen|buch|text/.test(w) || s.includes("deutsch")) {
    return <ReadOutlined style={{ fontSize: 18, color: "#2b6a5b" }} />;
  }
  if (/aufsatz|essay|schreiben|write/.test(w)) {
    return <EditOutlined style={{ fontSize: 18, color: "#2b6a5b" }} />;
  }
  if (/basteln|craft|schere|paper|drachen/.test(w)) {
    return <ScissorOutlined style={{ fontSize: 18, color: "#2b6a5b" }} />;
  }
  if (/experiment|lab|science|versuch/.test(w)) {
    return <ExperimentOutlined style={{ fontSize: 18, color: "#2b6a5b" }} />;
  }
  return <QuestionCircleOutlined style={{ fontSize: 18, color: "#2b6a5b" }} />;
}

const CompactRow = ({
  id,
  subject,
  what,
  description,
  due,
  done,
  createdAt,
  onOpen,
}) => {
  const meta = SUBJECTS[subject] || { color: "#eef0f3", icon: "📚" };
  const scanDate = formatScanDate(createdAt);
  return (
    <div
      className="grid w-full min-h-[44px] divide-x-2 divide-gray-300
                 bg-white hover:bg-[#f0f7f3] transition-colors duration-150
                 cursor-pointer outline-none"
      style={{ gridTemplateColumns: COLS }}
      role="row"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen?.()}
      aria-label={`Aufgabe öffnen: ${subject || "Sonstiges"} – ${what || ""}`}
    >
      {/* Fächer */}
      <div
        className="flex items-center gap-2 px-3"
        style={{ backgroundColor: meta.color }}
        role="cell"
      >
        <span className="text-[16px]" aria-hidden>
          {meta.icon}
        </span>
        <span className="font-semibold text-[#2b2b2b]">
          {subject || "Sonstiges"}
        </span>
      </div>

      {/* Was (Icon only) */}
      <div
        className="px-3 py-2 flex items-center justify-center"
        role="cell"
        title={what}
        aria-label={what}
      >
        <WhatIcon what={what} subject={subject} />
        <span className="sr-only">{what}</span>
      </div>

      {/* Beschreibung */}
      <div className="px-3 py-2 text-[#5c6b6a] truncate" role="cell">
        {description || "—"}
      </div>

      {/* Bis wann */}
      <div className="px-3 py-2 text-center" role="cell">
        <span className="inline-block bg-[#e9f2ef] text-[#2b6a5b] px-2.5 py-[3px] rounded-full text-[12px] font-semibold">
          {due || "—"}
        </span>
      </div>

      {/* Gescannt am */}
      <div
        className="px-3 py-2 text-center text-[#667b76] text-[12px]"
        role="cell"
      >
        {scanDate}
      </div>

      {/* fertig */}
      <div className="px-3 py-2 flex justify-center items-center" role="cell">
        {done ? (
          <span
            className="inline-grid place-items-center w-6 h-6 rounded-full"
            style={{ backgroundColor: "#ff8a3d", color: "#fff" }}
            aria-label="fertig"
            title="fertig"
          >
            <CheckOutlined style={{ fontSize: 12 }} />
          </span>
        ) : (
          <span
            className="inline-grid place-items-center w-6 h-6 rounded-full bg-[#e8efe9]"
            title="offen"
            aria-label="offen"
          />
        )}
      </div>
    </div>
  );
};

export default function HomeworkList() {
  const navigate = useNavigate();
  const { openChat, expandChat, getChatMessages } = useChatDock(); // ⬅️ we read analysis from chat
  const { user: authUser } = useAuthContext();

  // derive current student id (scope everything by this)
  const studentId = authUser?.id ?? "anon";

  // Build SCOPED storage keys per student
  const TASKS_KEY_USER = `${TASKS_KEY}::u:${studentId}`;
  const PROGRESS_KEY_USER = `${PROGRESS_KEY}::u:${studentId}`;

  // Candidate keys: scoped, legacy unscoped, anon-scoped
  const FALLBACK_KEYS = useMemo(
    () => [TASKS_KEY_USER, TASKS_KEY, `${TASKS_KEY}::u:anon`],
    [TASKS_KEY_USER]
  );

  // Maintain tasks in state - will merge localStorage + API data
  const [localStorageTasks, setLocalStorageTasks] = useState(() => loadTasksFromKeys(FALLBACK_KEYS));
  const [apiTasks, setApiTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Merge and deduplicate tasks from both sources
  const tasks = useMemo(() => {
    const merged = [];
    const seen = new Set();
    
    // Add API tasks first (they're the source of truth from database)
    for (const task of apiTasks) {
      const key = task.scanId ? `scan_${task.scanId}` : task.id;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(task);
    }
    
    // Add localStorage tasks (local-only data)
    for (const task of localStorageTasks) {
      const key = task.scanId ? `scan_${task.scanId}` : task.id;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(task);
    }
    
    // Sort by creation date (newest first)
    return merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [apiTasks, localStorageTasks]);

  // Fetch homework scans from API
  const fetchHomeworkScans = useCallback(async () => {
    if (studentId === "anon") return; // Skip if not authenticated
    
    try {
      setLoading(true);
      console.log(`Fetching homework scans for student ID: ${studentId}`);
      const { data } = await api.get('/homeworkscans', {
        params: { student_id: studentId }
      });
      
      const transformedTasks = Array.isArray(data) 
        ? data.map(transformHomeworkScanToTask)
        : [];
      
      setApiTasks(transformedTasks);
      console.log(`Loaded ${transformedTasks.length} homework scans from database for student ${studentId}`);
      if (transformedTasks.length === 0) {
        console.log('💡 No homework scans found. Make sure the homework_scans table has entries with this student_id.');
      }
    } catch (error) {
      console.warn('Could not fetch homework scans from database:', error.response?.data?.message || error.message);
      console.log('Falling back to localStorage data only');
      // Silently fail - localStorage data will still be available
      setApiTasks([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  // Refresh localStorage tasks
  const refreshLocalTasks = useCallback(() => {
    setLocalStorageTasks(loadTasksFromKeys(FALLBACK_KEYS));
  }, [FALLBACK_KEYS]);

  // Fetch on mount and when studentId changes
  useEffect(() => {
    fetchHomeworkScans();
  }, [fetchHomeworkScans]);

  // Refresh when window regains focus (user returns from another screen)
  useEffect(() => {
    const onFocus = () => {
      console.log('📋 Window focused, refreshing homework list...');
      refreshLocalTasks();
      fetchHomeworkScans();
    };
    
    window.addEventListener('focus', onFocus);
    
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshLocalTasks, fetchHomeworkScans]);

  useEffect(() => {
    // Update on storage changes (e.g., when HomeworkDoing saves)
    const onStorage = (e) => {
      if (!e?.key) return;
      if (FALLBACK_KEYS.includes(e.key)) {
        refreshLocalTasks();
        fetchHomeworkScans(); // Also refresh API data
      }
    };
    window.addEventListener("storage", onStorage);

    // Listen for custom task update events (fired from HomeworkDoing in same tab)
    const onTaskUpdate = () => {
      console.log('📋 Tasks updated event received, refreshing homework list...');
      refreshLocalTasks();
      fetchHomeworkScans();
    };
    window.addEventListener("kibundo:tasks-updated", onTaskUpdate);

    // Also refresh when user returns to tab
    const onVis = () => {
      if (document.visibilityState === "visible") {
        refreshLocalTasks();
        fetchHomeworkScans();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("kibundo:tasks-updated", onTaskUpdate);
    };
  }, [FALLBACK_KEYS, refreshLocalTasks, fetchHomeworkScans]);

  // Enrich tasks with derived subject/description from latest analysis (if needed)
  const enhancedRows = useMemo(() => {
    return tasks.map((t) => {
      const chatKey = `${t.id}::u:${studentId}`;
      const msgs = getChatMessages?.("homework", chatKey) || [];

      // Find latest analysis table (agent message with content.extractedText/qa)
      const latestTable = [...msgs]
        .reverse()
        .find((m) => m?.type === "table" && m?.from !== "student");

      let analysisText = "";
      if (latestTable) {
        const extracted = latestTable?.content?.extractedText || "";
        const qa = Array.isArray(latestTable?.content?.qa)
          ? latestTable.content.qa
          : [];
        const qaStr =
          qa
            .slice(0, 3)
            .map((q) => [q?.text, q?.answer].filter(Boolean).join(": "))
            .join(" • ") || "";
        analysisText = [extracted, qaStr].filter(Boolean).join(" • ");
      }

      // If subject missing or generic, derive from analysis/what/description
      const baseText = [t.what, t.description, analysisText].filter(Boolean).join(" ");
      const derivedSubject =
        !t.subject || t.subject === "Sonstiges"
          ? deriveSubjectFromText(baseText)
          : t.subject;

      // If description is empty, take a short snippet from analysis
      const derivedDescription =
        t.description && t.description.trim().length > 0
          ? t.description
          : analysisText
          ? analysisText.slice(0, 120)
          : "";

      return {
        ...t,
        subject: derivedSubject,
        description: derivedDescription,
      };
    });
  }, [tasks, getChatMessages, studentId]);

  const pageSize = 7;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(enhancedRows.length / pageSize));

  const rows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return enhancedRows.slice(start, start + pageSize);
  }, [enhancedRows, page]);

  // Clicking a task → open HomeworkChat at last message (restore history)
  const openTask = (task) => {
    try {
      localStorage.setItem(
        PROGRESS_KEY_USER,
        JSON.stringify({ step: task.done ? 2 : 1, taskId: task.id })
      );
    } catch {}

    const chatKey = `homework:${task.id}::u:${studentId}`;

    // Open scoped chat
    openChat?.({
      mode: "homework",
      task: { ...task, userId: studentId },
      key: chatKey,
      restore: true,
      focus: "last",
      analyzeOnOpen: false,
    });

    expandChat?.(true);

    navigate("/student/homework/doing", {
      state: { taskId: task.id, openHomeworkChat: true },
      replace: false,
    });
  };

  return (
    <>
      <section className="w-full">
        <div className="w-full rounded-[20px] overflow-hidden border-2 border-gray-300 bg-white">
          {/* Header */}
          <div
            className="grid w-full divide-x-2 divide-gray-300 border-b-2 border-gray-300 bg-[#f6faf7] text-[#2b6a5b] font-semibold text-[12px] md:text-[13px]"
            style={{ gridTemplateColumns: COLS }}
          >
            <div className="px-3 py-2" role="columnheader">
              Fächer
            </div>
            <div className="px-3 py-2 text-center" role="columnheader">
              Was
            </div>
            <div className="px-3 py-2" role="columnheader">
              Beschreibung
            </div>
            <div className="px-3 py-2 text-center" role="columnheader">
              Bis wann
            </div>
            <div className="px-3 py-2 text-center" role="columnheader">
              Gescannt am
            </div>
            <div className="px-3 py-2 text-center" role="columnheader">
              fertig
            </div>
          </div>

          {/* Body */}
          {rows.length ? (
            <div className="divide-y-2 divide-gray-300" role="rowgroup">
              {rows.map((r) => (
                <CompactRow
                  key={r.id || `${r.subject}-${r.what}`}
                  {...r}
                  onOpen={() => openTask(r)}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-[#51625e]">
              Noch keine Aufgaben gescannt oder hinzugefügt.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/student/homework/doing", {
                      state: { openHomeworkChat: true },
                    })
                  }
                  className="px-3 py-1.5 rounded-full bg-[#e7ecea] text-[#51625e]"
                >
                  Aufgabe hinzufügen
                </button>
              </div>
            </div>
          )}

          {/* Pagination + FAB */}
          <div className="flex items-center justify-between px-3 py-2 border-t-2 border-gray-300 w-full bg-white">
            <button
              className="px-2 py-1 rounded-full bg-[#e7ecea] text-[#51625e] disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <LeftOutlined /> <span className="ml-1">Zurück</span>
            </button>

            <div className="text-[12px] text-[#51625e]">
              Seite <strong>{Math.min(page, pageCount)}</strong> / {pageCount}
            </div>

            <button
              className="px-2 py-1 rounded-full bg-[#e7ecea] text-[#51625e] disabled:opacity-50"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              <span className="mr-1">Weiter</span> <RightOutlined />
            </button>

            {/* FAB */}
            <button
              onClick={() =>
                navigate("/student/homework/doing", {
                  state: { openHomeworkChat: true },
                })
              }
              className="ml-4 w-10 h-10 rounded-full bg-[#2b6a5b] text-white shadow-lg
                     flex items-center justify-center hover:bg-[#1f4f43] transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2b6a5b]"
              aria-label="Neue Aufgabe scannen"
            >
              <PlusOutlined className="text-lg" />
            </button>
          </div>
        </div>
      </section>
      {/* Avoid overlap with sticky footer chat */}
      <ChatStripSpacer />
    </>
  );
}
