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
import parentIcon from "@/assets/parent/childone.png";
import { useAuthContext } from "@/context/AuthContext.jsx";
import api from "@/api/axios";

const { Title, Text } = Typography;
const { TextArea } = Input;

// --- helpers ---
const makeMsg = ({ type, content, sender, timestamp }) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type, // 'sent' | 'received' | 'system' | 'error'
  content,
  timestamp: timestamp || new Date(),
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

  const [selectedAgent, setSelectedAgent] = useState("ParentAgent"); // Default fallback
  const [agentName, setAgentName] = useState("Parent Assistant"); // Display name for agent

  // Fetch selected agent from admin AI settings
  useEffect(() => {
    const fetchSelectedAgent = async () => {
      try {
        // Only fetch if authenticated
        const token = localStorage.getItem('kibundo_token') || sessionStorage.getItem('kibundo_token');
        if (!token) {
          console.log("⚠️ ParentChat: Not authenticated, using default agent");
          return;
        }
        
        const response = await api.get('/aisettings', {
          validateStatus: (status) => status < 500, // Don't throw on 403/404
          withCredentials: true,
        });
        
        if (response?.data?.parent_default_ai) {
          const fetchedAgent = response.data.parent_default_ai;
          console.log("✅ ParentChat: Using admin-selected agent:", fetchedAgent);
          setSelectedAgent(fetchedAgent);
          setAgentName(fetchedAgent || "Parent Assistant");
        } else {
          console.log("ℹ️ ParentChat: No parent_default_ai found, using default");
        }
      } catch (error) {
        console.error("❌ ParentChat: Error fetching AI settings:", error);
        // Continue with default agent on error
      }
    };
    
    fetchSelectedAgent();
  }, []);

  const firstName = useMemo(
    () => user?.first_name || user?.name?.split(" ")[0] || "there",
    [user]
  );
  
  const welcomeMessage = useMemo(
    () => `Hello ${firstName}! I'm your Kibundo AI assistant. How can I help you today?`,
    [firstName]
  );

  // 🔥 Load conversationId from localStorage on mount
  const conversationIdKey = `kibundo.parent.convId.${user?.id || 'anon'}`;
  const [conversationId, setConversationId] = useState(() => {
    try {
      const saved = localStorage.getItem(conversationIdKey);
      if (saved) {
        console.log("🔄 ParentChat: Loaded existing conversationId:", saved);
        return parseInt(saved, 10);
      }
    } catch (e) {
      console.log("❌ ParentChat: Failed to load conversationId:", e);
    }
    return null;
  });

  // 🔥 Save conversationId to localStorage when it changes
  useEffect(() => {
    if (conversationId) {
      try {
        localStorage.setItem(conversationIdKey, conversationId.toString());
        console.log("💾 ParentChat: Saved conversationId:", conversationId);
      } catch (e) {
        console.log("❌ ParentChat: Failed to save conversationId:", e);
      }
    }
  }, [conversationId, conversationIdKey]);

  // 🔥 Load conversation history on mount or when conversationId changes
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!conversationId) {
        // No conversation yet, show welcome message
        setMessages([makeMsg({ type: "received", content: welcomeMessage, sender: agentName })]);
        return;
      }

      try {
        console.log("🔍 ParentChat: Loading conversation history for ID:", conversationId);
        const response = await api.get(`/conversations/${conversationId}/messages`);
        
        if (response?.data && Array.isArray(response.data)) {
          console.log("✅ ParentChat: Loaded", response.data.length, "messages from history");
          
          const formattedMessages = response.data.map(msg => {
            // Determine if this is a parent message or agent message
            // Backend stores: "parent" for parent messages, "bot" or "agent" for AI messages
            const isParentMessage = msg.sender === "parent" || msg.sender === "user" || msg.sender === "student";
            const isBotMessage = msg.sender === "bot" || msg.sender === "agent";
            
            const sender = isParentMessage 
              ? (user?.name || user?.first_name || "You") 
              : (msg?.meta?.agentName || agentName || "Parent Assistant");
            
            const messageType = isParentMessage ? "sent" : (isBotMessage ? "received" : "received");
            
            console.log("📝 ParentChat: Loading message:", {
              id: msg.id,
              sender: msg.sender,
              isParentMessage,
              isBotMessage,
              messageType
            });
            
            // Safely parse timestamp
            let timestamp = new Date();
            if (msg.created_at || msg.timestamp) {
              try {
                const parsed = new Date(msg.created_at || msg.timestamp);
                if (!isNaN(parsed.getTime())) {
                  timestamp = parsed;
                }
              } catch (e) {
                console.warn("Invalid timestamp in message:", msg.created_at || msg.timestamp);
              }
            }
            
            return makeMsg({
              type: messageType,
              content: msg.content || "",
              sender: sender,
              timestamp: timestamp
            });
          });

          if (formattedMessages.length > 0) {
            setMessages(formattedMessages);
          } else {
            // No history yet, show welcome
            setMessages([makeMsg({ type: "received", content: welcomeMessage, sender: agentName })]);
          }
        }
      } catch (error) {
        console.error("❌ ParentChat: Failed to load conversation history:", error);
        // On error, show welcome message
        setMessages([makeMsg({ type: "received", content: welcomeMessage, sender: agentName })]);
      }
    };

    loadConversationHistory();
  }, [conversationId, user?.id, user?.name, agentName, welcomeMessage]);

  const [messages, setMessages] = useState(() => [
    makeMsg({ type: "received", content: welcomeMessage, sender: agentName }),
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

  const formatTime = (date) => {
    if (!date) return '';
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.warn("Invalid date value:", date);
        return '';
      }
      return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(dateObj);
    } catch (error) {
      console.error("Error formatting time:", error, date);
      return '';
    }
  };

  const pushMessage = useCallback((msg) => setMessages((prev) => [...prev, msg]), []);

  const sendToAPI = useCallback(async (text) => {
    try {
      // Use the fetched agent from admin settings, fallback to "ParentAgent"
      const agentToUse = selectedAgent || "ParentAgent";
      console.log("📤 ParentChat: Sending message with agent:", agentToUse, "conversationId:", conversationId);
      
      const { data } = await api.post("/ai/chat", { 
        question: text, 
        ai_agent: agentToUse,
        conversationId: conversationId, // 🔥 Send conversation ID for memory
        mode: "parent" // Identify as parent chat
      });
      
      // 🔥 Update conversation ID if backend returns a new one (first message)
      if (data?.conversationId && data.conversationId !== conversationId) {
        console.log("🔥 ParentChat: Updating conversationId from", conversationId, "to", data.conversationId);
        setConversationId(data.conversationId);
      }
      
      return { 
        ok: true, 
        answer: data?.answer ?? "(No answer returned)",
        agentName: data?.agentName ?? agentName,
        conversationId: data?.conversationId || conversationId
      };
    } catch (err) {
      console.error("❌ ParentChat: API error:", err);
      return { ok: false, error: err };
    }
  }, [selectedAgent, agentName, conversationId]);

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
      pushMessage(makeMsg({ type: "received", content: res.answer, sender: res.agentName || agentName }));
    } else {
      const errText = "I'm having trouble connecting right now. Please try again or contact support.";
      pushMessage(makeMsg({ type: "error", content: errText, sender: agentName }));
      message.error("Failed to send. Click retry to resend.");
    }

    setSending(false);
  }, [input, sending, sendToAPI, pushMessage, resetInactivity, user?.name, message, agentName]);

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
    <div className="fixed inset-0 flex flex-col bg-[#f3f7eb] z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 bg-white/90 backdrop-blur border-b z-10 flex-shrink-0">
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
            </div>
          </div>

        {/* Messages Area (fills remaining height) */}
        <div
          ref={chatRef}
          className="flex-1 overflow-y-auto px-3 pt-4 bg-[#f3f7eb]"
        >
            {messages.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center">
                <Empty description="No messages yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => {
                  const isParent = msg.type === 'sent';
                  const isAgent = msg.type === 'received' || msg.type === 'error';
                  
                  // Debug log for first few messages
                  if (idx < 3) {
                    console.log("🎨 ParentChat: Rendering message:", {
                      idx,
                      id: msg.id,
                      type: msg.type,
                      isParent,
                      isAgent,
                      sender: msg.sender
                    });
                  }
                  
                  return (
                    <div
                      key={msg.id || idx}
                      className={`w-full flex ${
                        isParent ? "justify-end" : "justify-start"
                      } mb-3`}
                    >
                      {/* AI Agent Avatar (on left for agent messages) */}
                      {isAgent && (
                        <div className="flex flex-col mr-2 self-end">
                          <img
                            src={agentIcon}
                            alt={agentName || "AI Assistant"}
                            className="w-7 h-7 rounded-full"
                          />
                          {msg.sender && (
                            <div className="text-xs text-gray-600 mt-1 text-center max-w-[60px] break-words">
                              {msg.sender}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Message Bubble */}
                      <div
                        className={`max-w-[78%] px-3 py-2 rounded-2xl shadow-sm ${
                          isAgent
                            ? "bg-white text-gray-900 border border-gray-200"
                            : msg.type === 'error'
                              ? "bg-red-100 text-red-900"
                              : "bg-blue-500 text-white"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div
                          className={`text-xs mt-1 ${
                            isAgent ? "text-gray-500" : "text-white/80"
                          }`}
                        >
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                      
                      {/* Parent Avatar (on right for parent messages) */}
                      {isParent && (
                        <div className="flex flex-col ml-2 self-end">
                          <Avatar
                            src={user?.avatar || parentIcon}
                            size={28}
                            icon={<CustomerServiceOutlined />}
                            className="!flex-shrink-0"
                          />
                          <div className="text-xs text-gray-600 mt-1 text-center max-w-[60px] break-words">
                            {user?.first_name || "You"}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {typing && (
                  <div className="w-full flex justify-start mb-3">
                    <img
                      src={agentIcon}
                      alt={agentName || "AI Assistant"}
                      className="w-7 h-7 rounded-full mr-2 self-end"
                    />
                    <div className="max-w-[78%] px-3 py-2 rounded-2xl shadow-sm bg-white border border-gray-200">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                        <div
                          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        />
                        <div
                          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
        </div>

        {/* Input Area (fixed at bottom) */}
        <div className="w-full border-t bg-white z-10 flex-shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="w-full p-3">
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
          </div>
        </div>
    </div>
  );
}
