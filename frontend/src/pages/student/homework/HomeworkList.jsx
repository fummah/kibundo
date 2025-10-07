// src/pages/student/homework/HomeworkList.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatStripSpacer } from "@/components/student/mobile/FooterChat.jsx";
import { CheckOutlined, LeftOutlined, RightOutlined, PlusOutlined } from "@ant-design/icons";
import {
  CalculatorOutlined,
  ReadOutlined,
  EditOutlined,
  ScissorOutlined,
  ExperimentOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";

// localStorage keys
const TASKS_KEY = "kibundo.homework.tasks.v1";
const PROGRESS_KEY = "kibundo.homework.progress.v1";

// Adjusted column widths so "fertig" column fits properly
const COLS = "140px 72px minmax(0,0.9fr) 96px 64px";

// Subject icons (swap emoji for your real assets anytime)
const SUBJECTS = {
  Mathe: { color: "#bfe3ff", icon: "🔢" },
  Deutsch: { color: "#e6f6c9", icon: "📗" },
  Sonstiges: { color: "#ffe2e0", icon: "🧩" },
};

// fallback demo items if localStorage is empty
const FALLBACK = [
  { id: "demo1", subject: "Mathe", what: "Multiplikations Aufgaben", description: "Multiplikations Aufgaben", due: "Mi. 07.08", done: false, createdAt: "2024-08-06T10:00:00Z" },
  { id: "demo2", subject: "Mathe", what: "Geteilt durch", description: "Geteilt durch", due: "Mi. 07.08", done: true, createdAt: "2024-08-06T10:10:00Z" },
  { id: "demo3", subject: "Mathe", what: "7er Reihe üben", description: "7er Reihe üben", due: "Do. 08.08", done: false, createdAt: "2024-08-07T08:00:00Z" },
  { id: "demo4", subject: "Deutsch", what: "Lesen", description: "Lesen inkl. Beschreibung", due: "Mi. 07.08", done: false, createdAt: "2024-08-06T09:00:00Z" },
  { id: "demo5", subject: "Deutsch", what: "Aufsatz schreiben", description: "Elefanten in der Wildnis", due: "Mo. 12.08", done: false, createdAt: "2024-08-08T12:00:00Z" },
  { id: "demo6", subject: "Sonstiges", what: "Drachen basteln", description: "Einen kleinen Drachen", due: "Mo. 12.08", done: false, createdAt: "2024-08-08T13:00:00Z" },
  { id: "demo7", subject: "Sonstiges", what: "Farben sortieren", description: "Kreative Aufgabe", due: "Mo. 12.08", done: false, createdAt: "2024-08-08T14:00:00Z" },
  { id: "demo8", subject: "Mathe", what: "Arbeitsblatt 3", description: "Division", due: "Di. 13.08", done: false, createdAt: "2024-08-09T08:00:00Z" },
  { id: "demo9", subject: "Deutsch", what: "Wörter üben", description: "Rechtschreibung", due: "Di. 13.08", done: false, createdAt: "2024-08-09T09:00:00Z" },
];

// load tasks from localStorage; sort newest first
function loadTasks() {
  try {
    const arr = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
    if (Array.isArray(arr) && arr.length) {
      return [...arr].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
    }
  } catch {}
  return FALLBACK;
}

// Choose icon for the "What" column (icon-only)
function WhatIcon({ what = "", subject = "" }) {
  const w = (what || "").toLowerCase();
  const s = (subject || "").toLowerCase();

  if (s.includes("mathe") || /multiply|division|divide|reihe|worksheet|aufgaben|task|rechnung|arith|blatt/i.test(w)) {
    return <CalculatorOutlined style={{ fontSize: 18, color: "#2b6a5b" }} />;
  }
  if (/lesen|read|vorlesen|buch|text/i.test(w) || s.includes("deutsch")) {
    return <ReadOutlined style={{ fontSize: 18, color: "#2b6a5b" }} />;
  }
  if (/aufsatz|essay|schreiben|write/i.test(w)) {
    return <EditOutlined style={{ fontSize: 18, color: "#2b6a5b" }} />;
  }
  if (/basteln|craft|schere|paper|drachen/i.test(w)) {
    return <ScissorOutlined style={{ fontSize: 18, color: "#2b6a5b" }} />;
  }
  if (/experiment|lab|science|versuch/i.test(w)) {
    return <ExperimentOutlined style={{ fontSize: 18, color: "#2b6a5b" }} />;
  }
  return <QuestionCircleOutlined style={{ fontSize: 18, color: "#2b6a5b" }} />;
}

const CompactRow = ({ id, subject, what, description, due, done, onOpen }) => {
  const meta = SUBJECTS[subject] || { color: "#eef0f3", icon: "📚" };
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
      {/* Col 1: Fächer (icon + label) */}
      <div className="flex items-center gap-2 px-3" style={{ backgroundColor: meta.color }} role="cell">
        <span className="text-[16px]" aria-hidden>{meta.icon}</span>
        <span className="font-semibold text-[#2b2b2b]">{subject || "Sonstiges"}</span>
      </div>

      {/* Col 2: Was (ICON-ONLY) */}
      <div className="px-3 py-2 flex items-center justify-center" role="cell" title={what} aria-label={what}>
        <WhatIcon what={what} subject={subject} />
        <span className="sr-only">{what}</span>
      </div>

      {/* Col 3: Beschreibung */}
      <div className="px-3 py-2 text-[#5c6b6a] truncate" role="cell">
        {description || "—"}
      </div>

      {/* Col 4: Bis wann */}
      <div className="px-3 py-2" role="cell">
        <span className="inline-block bg-[#e9f2ef] text-[#2b6a5b] px-2.5 py-[3px] rounded-full text-[12px] font-semibold">
          {due || "—"}
        </span>
      </div>

      {/* Col 5: fertig */}
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
          <span className="inline-grid place-items-center w-6 h-6 rounded-full bg-[#e8efe9]" title="offen" aria-label="offen" />
        )}
      </div>
    </div>
  );
};

