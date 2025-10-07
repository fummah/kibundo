// src/pages/student/homework/HomeworkChat.jsx
import React, { useEffect, useState, useCallback } from "react";
import ChatLayer from "@/components/student/mobile/ChatLayer.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { message as antdMessage } from "antd";
import api from "@/api/axios";
import { useChatDock } from "@/context/ChatDockContext.jsx";

const PROGRESS_KEY = "kibundo.homework.progress.v1";

// Helper to format messages for ChatLayer
const formatMessage = (content, from = "agent", type = "text") => ({
  id: Date.now() + Math.random().toString(36).slice(2, 9),
  from,
  type,
  content,
  timestamp: new Date().toISOString(),
});

// Build a nice Markdown table + extracted text
const qaToMarkdown = (extractedText = "", qa = []) => {
  const hasRows = Array.isArray(qa) && qa.length > 0;
  const header = "| # | Frage | Antwort |\n|---:|-------|---------|";
  const rows = hasRows
    ? qa
        .map((q, i) => {
          const question = (q?.text || q?.question || "—").replace(/\n+/g, " ");
          const answer = (q?.answer || "—").replace(/\n+/g, " ");
          return `| ${i + 1} | ${question} | ${answer} |`;
        })
        .join("\n")
    : "| – | Keine Fragen erkannt | – |";

  const extractedBlock = extractedText?.trim()
    ? `\n\n**Erkannter Text**\n\n\`\`\`\n${extractedText}\n\`\`\`\n`
    : "\n\n**Erkannter Text**\n\n_(keine Daten gefunden)_\n";

  return `**Analyse-Ergebnis**\n\n${header}\n${rows}${extractedBlock}`;
};

