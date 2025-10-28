import React, { useState } from "react";
import {
  CheckOutlined,
  CalculatorOutlined,
  ReadOutlined,
  EditOutlined,
  ScissorOutlined,
  ExperimentOutlined,
  QuestionCircleOutlined,
  DeleteOutlined,
  MoreOutlined,
} from "@ant-design/icons";

// Subject visual meta
const SUBJECTS = {
  Mathe: { color: "#ff8a3d", icon: "🔢" }, // Orange
  Deutsch: { color: "#3b82f6", icon: "📗" }, // Blue
  Sonstiges: { color: "#10b981", icon: "🧩" }, // Green
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
  onEdit,
  onDelete,
  onMarkDone,
}) => {
  const [showActions, setShowActions] = useState(false);
  const meta = SUBJECTS[subject] || { color: "#ff8a3d", icon: "📚" };
  const scanDate = formatScanDate(createdAt);

  const handleCardClick = () => {
    // 🔥 Open the chat directly when card is clicked
    console.log("📋 HomeworkCard clicked, opening chat for:", id);
    onOpen?.();
  };

  const handleActionClick = (e, action) => {
    e.stopPropagation();
    if (action === 'edit') onEdit?.();
    if (action === 'delete') onDelete?.();
    if (action === 'mark') onMarkDone?.();
  };

  const handleToggleActions = (e) => {
    e.stopPropagation();
    setShowActions(!showActions);
  };

  // Format due date to match the style (Mi. 10.08.)
  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const days = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
      const dayName = days[date.getDay()];
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${dayName} ${day}.${month}.`;
    } catch {
      return null;
    }
  };

  return (
    <div
      className="relative w-full max-w-xs mx-auto rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg"
      style={{ backgroundColor: meta.color }}
      onClick={handleCardClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleCardClick()}
      role="button"
      tabIndex={0}
      aria-label={`Aufgabe: ${subject || "Sonstiges"} – ${what || ""}`}
    >
      {/* Menu Button (top-right) */}
      <button
        className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all shadow-sm"
        onClick={handleToggleActions}
        aria-label="Aktionen anzeigen"
      >
        <MoreOutlined className="text-gray-700" style={{ fontSize: 16 }} />
      </button>

      {/* Top Section - Icon */}
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 bg-white rounded-full border border-gray-300 flex items-center justify-center">
          <div className="flex flex-wrap justify-center items-center w-8 h-8 text-xs font-bold">
            <span className="text-green-600">1</span>
            <span className="text-blue-600">2</span>
            <span className="text-red-600">3</span>
          </div>
        </div>
      </div>

      {/* Middle Section - Content */}
      <div className="text-center text-white mb-6">
        <h3 className="text-xl font-bold mb-2">{subject || "Sonstiges"}</h3>
        <p className="text-sm mb-2">{what || "Aufgabe"}</p>
        {due && (
          <p className="text-sm">{formatDueDate(due)}</p>
        )}
      </div>

      {/* Bottom Section - Action Buttons */}
      {showActions && (
        <div className="flex justify-center gap-4">
          <button
            onClick={(e) => handleActionClick(e, 'edit')}
            className="w-10 h-10 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Bearbeiten"
          >
            <EditOutlined style={{ color: meta.color }} className="text-lg" />
          </button>
          <button
            onClick={(e) => handleActionClick(e, 'delete')}
            className="w-10 h-10 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Löschen"
          >
            <DeleteOutlined style={{ color: meta.color }} className="text-lg" />
          </button>
          <button
            onClick={(e) => handleActionClick(e, 'mark')}
            className="w-10 h-10 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
          >
            <CheckOutlined style={{ color: meta.color }} className="text-lg" />
          </button>
        </div>
      )}
    </div>
  );
};

export default HomeworkCard;
