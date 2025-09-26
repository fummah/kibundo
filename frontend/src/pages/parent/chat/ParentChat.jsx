import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  Avatar,
  Typography,
  Spin,
  Tooltip,
  Empty,
  Badge,
  Modal,
  App,
  Input,
} from "antd";
import {
  ArrowLeftOutlined,
  SendOutlined,
  CustomerServiceOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import ParentShell from "@/components/parent/ParentShell";
import globalBg from "@/assets/backgrounds/global-bg.png";
import agentIcon from "@/assets/mobile/icons/agent-icon.png";
import studIcon from "@/assets/mobile/icons/stud-icon.png";
import { useAuthContext } from "@/context/AuthContext.jsx";
import api from "@/api/axios";

const { Title, Text } = Typography;
const { TextArea } = Input;

// --- helpers ---
const makeMsg = ({ type, content, sender }) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type, // 'sent' | 'received' | 'system' | 'error'
  content,
  timestamp: new Date(),
  sender,
});

function useAtBottom(containerRef, offset) {
  const [atBottom, setAtBottom] = useState(true);
  const check = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= (offset ?? 24);
    setAtBottom(nearBottom);
  }, [containerRef, offset]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", check, { passive: true });
    check();
    return () => el.removeEventListener("scroll", check);
  }, [check]);

  return {
    atBottom,
    scrollToBottom: () => {
      const el = containerRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    },
  };
}

