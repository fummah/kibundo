// src/pages/student/homework/HomeworkScanner.jsx
import React, { useState } from "react";
import { App } from "antd";
import api from "@/api/axios";
import { useChatDock } from "@/context/ChatDockContext.jsx";

const formatMessage = (content, from = "agent", type = "text", meta = {}) => ({
  id: Date.now() + Math.random().toString(36).slice(2, 9),
  from,
  sender: from,
  type,
  content,
  timestamp: new Date().toISOString(),
  ...meta,
});

export default function HomeworkScanner({ userId }) {
  // antd App context (safe fallback if App provider isn’t mounted)
  const { message: antdMessage } =
    App.useApp?.() ?? { message: { success: () => {}, error: () => {}, warning: () => {} } };

  // chat dock
  const { openChat, expandChat } = useChatDock?.() ?? {};

  const [file, setFile] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("ChildAgent"); // Default fallback

  // Fetch selected agent from backend
  useEffect(() => {
    const fetchSelectedAgent = async () => {
      try {
        const response = await api.get('/aisettings', {
          withCredentials: true,
        });
        if (response?.data?.child_default_ai) {
          setSelectedAgent(response.data.child_default_ai);
          console.log("🎯 HomeworkScanner: Selected agent for homework:", response.data.child_default_ai);
        }
      } catch (error) {
        console.warn("Could not fetch selected agent in HomeworkScanner, using default ChildAgent:", error);
      }
    };
    
    fetchSelectedAgent();
  }, []);

  async function handleUpload() {
    if (!file) {
      antdMessage?.warning?.("Bitte wähle zuerst eine Datei aus.");
      return;
    }

    setLoading(true);

    try {
      // ---- 1) upload via Axios to your API base (no leading slash) ----
      const formData = new FormData();
      formData.append("file", file);
      // Backend gets userId from auth token, not form data

      const res = await api.post("ai/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true, // Include auth headers
      });

      const data = res?.data || {};
      setScanResult(data);

      // ---- 2) prep a transient preview (not persisted) ----
      let objectUrl = null;
      try {
        objectUrl = URL.createObjectURL(file);
        // best-effort cleanup in a few minutes
        setTimeout(() => {
          try { URL.revokeObjectURL(objectUrl); } catch {}
        }, 5 * 60 * 1000);
      } catch {}

      const nowIso = new Date().toISOString();

      const previewMsg = objectUrl
        ? {
            id: Date.now() + Math.random().toString(36).slice(2, 9),
            from: "student",
            sender: "student",
            type: "image",
            content: objectUrl,         // HomeworkChat expects a string src
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            timestamp: nowIso,
            transient: true,            // 🚫 will not be persisted
          }
        : null;

      // ---- 3) build a lightweight agent summary message from the scan ----
      const extracted = data?.scan?.raw_text ?? data?.parsed?.raw_text ?? data?.extractedText ?? "";
      const qa =
        (Array.isArray(data?.parsed?.questions) && data.parsed.questions) ||
        (Array.isArray(data?.qa) && data.qa) ||
        [];

      const parts = [];
      if (extracted) parts.push(`**Erkannter Text**\n\n${extracted}`);
      if (qa.length) {
        parts.push(
          `**Erkannte Fragen & Antworten**\n\n` +
            qa
              .map(
                (q, i) =>
                  `Frage ${i + 1}: ${q?.text || "-"}\nAntwort: ${q?.answer || "(keine)"}`
              )
              .join("\n\n")
        );
      }
      const agentSummary =
        parts.join("\n\n") ||
        "Das Bild wurde hochgeladen. Ich konnte allerdings keine Details extrahieren.";

      const analysisMsg = formatMessage(agentSummary, "agent", "text", { agentName: selectedAgent || "ChildAgent" });

      // ---- 4) construct a minimal task to anchor this chat thread ----
      // carry over IDs so HomeworkChat can keep appending to the same conversation
      const scanId = data?.scan?.id ?? data?.scanId ?? null;
      const conversationId = data?.conversationId ?? null;

      const task = {
        id: scanId || `task_${Date.now().toString(36)}`,
        what: "Foto-Aufgabe",
        description: file?.name || "Hochgeladene Hausaufgabe",
        source: "image",
        createdAt: nowIso,
        updatedAt: nowIso,
        hasImage: true,

        // for HomeworkChat / ChatDock
        userId: userId || null,
        scanId,
        conversationId,

        // seed only these two messages: transient preview + analysis
        messages: [previewMsg, analysisMsg].filter(Boolean),
      };

      // ---- 5) open the dock chat in homework mode ----
      // We DO NOT set analyze=true, because we already uploaded and showed the result.
      if (openChat) {
        openChat({ mode: "homework", task, initialMessages: task.messages, analyze: false });
        expandChat?.();
        antdMessage?.success?.("Analyse abgeschlossen – Chat geöffnet.");
      }
    } catch (e) {
      console.error(e);
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Upload/Analyse fehlgeschlagen.";
      
      // Handle specific image_url error from backend
      const isImageUrlError = msg.includes("image_url") || msg.includes("Invalid type");
      
      let userMessage;
      if (isImageUrlError) {
        userMessage = "Das Bild konnte nicht automatisch analysiert werden. Du kannst trotzdem mit dem Chat fortfahren und mir Fragen stellen!";
      } else {
        userMessage = status ? `${msg} (${status})` : msg;
      }
      
      antdMessage?.error?.(userMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="scanner p-5">
      {!scanResult && (
        <>
          <h2>📷 Upload Homework</h2>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button onClick={handleUpload} disabled={loading} className="ml-2">
            {loading ? "Scanning..." : "Upload & Analyze"}
          </button>
        </>
      )}

      {scanResult && (
        <div className="mt-4">
          <h3>✅ Homework Scanned</h3>
          <p>
            <b>Kurzzusammenfassung (aus Rohtext):</b>
          </p>
          <pre
            style={{
              background: "#f3f3f3",
              padding: 10,
              borderRadius: 8,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {scanResult?.scan?.raw_text || "(kein Rohtext gefunden)"}
          </pre>
          <p className="mt-2 text-sm text-gray-600">
            Der detaillierte Chat wurde unten eröffnet.
          </p>
        </div>
      )}
    </div>
  );
}
