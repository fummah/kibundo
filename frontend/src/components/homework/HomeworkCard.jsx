import React from "react";
import {
  CheckOutlined,
  CalculatorOutlined,
  ReadOutlined,
  EditOutlined,
  ScissorOutlined,
  ExperimentOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";

// Subject visual meta
const SUBJECTS = {
  Mathe: { color: "#bfe3ff", icon: "🔢" },
  Deutsch: { color: "#e6f6c9", icon: "📗" },
  Sonstiges: { color: "#ffe2e0", icon: "🧩" },
};

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

// Format scan date
function formatScanDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "heute";
    if (diffDays === 1) return "gestern";
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "—";
  }
}

const HomeworkCard = ({
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
      className="group bg-white rounded-xl border-2 border-gray-200 hover:border-[#2b6a5b] hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen?.()}
      role="button"
      tabIndex={0}
      aria-label={`Aufgabe öffnen: ${subject || "Sonstiges"} – ${what || ""}`}
    >
      {/* Header with subject and status */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: meta.color }}
          >
            <span className="text-[16px]" aria-hidden>
              {meta.icon}
            </span>
            <span className="font-semibold text-[#2b2b2b] text-sm">
              {subject || "Sonstiges"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <WhatIcon what={what} subject={subject} />
            <span className="text-sm text-gray-600 font-medium">{what}</span>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {done ? (
            <div className="flex items-center gap-2">
              <span
                className="inline-grid place-items-center w-6 h-6 rounded-full"
                style={{ backgroundColor: "#ff8a3d", color: "#fff" }}
                aria-label="fertig"
                title="fertig"
              >
                <CheckOutlined style={{ fontSize: 12 }} />
              </span>
              <span className="text-xs text-green-600 font-medium">Fertig</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className="inline-grid place-items-center w-6 h-6 rounded-full bg-[#e8efe9]"
                title="offen"
                aria-label="offen"
              />
              <span className="text-xs text-orange-600 font-medium">Offen</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Beschreibung</h3>
          <p className="text-sm text-[#5c6b6a] line-clamp-2">
            {description || "—"}
          </p>
        </div>

        {/* Footer with dates */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            {due && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Fällig:</span>
                <span className="inline-block bg-[#e9f2ef] text-[#2b6a5b] px-2 py-1 rounded-full font-semibold">
                  {due}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">Gescannt:</span>
            <span className="text-[#667b76]">{scanDate}</span>
          </div>
        </div>
      </div>

      {/* Hover overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#2b6a5b]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

export default HomeworkCard;