export default function HomeworkList() {
  const navigate = useNavigate();
  const allRows = loadTasks();

  const pageSize = 7;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(allRows.length / pageSize));

  const rows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allRows.slice(start, start + pageSize);
  }, [allRows, page]);

  // Clicking a task → Doing if open, Feedback if done
  const openTask = (r) => {
    try {
      localStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({ step: r.done ? 2 : 1, taskId: r.id })
      );
    } catch {}
    if (r.done) {
      navigate("/student/homework/feedback", { state: { taskId: r.id } });
    } else {
      navigate("/student/homework/doing", { state: { taskId: r.id } });
    }
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
          <div className="px-3 py-2" role="columnheader">Fächer</div>
          <div className="px-3 py-2 text-center" role="columnheader">Was</div>
          <div className="px-3 py-2" role="columnheader">Beschreibung</div>
          <div className="px-3 py-2" role="columnheader">Bis wann</div>
          <div className="px-3 py-2 text-center" role="columnheader">fertig</div>
        </div>

        {/* Body */}
        {rows.length ? (
          <div className="divide-y-2 divide-gray-300" role="rowgroup">
            {rows.map((r) => (
              <CompactRow key={r.id || `${r.subject}-${r.what}`} {...r} onOpen={() => openTask(r)} />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-[#51625e]">
            Keine Aufgaben vorhanden.
            <div className="mt-3">
              <button
                type="button"
                onClick={() => navigate("/student/homework/doing")}
                className="px-3 py-1.5 rounded-full bg-[#e7ecea] text-[#51625e]"
              >
                Aufgabe hinzufügen
              </button>
            </div>
          </div>
        )}

        {/* Pagination */}
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

          {/* Floating Action Button */}
          <button
            onClick={() => navigate("/student/homework/doing")}
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
      {/* Reserve space for the sticky footer chat so it doesn't overlap content */}
      <ChatStripSpacer />
    </>
  );
}