// Analyze one File via your endpoint (returns markdown string)
async function analyzeOneImage(file) {
  try {
    const formData = new FormData();
    // Align with ChatLayer default endpoint (it sends key "files")
    formData.append("files", file);

    const { data } = await api.post("/ai/analyze-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // Try to support both shapes:
    // - { analysis: "..." }  OR
    // - { scan: { raw_text }, parsed: { questions: [] } }
    if (typeof data?.analysis === "string" && data.analysis.trim()) {
      return { ok: true, md: data.analysis };
    }

    const extracted = data?.scan?.raw_text || "";
    const qa = Array.isArray(data?.parsed?.questions)
      ? data.parsed.questions
      : [];
    const md = qaToMarkdown(extracted, qa);
    return { ok: true, md };
  } catch (err) {
    console.error("analyzeOneImage error:", err);
    return {
      ok: false,
      err:
        err?.response?.data?.message ||
        "Die Bildanalyse ist fehlgeschlagen. Bitte versuche es erneut.",
    };
  }
}

export default function HomeworkChat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { markHomeworkDone } = useChatDock() || {};

  const [open, setOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    formatMessage(
      "Hallo! Ich bin dein KI-Lernhelfer. Wie kann ich dir bei deinen Hausaufgaben helfen?"
    ),
  ]);

  // Keep progress at step 2 while chatting
  useEffect(() => {
    try {
      const prev = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...prev, step: 2 }));
    } catch {}
  }, []);

  // If we navigated here with an image (or images) from HomeworkDoing
  useEffect(() => {
    const payload = location.state?.image;
    if (!payload) return;

    const files = Array.isArray(payload) ? payload : [payload];
    if (!files.length) return;

    // Push student preview + kick off analyze for each
    (async () => {
      setIsTyping(true);

      // Show each as student image bubble immediately (via dataURL for stability)
      for (const file of files) {
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });

        setChatHistory((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random().toString(36).slice(2, 9),
            from: "student",
            type: "image",
            content: dataUrl,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            timestamp: new Date().toISOString(),
          },
        ]);

        // Add analyzing placeholder
        const analyzingMsg = formatMessage("Ich analysiere dein Bild …", "system");
        setChatHistory((prev) => [...prev, analyzingMsg]);

        const res = await analyzeOneImage(file);
        setChatHistory((prev) => {
          const arr = [...prev];
          // Replace analyzing placeholder with result
          const idx = arr.findIndex((m) => m.id === analyzingMsg.id);
          if (idx !== -1) {
            arr[idx] = formatMessage(
              res.ok ? res.md : res.err,
              res.ok ? "agent" : "system"
            );
          } else {
            arr.push(formatMessage(res.ok ? res.md : res.err, res.ok ? "agent" : "system"));
          }
          return arr;
        });
      }

      setIsTyping(false);
    })();
  }, [location.state?.image]);

  // Send message (text or image dataURL)
  const sendToAI = useCallback(async (content, type = "text") => {
    try {
      setIsTyping(true);

      if (type === "image") {
        // Convert dataURL → File and analyze
        const { content: dataUrl, fileName = "upload.png", fileType = "image/png" } =
          typeof content === "object" ? content : { content };
        if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
          const resp = await fetch(dataUrl);
          const blob = await resp.blob();
          const file = new File([blob], fileName, { type: fileType });
          const result = await analyzeOneImage(file);
          return result.ok
            ? { success: true, response: result.md }
            : { success: false, error: result.err };
        }
        // Fallback
        return {
          success: true,
          response: "Ich habe dein Bild erhalten. Ich versuche, es zu analysieren…",
        };
      }

      // Text → general chat
      const { data } = await api.post("/ai/chat", {
        question: content,
        ai_agent: "ChildAgent",
      });
      return { success: true, response: data?.answer || "—" };
    } catch (error) {
      console.error("AI Chat error:", error);
      return {
        success: false,
        error:
          error?.response?.data?.message ||
          "Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.",
      };
    } finally {
      setIsTyping(false);
    }
  }, []);

  const handleSendMessage = useCallback(
    async (content, type = "text") => {
      if (!content) return;

      // Student message bubble
      const userMessage =
        type === "image"
          ? {
              ...(typeof content === "object" ? content : { content }),
              id: Date.now() + Math.random().toString(36).slice(2, 9),
              from: "student",
              type: "image",
              timestamp: new Date().toISOString(),
            }
          : formatMessage(content, "student");

      setChatHistory((prev) => [...prev, userMessage]);

      // AI response
      const { success, response, error } = await sendToAI(content, type);
      if (success) {
        setChatHistory((prev) => [...prev, formatMessage(response, "agent")]);
      } else {
        antdMessage.error(error);
        setChatHistory((prev) => [
          ...prev,
          formatMessage(error || "Fehler bei der Analyse.", "system"),
        ]);
      }
    },
    [sendToAI]
  );

  const handleDone = () => {
    if (typeof markHomeworkDone === "function") {
      markHomeworkDone();
      return;
    }
    try {
      const prev = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...prev, step: 3 }));
    } catch {}
    navigate("/student/homework/feedback", { replace: true });
  };

  return (
    <div className="relative w-full h-[100dvh] bg-white">
      {open ? (
        <ChatLayer
          className="h-full"
          messages={chatHistory}
          onSendText={(text) => handleSendMessage(text, "text")}
          onSendMedia={(files) => {
            // ChatLayer will pass a FileList | File[] — handle both
            const list = Array.from(files || []);
            if (!list.length) return;

            // For each file: create a dataURL preview message and analyze
            list.forEach((file) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                handleSendMessage(
                  {
                    content: e.target.result, // dataURL
                    type: "image",
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                  },
                  "image"
                );
              };
              reader.readAsDataURL(file);
            });
          }}
          isTyping={isTyping}
          onMinimise={() => setOpen(false)}
        />
      ) : (
        <div className="px-4 py-6">
          <h1 className="text-lg font-semibold mb-2">Chat minimiert</h1>
          <p className="mb-4 text-[15px] text-gray-600">
            Tippe unten, um den Chat wieder zu öffnen.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 rounded-xl bg-black text-white"
            aria-label="Chat wieder öffnen"
          >
            Chat öffnen
          </button>
        </div>
      )}

      {/* Floating DONE CTA above the input area */}
      {open && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 pb-[calc(env(safe-area-inset-bottom)+96px)] flex justify-center">
          <button
            type="button"
            onClick={handleDone}
            className="pointer-events-auto mb-3 inline-flex items-center justify-center px-6 h-11 rounded-xl font-semibold text-white shadow-lg"
            style={{ backgroundColor: "#FF7900" }}
          >
            Fertig
          </button>
        </div>
      )}
    </div>
  );
}
