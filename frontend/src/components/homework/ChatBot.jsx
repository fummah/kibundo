import React, { useEffect, useState } from "react";
import api from "@/api/axios";

export default function ChatBot({ conversationId, userId, scanId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [convId, setConvId] = useState(conversationId);

  async function sendMessage() {
    if (!text.trim()) return;

    try {
      const resp = await api.post(
        `/conversations/${convId || ""}/message`,
        { userId, message: text, scanId }
      );

      const j = resp.data;
      setConvId(j.conversationId);

      // fetch messages
      const r2 = await api.get(`/conversations/${j.conversationId}/messages`);
      setMessages(r2.data);
      setText("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  useEffect(() => {
    if (!convId) return;
    (async () => {
      try {
        const r = await api.get(`/conversations/${convId}/messages`);
        setMessages(r.data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    })();
  }, [convId]);

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
        {messages.map((m) => (
          <div
            key={m.id}
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