export default function ParentChat() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { message } = App.useApp();

  const firstName = useMemo(() => user?.first_name || user?.name?.split(" ")[0] || "there", [user]);
  const welcomeMessage = useMemo(
    () => `Hello ${firstName}! I'm your Kibundo AI assistant. How can I help you today?`,
    [firstName]
  );

  const [messages, setMessages] = useState(() => [
    makeMsg({ type: "received", content: welcomeMessage, sender: "Kibundo Assistant" }),
  ]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [warnedClosing, setWarnedClosing] = useState(false);
  const [confirmAutoClose, setConfirmAutoClose] = useState(false);

  const chatRef = useRef(null);
  const endRef = useRef(null);
  const { atBottom, scrollToBottom } = useAtBottom(chatRef, 32);

  // Inactivity: warn at 50s, close at 60s if not cancelled
  useEffect(() => {
    const warnTimer = setTimeout(() => {
      if (!warnedClosing) {
        setWarnedClosing(true);
        setConfirmAutoClose(true);
        message.warning({ content: "You've been inactive. Close chat?", key: "inactive-warn" });
      }
    }, 50000);

    const closeTimer = setTimeout(() => {
      if (confirmAutoClose) handleCloseChat();
    }, 60000);

    return () => {
      clearTimeout(warnTimer);
      clearTimeout(closeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, confirmAutoClose, warnedClosing]);

  const resetInactivity = useCallback(() => {
    setWarnedClosing(false);
    setConfirmAutoClose(false);
  }, []);

  const formatTime = (date) =>
    new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(date);

  const formatDate = (date) => {
    const today = new Date();
    const d = new Date(date);
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  };

  const pushMessage = useCallback((msg) => setMessages((prev) => [...prev, msg]), []);

  const sendToAPI = useCallback(async (text) => {
    try {
      const { data } = await api.post("/ai/chat", { question: text, ai_agent: "ParentAgent" });
      return { ok: true, answer: data?.answer ?? "(No answer returned)" };
    } catch (err) {
      return { ok: false, error: err };
    }
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    resetInactivity();
    setSending(true);

    const userMsg = makeMsg({ type: "sent", content: text, sender: user?.name || "You" });
    pushMessage(userMsg);
    setInput("");

    setTyping(true);
    const res = await sendToAPI(text);
    setTyping(false);

    if (res.ok) {
      pushMessage(makeMsg({ type: "received", content: res.answer, sender: "Kibundo Assistant" }));
    } else {
      const errText = "I'm having trouble connecting right now. Please try again or contact support.";
      pushMessage(makeMsg({ type: "error", content: errText, sender: "Kibundo Assistant" }));
      message.error("Failed to send. Click retry to resend.");
    }

    setSending(false);
  }, [input, sending, sendToAPI, pushMessage, resetInactivity, user?.name]);

  const handleRetryLast = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.type === "sent");
    if (!lastUser) return;
    setInput(lastUser.content);
    setTimeout(() => handleSend(), 0);
  }, [messages, handleSend]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCloseChat = () => {
    Modal.confirm({
      title: "Close chat?",
      icon: <ExclamationCircleOutlined />,
      content: "You can always reopen it from the Parent portal.",
      okText: "Close",
      cancelText: "Stay",
      onOk: () => {
        message.info("Chat closed.");
        navigate(-1);
      },
    });
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success("Copied to clipboard");
    } catch (e) {
      message.warning("Could not copy. Select text manually.");
    }
  };

  return (
    <ParentShell bgImage={globalBg}>
      <div className="w-full min-h-[100dvh] flex flex-col">
        <section className="relative w-full max-w-[720px] mx-auto px-4 pt-6 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              className="!p-0 !h-auto text-neutral-700"
              aria-label="Back"
            />
            <div className="flex items-center gap-3 flex-1">
              <Badge dot color="green">
                <Avatar src={agentIcon} size={40} icon={<CustomerServiceOutlined />} />
              </Badge>
              <div className="min-w-0">
                <Title level={4} className="!m-0 truncate">Kibundo AI Assistant</Title>
                <Text type="secondary" className="block truncate">Friendly • Fast • Private</Text>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip title="Retry last message">
                <Button type="text" icon={<ReloadOutlined />} onClick={handleRetryLast} />
              </Tooltip>
              <Tooltip title="Close">
                <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleCloseChat} />
              </Tooltip>
            </div>
          </div>

          {/* Chat */}
          <Card className="rounded-2xl shadow-sm flex-1 flex flex-col" styles={{ body: { display: "flex", flexDirection: "column", minHeight: 360 } }}>
            <div
              ref={chatRef}
              role="log"
              aria-live="polite"
              className="flex-1 overflow-y-auto space-y-3 p-2"
              style={{ maxHeight: "calc(100vh - 320px)" }}
              onClick={resetInactivity}
            >
              {messages.length === 0 ? (
                <Empty description="No messages yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <>
                  {messages.map((m, idx) => {
                    const showSep = idx === 0 || formatDate(m.timestamp) !== formatDate(messages[idx - 1].timestamp);
                    const isYou = m.type === "sent";

                    let bubbleClass = "bg-gray-100 text-gray-800";
                    if (isYou) bubbleClass = "bg-blue-500 text-white";
                    if (m.type === "error") bubbleClass = "bg-red-50 text-red-600 border border-red-100";
                    if (m.type === "system") bubbleClass = "bg-amber-50 text-amber-700 border border-amber-100";

                    return (
                      <div key={m.id}>
                        {showSep && (
                          <div className="flex justify-center my-3">
                            <Text type="secondary" className="text-xs bg-gray-100 px-3 py-1 rounded-full">
                              {formatDate(m.timestamp)}
                            </Text>
                          </div>
                        )}
                        <div className={`flex ${isYou ? "justify-end" : "justify-start"}`}>
                          <div className={`flex gap-2 max-w-[80%] ${isYou ? "flex-row-reverse" : "flex-row"}`}>
                            <Avatar size="small" src={isYou ? studIcon : agentIcon} className={isYou ? "bg-blue-500" : "bg-green-500"} />
                            <div className={`flex flex-col ${isYou ? "items-end" : "items-start"}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Text className="text-xs font-medium text-gray-600">{m.sender}</Text>
                                <Text className="text-xs text-gray-400">{formatTime(m.timestamp)}</Text>
                                {m.type === "received" && (
                                  <Tooltip title="Copy message">
                                    <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyToClipboard(m.content)} />
                                  </Tooltip>
                                )}
                              </div>
                              <div className={`px-3 py-2 rounded-lg ${bubbleClass}`}>
                                <Text>{m.content}</Text>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {typing && (
                    <div className="flex justify-start">
                      <div className="flex gap-2 max-w-[80%]">
                        <Avatar size="small" src={agentIcon} className="bg-green-500" />
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-2 mb-1">
                            <Text className="text-xs font-medium text-gray-600">Kibundo Assistant</Text>
                            <Text className="text-xs text-gray-400">typing…</Text>
                          </div>
                          <div className="px-3 py-2 bg-gray-100 rounded-lg">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={endRef} />
            </div>

            {/* Composer */}
            <div className="border-t pt-3">
              <div className="flex gap-2 items-end">
                <TextArea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); resetInactivity(); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about Kibundo…"
                  autoSize={{ minRows: 1, maxRows: 5 }}
                  className="rounded-xl"
                  disabled={sending}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  loading={sending}
                  disabled={!input.trim()}
                  className="rounded-xl"
                >
                  Send
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <Text className="text-xs text-gray-400">Press Enter to send • Shift+Enter for newline</Text>
                <Text className="text-xs text-orange-400">Auto-closes after 1 minute of inactivity</Text>
              </div>
            </div>
          </Card>

          {/* Sticky jump-to-bottom */}
          {!atBottom && (
            <div className="fixed bottom-24 right-6">
              <Button shape="round" onClick={scrollToBottom} icon={<ArrowLeftOutlined rotate={90} />}>
                New messages
              </Button>
            </div>
          )}
        </section>
      </div>
    </ParentShell>
  );
}
