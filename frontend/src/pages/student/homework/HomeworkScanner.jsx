import React, { useState } from "react";
import { App } from "antd";
import { useChatDock } from "@/context/ChatDockContext.jsx";

export default function HomeworkScanner({ userId }) {
  const { message: antdMessage } = App.useApp?.() ?? { message: { success: () => {}, error: () => {}, warning: () => {} } };
  const { openChat, expandChat } = useChatDock?.() ?? {};
  const [file, setFile] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) return alert("Select a file first");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);

    try {
      const res = await fetch("http://localhost:3001/api/ai/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

      const data = await res.json();
      setScanResult(data);

      // Prepare chat open with image + analysis
      let objectUrl = null;
      try {
        objectUrl = URL.createObjectURL(file);
        // auto revoke later
        setTimeout(() => URL.revokeObjectURL(objectUrl), 5 * 60 * 1000);
      } catch {}

      const nowIso = new Date().toISOString();
      const initialMessages = [];
      // student image message
      if (objectUrl) {
        initialMessages.push({
          id: Date.now(),
          from: "student",
          type: "image",
          content: { url: objectUrl, file },
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          timestamp: nowIso,
        });
      }
      // agent analysis message
      const extracted = data?.scan?.raw_text;
      const qa = Array.isArray(data?.parsed?.questions) ? data.parsed.questions : [];
      const analysisText = [
        extracted ? `Ich habe folgenden Text erkannt:\n\n${extracted}` : null,
        qa.length
          ? `Ich habe auch Fragen und Antworten erkannt:\n\n${qa
              .map((q, i) => `Frage ${i + 1}: ${q?.text || "-"}\nAntwort: ${q?.answer || "(keine)"}`)
              .join("\n\n")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      initialMessages.push({
        id: Date.now() + 1,
        from: "agent",
        type: "text",
        content:
          analysisText ||
          "Das Bild wurde hochgeladen und analysiert, aber ich konnte keine Details extrahieren.",
        timestamp: new Date().toISOString(),
      });

      // Minimal task stub for persistence keying
      const task = {
        id: data?.scan?.id || `task_${Date.now().toString(36)}`,
        what: "Foto-Aufgabe",
        description: file?.name || "Hochgeladene Hausaufgabe",
        source: "image",
        createdAt: nowIso,
        updatedAt: nowIso,
        hasImage: true,
        // provide context for HomeworkChat
        scanId: data?.scan?.id || null,
        userId: userId || null,
        messages: initialMessages,
      };

      // Open dock chat in homework mode; ChatDockContainer will render HomeworkChat
      if (openChat) {
        openChat({ mode: "homework", task, initialMessages });
        expandChat?.();
        antdMessage?.success?.("Analyse abgeschlossen – Chat geöffnet.");
      }
    } catch (e) {
      console.error(e);
      antdMessage?.error?.("Upload/Analyse fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="scanner" style={{ padding: 20 }}>
      {!scanResult && (
        <>
          <h2>📷 Upload Homework</h2>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button onClick={handleUpload} disabled={loading}>
            {loading ? "Scanning..." : "Upload & Analyze"}
          </button>
        </>
      )}

      {/* After scan, the HomeworkChat is opened via the dock; keep summary visible if needed */}
      {scanResult && (
        <>
          <h3>✅ Homework Scanned</h3>
          <p><b>Extracted Text (summary):</b></p>
          <pre
            style={{
              background: "#f3f3f3",
              padding: 10,
              borderRadius: 8,
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {scanResult?.scan?.raw_text || "(raw text shown here)"}
          </pre>
          <p className="mt-2">Der detaillierte Chat wurde unten geöffnet.</p>
        </>
      )}
    </div>
  );
}
