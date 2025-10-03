import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Avatar,
  Typography,
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

function useAtBottom(containerRef, offset = 24) {
  const [atBottom, setAtBottom] = useState(true);

  const check = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= offset;
    setAtBottom(nearBottom);
  }, [containerRef, offset]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", check, { passive: true });
    check();
    return () => el.removeEventListener("scroll", check);
  }, [check]);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [containerRef]);

  return { atBottom, scrollToBottom };
}

export default function ParentChat() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { message } = App.useApp();

  const firstName = useMemo(
    () => user?.first_name || user?.name?.split(" ")[0] || "there",
    [user]
  );
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
  const { atBottom, scrollToBottom } = useAtBottom(chatRef, 32);

  // Auto-scroll when new messages arrive and the user is at (or near) bottom
  useEffect(() => {
    if (atBottom) scrollToBottom();
  }, [messages, atBottom, scrollToBottom]);

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
  }, [input, sending, sendToAPI, pushMessage, resetInactivity, user?.name, message]);

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
      {/* Page wrapper fills viewport height; column flow ensures input sits above any footer */}
      <div className="w-full min-h-screen flex flex-col">
        {/* Centered column for content width */}
        <div className="w-full max-w-3xl mx-auto flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 bg-white/90 backdrop-blur border-b sticky top-0 z-10">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              className="!p-0 !h-auto text-neutral-700"
              aria-label="Back"
            />
            <div className="flex items-center gap-3 flex-1 min-w-0">
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

          {/* Messages Area (fills remaining height) */}
          <div
            ref={chatRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
          >
            {messages.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center">
                <Empty description="No messages yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.type === 'sent'
                          ? 'bg-blue-100 text-blue-900'
                          : msg.type === 'error'
                            ? 'bg-red-100 text-red-900'
                            : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {msg.sender === 'Kibundo Assistant' && (
                          <Avatar src={agentIcon} size={20} className="!flex-shrink-0" />
                        )}
                        <span className="font-medium">{msg.sender}</span>
                        <span className="text-xs opacity-60">{formatTime(msg.timestamp)}</span>
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copyToClipboard(msg.content)}
                          className="!p-0 !h-4 !w-4 ml-1 opacity-50 hover:opacity-100"
                        />
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}

                {typing && (
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg w-fit border border-gray-200">
                    <div className="w-2 h-2 rounded-full animate-bounce bg-gray-400" />
                    <div className="w-2 h-2 rounded-full animate-bounce bg-gray-400" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce bg-gray-400" style={{ animationDelay: '0.4s' }} />
                    <span className="text-xs text-gray-500 ml-2">typing...</span>
                  </div>
                )}
              </>
            )}

            {/* Give space so last message isn't hidden behind the input row */}
            <div className="pb-24" />
          </div>

          {/* Input Area (sits above any footer because we're in column flow) */}
          <div className="w-full border-t bg-white sticky bottom-0 z-10">
            <div className="max-w-3xl mx-auto p-3">
              <div className="flex gap-2 items-end">
                <TextArea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); resetInactivity(); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about Kibundo…"
                  autoSize={{ minRows: 1, maxRows: 6 }}
                  className="rounded-xl flex-1"
                  disabled={sending}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  loading={sending}
                  disabled={!input.trim()}
                  className="rounded-xl h-10"
                >
                  Send
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <Text className="text-xs text-gray-400">Press Enter to send • Shift+Enter for newline</Text>
                <Text className="text-xs text-orange-400">Auto-closes after 1 minute of inactivity</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ParentShell>
  );
}
