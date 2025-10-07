import React, { useEffect, useState } from "react";

export default function ChatBot({ conversationId, userId, scanId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [convId, setConvId] = useState(conversationId);
  const BASE = "http://localhost:3001";

  const toArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.messages)) return data.messages;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  };

  async function sendMessage() {
    if (!text.trim()) return;
    try {
      // Build proper URL: create vs existing conversation
      let url = convId
        ? `${BASE}/api/ai/conversations/${convId}/message`
        : `${BASE}/api/ai/conversations/message`;
      let resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: text, scanId }),
      });

      if (!resp.ok && convId) {
        // Retry once without convId (let server create a conversation)
        const errText = await resp.text().catch(() => "");
        console.warn("sendMessage failed with convId, retrying w/o id", resp.status, errText);
        url = `${BASE}/api/ai/conversations/message`;
        resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, message: text, scanId }),
        });
      }

      if (!resp.ok) {
        const errText2 = await resp.text().catch(() => "");
        console.error("sendMessage failed", resp.status, errText2);
        return; // don't proceed to GET
      }

      const j = await resp.json();
      if (j?.conversationId) setConvId(j.conversationId);

      const cid = j?.conversationId || convId;
      if (!cid) return;

      // fetch messages
      const r2 = await fetch(
        `${BASE}/api/ai/conversations/${cid}/messages`
      );
      if (!r2.ok) {
        const errText = await r2.text().catch(() => "");
        console.error("fetch messages failed", r2.status, errText);
        return;
      }
      const msgs = await r2.json();
      setMessages(toArray(msgs));
      setText("");
    } catch (e) {
      console.error("ChatBot sendMessage error", e);
    }
  }

  useEffect(() => {
    if (!convId) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await fetch(
          `${BASE}/api/ai/conversations/${convId}/messages`,
          { signal: ctrl.signal }
        );
        if (!r.ok) {
          const errText = await r.text().catch(() => "");
          console.error("initial fetch messages failed", r.status, errText);
          return;
        }
        const msgs = await r.json();
        setMessages(toArray(msgs));
      } catch (e) {
        if (e.name !== "AbortError") console.error("ChatBot init error", e);
      }
    })();
    return () => ctrl.abort();
  }, [convId]);

  // Keep convId in sync with external props
  useEffect(() => {
    setConvId(conversationId || null);
  }, [conversationId]);

  // New scan should start a fresh conversation by default
  useEffect(() => {
    if (scanId) setConvId(null);
  }, [scanId]);

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
          height: 250,
          overflowY: "auto",
          padding: 10,
          background: "#f9f9f9",
          borderRadius: 6,
          marginBottom: 10,
        }}
      >
        {Array.isArray(messages) && messages.map((m, i) => (
          <div
            key={m.id ?? i}
            style={{
              textAlign: m.sender === "student" ? "right" : "left",
              margin: "8px 0",
            }}
          >
            <div
              style={{
                display: "inline-block",
                background: m.sender === "student" ? "#007bff" : "#eee",
                color: m.sender === "student" ? "#fff" : "#000",
                padding: "8px 12px",
                borderRadius: 10,
                maxWidth: "80%",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about the homework..."
          style={{ flex: 1, padding: 8, borderRadius: 6 }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
