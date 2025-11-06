// src/pages/parent/ParentHome.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/api/axios";
import { useAuthContext } from "@/context/AuthContext";

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

/* ---------------- Helper Functions ---------------- */
const formatStudentName = (student) => {
  const user = student?.user || {};
  const firstName = user.first_name || "";
  const lastName = user.last_name || "";
  return `${firstName} ${lastName}`.trim() || `Student #${student?.id || ""}`;
};

const formatStudentMeta = (student) => {
  // Age can be stored in students.age (direct column) or profile.age (legacy JSONB)
  // Check both locations with fallback
  const ageValue = student?.age ?? 
                  student?.profile?.age ?? 
                  student?.student?.age ?? 
                  student?.student?.profile?.age;
  const age = ageValue ? `Age ${ageValue}` : "Age X";
  const grade = student?.class?.class_name || student?.student?.class?.class_name || `Grade ${student?.class_id || student?.student?.class_id || "N/A"}`;
  return `${age}, ${grade}`;
};

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
      className="flex flex-col items-center text-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl w-[90px] sm:w-[100px] flex-shrink-0"
    >
      <div className="w-20 h-20 rounded-full overflow-hidden shadow-[0_6px_18px_rgba(0,0,0,0.12)] ring-4 ring-white/60 transition hover:-translate-y-0.5 hover:shadow-lg">
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="text-sm font-semibold text-neutral-800 leading-tight max-w-full truncate px-1">{name}</div>
      <div className="text-xs text-neutral-500 max-w-full truncate px-1">{meta}</div>
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
  const [windowWidth, setWindowWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  // Track window width for responsive chat positioning
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Current user from context (small, safe summary)
  const { user } = useAuthContext();
  const parentName = user?.first_name || user?.name || 'there';
  
  // State for real data
  const [children, setChildren] = useState([]);
  const [activities, setActivities] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState("ParentAgent"); // Default fallback

  // Fetch selected agent from admin AI settings
  useEffect(() => {
    const fetchSelectedAgent = async () => {
      try {
        // Only fetch if authenticated
        const token = localStorage.getItem('kibundo_token') || sessionStorage.getItem('kibundo_token');
        if (!token) {
          return;
        }
        
        const response = await api.get('/aisettings', {
          validateStatus: (status) => status < 500, // Don't throw on 403/404
          withCredentials: true,
        });
        
        if (response?.data?.parent_default_ai) {
          const fetchedAgent = response.data.parent_default_ai;
          setSelectedAgent(fetchedAgent);
        }
      } catch (error) {
        // Continue with default agent on error
      }
    };
    
    fetchSelectedAgent();
  }, []);

  // Fetch parent's students and data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        // Get current user's parent record to get students
        const parentRes = await api.get("/parents", { params: { user_id: user.id } });
        const parents = Array.isArray(parentRes.data) ? parentRes.data : (parentRes.data?.data || []);
        const parent = parents.find(p => p.user_id === user.id) || parents[0];
        
        if (parent?.id) {
          // Get parent details with students
          const parentDetailRes = await api.get(`/parent/${parent.id}`);
          const parentData = parentDetailRes.data?.data || parentDetailRes.data || parent;
          const students = Array.isArray(parentData.student) ? parentData.student : [];
          
          // Format students for display with actual avatars
          const formattedStudents = students.map((s, idx) => {
            const user = s?.user || {};
            
            // Determine default avatar based on gender
            const getDefaultAvatar = () => {
              if (user.gender === 'male') return childOne;
              if (user.gender === 'female') return childTwo;
              // If no gender specified, alternate based on index as fallback
              return [childOne, childTwo][idx % 2];
            };
            
            // Try to get avatar from user.avatar, profile.buddy, or profile.avatar
            // If none found, use gender-based default
            let avatarSrc = user.avatar || 
                           s?.profile?.buddy?.avatar || 
                           s?.profile?.avatar ||
                           getDefaultAvatar();
            
            // If avatar is a relative path, make it absolute
            if (avatarSrc && !avatarSrc.startsWith('http') && !avatarSrc.startsWith('/') && !avatarSrc.includes('assets')) {
              avatarSrc = `/${avatarSrc}`;
            }
            
            return {
              id: s.id,
              name: formatStudentName(s),
              meta: formatStudentMeta(s),
              avatar: avatarSrc,
              student: s, // Keep full data
            };
          });
          setChildren(formattedStudents);
          
          // Fetch recent activities (homework scans) with student avatars
          const activitiesList = [];
          students.forEach((student, studentIdx) => {
            const user = student?.user || {};
            const scans = Array.isArray(student.homeworkscan) ? student.homeworkscan : [];
            scans.slice(0, 2).forEach(scan => {
              // Determine default avatar based on gender
              const getDefaultAvatar = () => {
                if (user.gender === 'male') return childOne;
                if (user.gender === 'female') return childTwo;
                // If no gender specified, alternate based on index as fallback
                return [childOne, childTwo][studentIdx % 2];
              };
              
              // Get avatar for activity card
              let avatarSrc = user.avatar || 
                             student?.profile?.buddy?.avatar || 
                             student?.profile?.avatar ||
                             getDefaultAvatar();
              
              if (avatarSrc && !avatarSrc.startsWith('http') && !avatarSrc.startsWith('/') && !avatarSrc.includes('assets')) {
                avatarSrc = `/${avatarSrc}`;
              }
              
              // Generate activity text based on scan content to match design
              const scanText = scan.raw_text || "";
              let activityText = "Completed a math lesson for homework";
              if (scanText.toLowerCase().includes("reading") || scanText.toLowerCase().includes("lesen")) {
                activityText = "Started a reading exercise";
              } else if (scanText.toLowerCase().includes("math") || scanText.toLowerCase().includes("mathe")) {
                activityText = "Completed a math lesson for homework";
              } else if (scanText.length > 0) {
                activityText = scanText.substring(0, 40) + "...";
              }
              
              activitiesList.push({
                id: scan.id,
                childId: student.id,
                child: formatStudentName(student),
                text: activityText,
                when: new Date(scan.created_at).toLocaleDateString(),
                tag: "Homework",
                avatar: avatarSrc,
              });
            });
          });
          setActivities(activitiesList.slice(0, 2));
        }
        
          // Fetch news/blog posts
        try {
          const newsRes = await api.get("/blogposts");
          const blogPosts = Array.isArray(newsRes.data) ? newsRes.data : (newsRes.data?.data || []);
          const formattedNews = blogPosts.slice(0, 3).map((post, idx) => {
            // Map categories to match design
            let badge = post.category || "Blog Post";
            let badgeColor = "#69b06b"; // green for Blog Post
            if (badge.toLowerCase().includes("platform") || badge.toLowerCase().includes("update")) {
              badge = "Plattform update";
              badgeColor = "#6b7280"; // dark gray
            } else if (!badge.toLowerCase().includes("blog")) {
              badge = "Unknown Category";
              badgeColor = "#6b7280"; // dark gray
            } else {
              badge = "Blog Post";
            }
            
            return {
              id: post.id,
              tag: badge,
              title: post.title || "News Article",
              desc: post.content?.substring(0, 80) + "..." || "Read more...",
              image: [blogNews, platNews, unkCat][idx % 3],
              badgeColor: badgeColor,
            };
          });
          setNews(formattedNews);
        } catch (newsErr) {
          // Fallback to dummy news matching the design exactly
          setNews([
            { id: 1, tag: "Blog Post", title: "Tips for Encouraging Reading", desc: "Learn how to foster a love for reading in your child.", image: blogNews, badgeColor: "#69b06b" },
            { id: 2, tag: "Plattform update", title: "New Math Games Added", desc: "Explore the latest math games designed to make learning fun.", image: platNews, badgeColor: "#6b7280" },
            { id: 3, tag: "Unknown Category", title: "Further Chapter Headline", desc: "Explore the latest math games designed to make learning fun.", image: unkCat, badgeColor: "#6b7280" },
          ]);
        }
      } catch (err) {
        // Fallback to empty arrays or dummy data if needed
        setChildren([]);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user?.id]);

  // Dispatch events when chat opens/closes to hide bottom bar
  React.useEffect(() => {
    if (chatOpen) {
      window.dispatchEvent(new CustomEvent('parent-chat:open'));
    } else {
      window.dispatchEvent(new CustomEvent('parent-chat:close'));
    }
  }, [chatOpen]);

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
            content: `Hello ${parentName}! I'm your Assistant. How can I help you today?`,
            agentName: "Parent Assistant"
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

  // 🔥 Load conversationId for parent home chat
  const conversationIdKey = `kibundo.parent.home.convId.${user?.id || 'anon'}`;
  const [homeConversationId, setHomeConversationId] = useState(() => {
    try {
      const saved = localStorage.getItem(conversationIdKey);
      if (saved) return parseInt(saved, 10);
    } catch (e) {}
    return null;
  });

  // 🔥 Save conversationId when it changes
  useEffect(() => {
    if (homeConversationId) {
      try {
        localStorage.setItem(conversationIdKey, homeConversationId.toString());
      } catch (e) {}
    }
  }, [homeConversationId, conversationIdKey]);

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || sending || cooldownSec > 0) return;
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setChatInput("");
    try {
      // Use the fetched agent from admin settings, fallback to "ParentAgent"
      const agentToUse = selectedAgent || "ParentAgent";
      const payload = { 
        question: q, 
        context: "User", 
        ai_agent: agentToUse,
        conversationId: homeConversationId, // 🔥 Send conversation ID for memory
        mode: "parent" // Identify as parent chat
      };
      const res = await api.post("/ai/chat", payload);
      const answer = res?.data?.answer || res?.data?.data?.answer || res?.data?.message || "";
      const agentName = res?.data?.agentName || "Parent Assistant";
      
      // 🔥 Update conversation ID if backend returns a new one
      if (res?.data?.conversationId && res.data.conversationId !== homeConversationId) {
        setHomeConversationId(res.data.conversationId);
      }
      
      setMessages((prev) => [...prev, { role: "assistant", content: String(answer || "No response"), agentName }]);
    } catch (err) {
      const backendMsg = err?.response?.data?.error;
      // If backend signals rate limit, impose a short cooldown
      if (err?.response?.status === 429) {
        setCooldownSec(20);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: backendMsg || "Sorry, I couldn't process that right now.", agentName: "Parent Assistant" },
      ]);
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
    <>
    <div className="w-full flex justify-center pb-0">
        <section className="relative w-full max-w-[520px] px-4 pt-4 pb-2 mx-auto space-y-6">
          <h1 className="text-3xl font-extrabold text-neutral-800 text-center mb-0">
            {t("parent.home.title", "Home")}
          </h1>

          {/* Activities */}
          <section>
            <h2 className="text-xl font-extrabold text-neutral-800 mb-3">
              {t("parent.home.activities", "Aktivitäten")}
            </h2>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center text-neutral-500 py-4">Loading activities...</div>
              ) : activities.length > 0 ? (
                activities.map((a, i) => (
                  <ActivityCard
                    key={a.id}
                    to={`/parent/myfamily/student/${a.childId}`}
                    avatar={a.avatar}
                    name={a.child}
                    text={a.text}
                    bg={i === 0 ? "bg-[#A7EEF0]" : "bg-[#F6CFE0]"}
                  />
                ))
              ) : (
                <div className="text-center text-neutral-500 py-4">No recent activities</div>
              )}
            </div>
          </section>

          {/* Your Childs */}
          <section>
            <h2 className="text-xl font-extrabold text-neutral-800 mb-4">
              {t("parent.home.yourChilds", "Your Childs")}
            </h2>
            <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-8">
              {loading ? (
                <div className="text-center text-neutral-500 py-4 w-full">Loading...</div>
              ) : children.length > 0 ? (
                children.map((c) => (
                  <ChildBubble key={c.id} to={`/parent/myfamily/student/${c.id}`} avatar={c.avatar} name={c.name} meta={c.meta} />
                ))
              ) : (
                <div className="text-center text-neutral-500 py-4 w-full">
                  <p>No students yet.</p>
                  <Link to="/parent/myfamily/add-student-flow" className="text-emerald-600 hover:underline">
                    Add your first student
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* News & Insights */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-800">
              {t("parent.home.newsInsights", "Neuigkeiten & Einblicke")}
            </h2>
            {loading ? (
              <div className="text-center text-neutral-500 py-4">Loading news...</div>
            ) : news.length > 0 ? (
              news.map((n) => (
                <ParentNewsCard
                  key={n.id}
                  to={`/parent/communications/news/${n.id}`}
                  badge={n.tag}
                  badgeColor={n.badgeColor || "#69b06b"}
                  title={n.title}
                  excerpt={n.desc}
                  image={n.image}
                />
              ))
            ) : (
              <div className="text-center text-neutral-500 py-4">No news available</div>
            )}
          </section>
        </section>
      </div>

      {/* Floating chat button removed; chat opens via Feedback tab */}
      {chatOpen && (
        <div 
          className="fixed z-[9999] pointer-events-auto"
          style={{
            // On desktop, position within device frame (same as student chat)
            left: windowWidth >= 768 && windowWidth < 1024 
              ? "50%" 
              : windowWidth >= 1024
              ? `calc(50% - 512px)` // Center: 50% - half of max-width (1024px / 2)
              : "0",
            right: windowWidth >= 768 && windowWidth < 1024
              ? "auto"
              : windowWidth >= 1024
              ? "auto"
              : "0",
            width: windowWidth >= 768 && windowWidth < 1024
              ? "100%"
              : windowWidth >= 1024
              ? "1024px"
              : "100%",
            maxWidth: windowWidth >= 1024 ? "1024px" : "100%",
            top: 0,
            bottom: windowWidth >= 1024 ? "8px" : windowWidth >= 768 ? "4px" : 0,
            transform: windowWidth >= 768 && windowWidth < 1024 ? "translateX(-50%)" : "none",
            overscrollBehavior: "contain",
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 pointer-events-auto"
            onClick={() => setChatOpen(false)}
          />
          {/* Chat panel - positioned like student chat (bottom sheet) */}
          <div
            ref={panelRef}
            className="absolute left-0 right-0 bg-white flex flex-col"
            style={{
              bottom: windowWidth >= 1024 ? "8px" : windowWidth >= 768 ? "4px" : "0",
              height: windowWidth >= 1024 
                ? "calc(100vh - 16px)" 
                : windowWidth >= 768 
                ? "calc(100vh - 8px)" 
                : "100vh",
              maxHeight: windowWidth >= 1024 
                ? "calc(100vh - 16px)" 
                : windowWidth >= 768 
                ? "calc(100vh - 8px)" 
                : "100vh",
              minHeight: windowWidth < 768 ? "50vh" : windowWidth < 1024 ? "40vh" : "30vh",
              borderTopLeftRadius: windowWidth < 768 ? "1.5rem" : "1rem",
              borderTopRightRadius: windowWidth < 768 ? "1.5rem" : "1rem",
              overflow: "hidden",
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
                        <div className="flex flex-col items-center">
                          <img
                            src={avatar}
                            alt={isUser ? "You" : "Assistant"}
                            className="w-8 h-8 rounded-full shadow border border-white/60"
                          />
                          {!isUser && m.agentName && (
                            <div className="text-xs text-neutral-500 mt-1 text-center max-w-[60px] break-words">
                              {m.agentName}
                            </div>
                          )}
                        </div>
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
    </>
  );
}
