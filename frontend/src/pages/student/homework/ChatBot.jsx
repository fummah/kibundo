import React, { useEffect, useState } from "react";
import api from "@/api/axios";

export default function ChatBot({ conversationId, userId, scanId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [convId, setConvId] = useState(conversationId);

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
      let urlPath = convId
        ? `/ai/conversations/${convId}/message`
        : `/ai/conversations/message`;
      let j;
      try {
        const { data } = await api.post(urlPath, { userId, message: text, scanId });
        j = data;
      } catch (err) {
        if (convId) {
          // Retry once without convId (let server create a conversation)
          console.warn("sendMessage failed with convId, retrying w/o id", err?.response?.status);
          try {
            const { data } = await api.post(`/ai/conversations/message`, { userId, message: text, scanId });
            j = data;
          } catch (err2) {
            console.error("sendMessage failed", err2?.response?.status);
            return;
          }
        } else {
          console.error("sendMessage failed", err?.response?.status);
          return;
        }
      }

      if (j?.conversationId) setConvId(j.conversationId);

      const cid = j?.conversationId || convId;
      if (!cid) return;

      // fetch messages
      try {
        const { data: msgs } = await api.get(`/ai/conversations/${cid}/messages`);
        setMessages(toArray(msgs));
        setText("");
      } catch (e) {
        console.error("fetch messages failed", e?.response?.status);
        return;
      }
    } catch (e) {
      console.error("ChatBot sendMessage error", e);
    }
  }

  useEffect(() => {
    if (!convId) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const { data: msgs } = await api.get(
          `/ai/conversations/${convId}/messages`,
          { signal: ctrl.signal }
        );
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
