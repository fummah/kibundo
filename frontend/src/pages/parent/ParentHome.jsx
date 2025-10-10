// src/pages/parent/ParentHome.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/api/axios";
import { useAuthContext } from "@/context/AuthContext";

import ParentShell from "@/components/parent/ParentShell";
// ✅ explicit extension + alias to avoid any shadowing
import ParentNewsCard from "@/components/parent/NewsCard.jsx";

/* Assets */
import globalBg from "@/assets/backgrounds/global-bg.png";
import childOne from "@/assets/parent/childone.png";
import childTwo from "@/assets/parent/childtwo.png";
import blogNews from "@/assets/parent/blognews.png";
import platNews from "@/assets/parent/platnews.png";
import unkCat from "@/assets/parent/unkcat.png";
import agentIcon from "@/assets/mobile/icons/agent-icon.png";
import studentIcon from "@/assets/mobile/icons/stud-icon.png";

/* ---------------- Dummy content ---------------- */
const CHILDREN = [
  { id: 1, name: "Name Child one", meta: "Age X, Grade 3", avatar: childOne },
  { id: 2, name: "Name Child two", meta: "Age X, Grade 1", avatar: childTwo },
];

const ACTIVITIES = [
  { id: 1, childId: 1, child: "Name Child one", text: "Completed a math lesson for homework", when: "Today 14:20", tag: "Math", avatar: childOne },
  { id: 2, childId: 2, child: "Name Child two", text: "Started a reading exercise", when: "Yesterday 17:05", tag: "Reading", avatar: childTwo },
];

const NEWS = [
  { id: 1, tag: "Blog Post", title: "Tips for Encouraging Reading", desc: "Learn how to foster a love for reading in your child.", image: blogNews },
  { id: 2, tag: "Platform update", title: "New Math Games Added", desc: "Explore the latest math games designed to make learning fun.", image: platNews },
  { id: 3, tag: "Unknown Category", title: "Further Chapter Headline", desc: "Explore the latest math games designed to make learning fun.", image: unkCat },
];

