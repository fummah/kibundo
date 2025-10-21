// src/components/chat/ChatBot.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import api from "@/api/axios";

/** Normalize the BE list payload into a plain array */
const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.messages)) return data.messages;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

/** Defensive content renderer (stringify objects/arrays) */
const renderContent = (c) => {
  if (c == null) return "";
  if (typeof c === "string" || typeof c === "number" || typeof c === "boolean") {
    return String(c);
  }
  try {
    return JSON.stringify(c, null, 2);
  } catch {
    return String(c);
  }
};

export default function ChatBot({ conversationId, userId, scanId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [convId, setConvId] = useState(conversationId || null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  // Keep convId in sync with external props
  useEffect(() => {
    setConvId(conversationId || null);
  }, [conversationId]);

  // When a new scan is provided, start a fresh conversation by default
  useEffect(() => {
    if (scanId) setConvId(null);
  }, [scanId]);

  /** Load full conversation history (server is source of truth) */
  const fetchMessages = async (cid, signal) => {
    if (!cid) return;
    const { data } = await api.get(`ai/conversations/${cid}/messages`, { signal });
    const list = toArray(data).map((m) => ({
      id: m.id ?? `${m.sender || "agent"}|${m.timestamp || Date.now()}|${String(m.content).slice(0, 32)}`,
      sender: (m.sender || "agent").toLowerCase(),
      content: m.content ?? "",
      timestamp: m.timestamp || new Date().toISOString(),
    }));
    setMessages(list);
  };

  // Initial fetch if we received a conversationId
  useEffect(() => {
    if (!convId) return;
    const ctrl = new AbortController();
    fetchMessages(convId, ctrl.signal).catch((e) => {
      if (e.name !== "CanceledError" && e.name !== "AbortError") {
        // eslint-disable-next-line no-console
      }
    });
    return () => ctrl.abort();
  }, [convId]);

  /** Send a message; retry without convId on 404/400 to create a new convo */
  const sendMessage = async () => {
    const msg = text.trim();
    if (!msg) return;
    if (sendingRef.current || sending) return;
    sendingRef.current = true;
    setSending(true);

    try {
      // Append to existing if we have an id; otherwise create
      let path = convId ? `ai/conversations/${convId}/message` : `ai/conversations/message`;
      let resp;
      try {
        resp = await api.post(path, { userId, message: msg, scanId });
      } catch (err) {
        const code = err?.response?.status;
        // If we tried to append but the convo doesn't exist, retry create
        if (convId && (code === 404 || code === 400)) {
          resp = await api.post(`ai/conversations/message`, { userId, message: msg, scanId });
        } else {
          throw err;
        }
      }

      const j = resp?.data || {};
      // server may return a (new) conversationId
      if (j?.conversationId && j.conversationId !== convId) {
        setConvId(j.conversationId);
      }

      const cid = j?.conversationId || convId;
      // Best effort: refresh history; fallback to appending answer if available
      if (cid) {
        await fetchMessages(cid);
      } else if (j?.answer) {
        setMessages((prev) => [
          ...prev,
          { id: `u|${Date.now()}`, sender: "student", content: msg, timestamp: new Date().toISOString() },
          { id: `a|${Date.now()}`, sender: "agent", content: j.answer, timestamp: new Date().toISOString() },
        ]);
      }

      setText("");
    } catch (e) {
      // eslint-disable-next-line no-console
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 10,
        padding: 10,
        marginTop: 20,
        maxWidth: 600,
      }}
    >
      <h3>🧠 Ask the Homework Assistant</h3>

      <div
        style={{
          height: 260,
          overflowY: "auto",
          padding: 10,
          background: "#f9f9f9",
          borderRadius: 6,
          marginBottom: 10,
        }}
      >
        {Array.isArray(messages) && messages.length > 0 ? (
          messages.map((m, i) => {
            const isStudent = (m.sender || "").toLowerCase() === "student";
            return (
              <div
                key={m.id ?? i}
                style={{
                  textAlign: isStudent ? "right" : "left",
                  margin: "8px 0",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    background: isStudent ? "#007bff" : "#eee",
                    color: isStudent ? "#fff" : "#000",
                    padding: "8px 12px",
                    borderRadius: 10,
                    maxWidth: "80%",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {renderContent(m.content)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#777",
                    marginTop: 4,
                  }}
                >
                  {new Date(m.timestamp || Date.now()).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ color: "#777" }}>Keine Nachrichten in dieser Unterhaltung.</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && canSend) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Frag etwas zur Hausaufgabe…"
          style={{ flex: 1, padding: 8, borderRadius: 6 }}
          disabled={sending}
        />
        <button onClick={sendMessage} disabled={!canSend} style={{ padding: "0 14px" }}>
          {sending ? "Senden…" : "Senden"}
        </button>
      </div>
    </div>
  );
}
