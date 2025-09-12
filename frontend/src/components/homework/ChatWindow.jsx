// src/components/homework/ChatWindow.jsx
import React, { useRef, useEffect, useState, useCallback } from "react";
import { Input, Space, Empty, Button } from "antd";
import { SendOutlined } from "@ant-design/icons";
import BuddyCharacter from "./BuddyCharacter";

const { TextArea } = Input;

export default function ChatWindow({
  messages = [],
  onSend,
  footerExtra = null,
  maxLength = 500,          // optional guard
  placeholder = "Nachricht eingeben…",
}) {
  const [text, setText] = useState("");
  const scrollRef = useRef(null);

  const canSend = text.trim().length > 0;

  const submit = useCallback(() => {
    const v = text.trim();
    if (!v) return;
    onSend?.(v);
    setText("");
  }, [text, onSend]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Keyboard: Enter = send, Shift+Enter = newline
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <>
      {/* Conversation area */}
      <div
        ref={scrollRef}
        className="mt-1 rounded-xl border bg-white/70 p-3"
        style={{ minHeight: 220, maxHeight: 360, overflow: "auto" }}
        aria-label="Konversationsverlauf"
      >
        {messages.length === 0 ? (
          <Empty description="Hier erscheinen Tipps & Ermutigungen." />
        ) : (
          <Space direction="vertical" style={{ width: "100%" }}>
            {messages.map((m, i) =>
              m.role === "assistant" ? (
                <BuddyCharacter key={i} text={m.text} />
              ) : (
                <div
                  key={i}
                  className="bg-blue-50 rounded-lg p-2 border border-blue-100 text-blue-700 self-end"
                  aria-label="Nachricht von dir"
                >
                  {m.text}
                </div>
              )
            )}
          </Space>
        )}
      </div>

      {/* Input + extra controls */}
      <Space className="w-full mt-3" wrap>
        <TextArea
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            setText(maxLength ? v.slice(0, maxLength) : v);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoSize={{ minRows: 1, maxRows: 4 }}
          aria-label="Nachricht eingeben"
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={submit}
          disabled={!canSend}
        >
          Senden
        </Button>
        {footerExtra}
      </Space>
    </>
  );
}