/* ---------------- Small mobile cards ---------------- */
function ActivityCard({ to, avatar, name, text, bg = "bg-cyan-200" }) {
  return (
    <Link
      to={to}
      className={`block w-full ${bg} rounded-2xl px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-white/60 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}
    >
      <div className="flex items-start gap-3">
        <img src={avatar} alt={name} className="w-12 h-12 rounded-full ring-4 ring-white/60 object-cover" />
        <div className="flex-1">
          <div className="font-extrabold text-neutral-800">{name}</div>
          <div className="text-neutral-700">{text}</div>
        </div>
      </div>
    </Link>
  );
}

function ChildBubble({ to, avatar, name, meta }) {
  return (
    <Link
      to={to}
      className="shrink-0 flex flex-col items-center text-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl"
    >
      <div className="w-20 h-20 rounded-full overflow-hidden shadow-[0_6px_18px_rgba(0,0,0,0.12)] ring-4 ring-white/60 transition hover:-translate-y-0.5 hover:shadow-lg">
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="text-sm font-semibold text-neutral-800 leading-tight">{name}</div>
      <div className="text-xs text-neutral-500">{meta}</div>
    </Link>
  );
}

/* ---------------- Page ---------------- */
export default function ParentHome() {
  const { t } = useTranslation();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]); // {role:'user'|'assistant', content:string}
  const [cooldownSec, setCooldownSec] = useState(0);
  const [panelPos, setPanelPos] = useState({ x: null, y: null });
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const greetingAddedRef = useRef(false);

  // Current user from context (small, safe summary)
  const { user } = useAuthContext();
  const parentName = user?.first_name || user?.name || 'there';

  // Prevent background scroll when chat is open
  React.useEffect(() => {
    if (chatOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      // focus input shortly after open
      setTimeout(() => { try { inputRef.current?.focus(); } catch {} }, 50);
      return () => { document.body.style.overflow = prev; };
    }
  }, [chatOpen]);

  // Open chat when footer Feedback is tapped
  useEffect(() => {
    const onOpen = () => setChatOpen(true);
    window.addEventListener('parent-chat:open', onOpen);
    return () => window.removeEventListener('parent-chat:open', onOpen);
  }, []);

  // Initialize panel position (centered) when opened
  useEffect(() => {
    if (chatOpen) {
      // center panel roughly (will be adjusted by actual size after first paint)
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPanelPos({ x: Math.max(12, (vw - 400) / 2), y: Math.max(12, (vh - 520) / 2) });

      // Add initial greeting message only once
      if (!greetingAddedRef.current) {
        greetingAddedRef.current = true;
        setMessages([
          {
            role: "assistant",
            content: `Hello ${parentName}! I'm your Assistant. How can I help you today?`
          }
        ]);
      }
    } else {
      // Reset greeting flag when chat is closed
      greetingAddedRef.current = false;
    }
  }, [chatOpen, parentName]);

  // Cooldown ticker for rate limiting
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = setInterval(() => setCooldownSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldownSec]);

  // Drag handlers
  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const nx = clientX - dragOffsetRef.current.x;
      const ny = clientY - dragOffsetRef.current.y;
      // Clamp within viewport with 8px margin
      const margin = 8;
      const el = panelRef.current;
      const w = el ? el.offsetWidth : 380;
      const h = el ? el.offsetHeight : 480;
      const maxX = window.innerWidth - w - margin;
      const maxY = window.innerHeight - h - margin;
      setPanelPos({ x: Math.min(Math.max(nx, margin), Math.max(maxX, margin)), y: Math.min(Math.max(ny, margin), Math.max(maxY, margin)) });
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseup', onUp, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || sending || cooldownSec > 0) return;
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setChatInput("");
    try {
      const payload = { question: q, context: "User", ai_agent: "ParentAgent" };
      const res = await api.post("/ai/chat", payload);
      const answer = res?.data?.answer || res?.data?.data?.answer || res?.data?.message || "";
      setMessages((prev) => [...prev, { role: "assistant", content: String(answer || "No response") }]);
    } catch (err) {
      const backendMsg = err?.response?.data?.error;
      // If backend signals rate limit, impose a short cooldown
      if (err?.response?.status === 429) {
        setCooldownSec(20);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: backendMsg || "Sorry, I couldn't process that right now." },
      ]);
      // Optionally log: console.error(err);
    } finally {
      setSending(false);
    }
  };

  const startDrag = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rectX = (panelPos.x ?? 0);
    const rectY = (panelPos.y ?? 0);
    dragOffsetRef.current = { x: clientX - rectX, y: clientY - rectY };
    draggingRef.current = true;
  };

  return (
    <ParentShell title={t("parent.home.title", "Home")} showBack={false} bgImage={globalBg}>
      <div className="w-full flex justify-center">
        <section className="relative w-full max-w-[520px] px-4 pt-6 mx-auto space-y-6">
          <h1 className="text-3xl font-extrabold text-neutral-800 text-center">
            {t("parent.home.title", "Home")}
          </h1>

          {/* Activities */}
          <section>
            <h2 className="text-xl font-extrabold text-neutral-800 mb-3">
              {t("parent.home.activities", "Aktivitäten")}
            </h2>
            <div className="space-y-3">
              {ACTIVITIES.slice(0, 2).map((a, i) => (
                <ActivityCard
                  key={a.id}
                  to={`/parent/myfamily/student/${a.childId}`}
                  avatar={a.avatar}
                  name={a.child}
                  text={a.text}
                  bg={i === 0 ? "bg-[#A7EEF0]" : "bg-[#F6CFE0]"}
                />
              ))}
            </div>
          </section>

          {/* My Family */}
          <section>
            <h2 className="text-xl font-extrabold text-neutral-800 mb-4">
              {t("parent.home.myFamily", "Meine Familie")}
            </h2>
            <div className="flex items-start justify-center gap-8">
              {CHILDREN.map((c) => (
                <ChildBubble key={c.id} to={`/parent/myfamily/student/${c.id}`} avatar={c.avatar} name={c.name} meta={c.meta} />
              ))}
            </div>
            <hr className="mt-6 border-0 h-px bg-neutral-300/60" />
          </section>

          {/* News & Insights */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-800">
              {t("parent.home.newsInsights", "Neuigkeiten & Einblicke")}
            </h2>
            {NEWS.map((n) => (
              <ParentNewsCard
                key={n.id}
                to="/parent/communications/news"
                badge={n.tag}
                title={n.title}
                excerpt={n.desc}
                image={n.image}
              />
            ))}
          </section>
        </section>
      </div>

      {/* Floating chat button removed; chat opens via Feedback tab */}
      {chatOpen && (
        <div className="fixed inset-0 z-[9999] pointer-events-auto">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 pointer-events-auto"
            onClick={() => setChatOpen(false)}
          />
          {/* Fullscreen chat panel */}
          <div
            ref={panelRef}
            className="fixed inset-0 bg-white flex flex-col"
            style={{
              left: panelPos.x ?? 0,
              top: panelPos.y ?? 0,
              width: '400px',
              height: '520px',
              transform: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold text-neutral-800">Ask Parent Assistant</div>
              <button className="text-neutral-500 hover:text-neutral-700" onClick={() => setChatOpen(false)} aria-label="Close chat">
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-auto flex-1">
              {messages.length === 0 ? (
                <div className="text-neutral-500 text-sm">Loading conversation...</div>
              ) : (
                messages.map((m, idx) => {
                  const isUser = m.role === "user";
                  const avatar = isUser ? studentIcon : agentIcon;
                  return (
                    <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                        <img
                          src={avatar}
                          alt={isUser ? "You" : "Assistant"}
                          className="w-8 h-8 rounded-full shadow border border-white/60"
                        />
                        <div className={`px-3 py-2 rounded-2xl text-sm max-w-[70vw] sm:max-w-[520px] whitespace-pre-wrap ${isUser ? "bg-emerald-600 text-white rounded-br-sm" : "bg-neutral-100 text-neutral-800 rounded-bl-sm"}`}>
                          {m.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t flex items-center gap-2">
              <input
                type="text"
                ref={inputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                placeholder="Type your question..."
                className="flex-1 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={sendChat}
                disabled={sending || !chatInput.trim() || cooldownSec > 0}
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 disabled:opacity-60"
              >
                {sending ? "Sending..." : (cooldownSec > 0 ? `Wait ${cooldownSec}s` : "Send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ParentShell>
  );
}
