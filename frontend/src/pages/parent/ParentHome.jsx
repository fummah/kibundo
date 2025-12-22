// src/pages/parent/ParentHome.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/api/axios";
import { useAuthContext } from "@/context/AuthContext";

// ✅ explicit extension + alias to avoid any shadowing
import ParentNewsCard from "@/components/parent/NewsCard.jsx";
import BottomTabBar from "@/components/parent/BottomTabBar.jsx";
import ParentSpaceBar from "@/components/parent/ParentSpaceBar.jsx";

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

// Strip HTML tags from content
const stripHtml = (html) => {
  if (!html || typeof html !== "string") return "";
  try {
    // Remove script and style tags and their content
    let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, "");
    // Decode HTML entities (basic common ones)
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    // Clean up whitespace
    text = text.replace(/\s+/g, " ").trim();
    return text;
  } catch (e) {
    // Fallback: just remove tags
    return html.replace(/<[^>]+>/g, "").trim();
  }
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
  const [allBlogPosts, setAllBlogPosts] = useState([]); // Store all blog posts
  const [newsPage, setNewsPage] = useState(1);
  const [totalNewsPages, setTotalNewsPages] = useState(1);
  const NEWS_PER_PAGE = 3;
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
          
          // Fetch recent activities from usage-stats endpoint for each child
          // This provides real activities including homework, reading, learning, etc.
          const activitiesList = [];
          
          // Fetch activities for each child using the usage-stats endpoint
          for (const student of students) {
            try {
              const childId = student.id;
              const user = student?.user || {};
              const childName = formatStudentName(student);
              
              // Determine default avatar based on gender
              const getDefaultAvatar = () => {
                if (user.gender === 'male') return childOne;
                if (user.gender === 'female') return childTwo;
                // If no gender specified, alternate based on index as fallback
                const studentIdx = students.findIndex(s => s.id === childId);
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
              
              // Fetch activities from usage-stats endpoint
              const statsRes = await api.get(`/student/${childId}/usage-stats`);
              const activities = statsRes?.data?.activities || [];
              
              // Add child info to each activity
              activities.forEach(activity => {
                activitiesList.push({
                  id: activity.id || `activity-${childId}-${Date.now()}-${Math.random()}`,
                  childId: childId,
                  child: childName,
                  text: activity.text || "Aktivität",
                  when: activity.when || new Date(),
                  createdAt: activity.created_at || activity.when || new Date(),
                  tag: activity.tag || "Activity",
                  type: activity.type,
                  avatar: avatarSrc,
                });
              });
            } catch (err) {
              // Continue with other children if one fails
              console.warn(`Failed to fetch activities for student ${student.id}:`, err);
            }
          }
          
          // Remove duplicates and sort all activities by date (most recent first)
          const uniqueActivities = activitiesList.filter((activity, index, self) =>
            index === self.findIndex(a => a.id === activity.id)
          );
          
          const sortedActivities = uniqueActivities
            .sort((a, b) => {
              const dateA = new Date(a.createdAt || a.when || 0);
              const dateB = new Date(b.createdAt || b.when || 0);
              return dateB - dateA;
            })
            .slice(0, Math.max(2, students.length)); // Show at least 2, or one per child if more children
          
          // Use activity text directly from API (it's already formatted in German)
          // The API returns text like "hat eine Mathe-Kachel als Hausaufgabe erledigt" or "hat eine Leseübung begonnen"
          const formattedActivities = sortedActivities.map(a => {
            // The API already provides properly formatted German text
            // Just ensure we have a fallback if text is missing
            let formattedText = a.text || "hat eine Aktivität durchgeführt.";
            
            // If the text doesn't start with "hat", it might be in English or need formatting
            if (!formattedText.toLowerCase().startsWith('hat') && !formattedText.toLowerCase().startsWith('started') && !formattedText.toLowerCase().startsWith('completed')) {
              // Map activity types to German text patterns
              if (a.type === 'homework' || a.tag === 'Homework') {
                if (formattedText.toLowerCase().includes('mathe') || formattedText.toLowerCase().includes('math')) {
                  formattedText = `hat eine Mathe-Kachel als Hausaufgabe erledigt.`;
                } else if (formattedText.toLowerCase().includes('lesen') || formattedText.toLowerCase().includes('reading')) {
                  formattedText = `hat eine Leseübung begonnen.`;
                } else {
                  formattedText = `hat eine Hausaufgabe erledigt.`;
                }
              } else if (a.type === 'reading' || a.tag === 'Reading') {
                formattedText = `hat eine Leseübung begonnen.`;
              } else if (a.type === 'learning' || a.tag === 'Learning') {
                formattedText = `hat eine Lernaktivität abgeschlossen.`;
              } else if (a.type === 'conversation' || a.tag === 'Chat') {
                formattedText = `hat eine Chat-Sitzung gestartet.`;
              }
            }
            
            return {
              ...a,
              text: formattedText,
            };
          });
          
          setActivities(formattedActivities);
        }
        
          // Fetch news/blog posts
        try {
          const newsRes = await api.get("/blogposts", { params: { status: "published", audience: "parents" } });
          const blogPosts = Array.isArray(newsRes.data) ? newsRes.data : (newsRes.data?.data || newsRes.data?.results || []);
          
          // Helper to clean undefined/null strings
          const cleanString = (val, fallback = "") => {
            if (!val) return fallback;
            const str = String(val).trim();
            return str && str !== "undefined" && str !== "null" ? str : fallback;
          };

          // Store all blog posts for pagination - useEffect will handle formatting and pagination
          setAllBlogPosts(blogPosts);
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

  // Update displayed news when page changes
  useEffect(() => {
    if (allBlogPosts.length === 0) return;
    
    // Calculate pagination
    const totalPosts = allBlogPosts.length;
    const totalPages = Math.ceil(totalPosts / NEWS_PER_PAGE);
    setTotalNewsPages(totalPages);
    
    // Reset to page 1 if current page is out of bounds
    if (newsPage > totalPages && totalPages > 0) {
      setNewsPage(1);
      return;
    }
    
    // Get posts for current page
    const startIndex = (newsPage - 1) * NEWS_PER_PAGE;
    const endIndex = startIndex + NEWS_PER_PAGE;
    const paginatedPosts = allBlogPosts.slice(startIndex, endIndex);
    
    // Helper to clean undefined/null strings
    const cleanString = (val, fallback = "") => {
      if (!val) return fallback;
      const str = String(val).trim();
      return str && str !== "undefined" && str !== "null" ? str : fallback;
    };
    
    const formattedNews = paginatedPosts.map((post, idx) => {
      // Ensure we have a valid post with an ID
      if (!post || !post.id) {
        console.warn("Blog post missing ID:", post);
        return null;
      }
      
      // Map categories to match design
      let badge = cleanString(post.category, "Blog Post");
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
      
      // Always show "Read more..." for blog post cards
      const desc = "Read more...";
      
      // Use uploaded thumbnail_url if available, otherwise fallback to placeholder
      let imageUrl = post.thumbnail_url || post.thumbnail || post.image_url || post.cover_image || post.image || null;
      
      if (imageUrl) {
        imageUrl = String(imageUrl).trim();
        if (imageUrl.startsWith("blob:")) {
          imageUrl = null;
        }
        if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("//")) {
          if (imageUrl.startsWith("/")) {
            imageUrl = `${window.location.origin}${imageUrl}`;
          } else {
            imageUrl = `${window.location.origin}/${imageUrl}`;
          }
        }
      }
      
      if (!imageUrl || imageUrl.startsWith("blob:")) {
        imageUrl = [blogNews, platNews, unkCat][idx % 3];
      }
      
      const navUrl = `/parent/communications/news/preview/${post.id}`;
      
      return {
        id: post.id,
        tag: badge,
        title: cleanString(post.title, "News Article"),
        desc: desc,
        image: imageUrl,
        badgeColor: badgeColor,
        to: navUrl,
      };
    }).filter(Boolean);
    
    setNews(formattedNews);
  }, [newsPage, allBlogPosts]);

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
    <div className="flex flex-col bg-white overflow-hidden min-h-screen w-full relative">
      <div
        className="relative flex-1"
        style={{
          width: '100%',
          maxWidth: '1280px',
          minHeight: '100vh',
          padding: '120px 24px 120px',
          boxSizing: 'border-box',
          background: '#FFFFFF',
          margin: '0 auto',
        }}
      >
        {/* Background image per Figma frame */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <img
            src={globalBg}
            alt="Background"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
        {/* Header */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '32px',
          }}
        >
          <h1
            style={{
              fontFamily: 'Nunito',
              fontWeight: 900,
              fontSize: '50px',
              lineHeight: '68px',
              letterSpacing: '2%',
              textAlign: 'center',
              color: '#544C3B',
              margin: 0,
            }}
          >
            Home
          </h1>
        </div>

        {/* Activities */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '12px 24px',
            width: '100%',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontFamily: 'Nunito',
              fontWeight: 900,
              fontSize: '24px',
              lineHeight: '1.364',
              color: '#544C3B',
            }}
          >
            Aktivitäten
          </span>

          {activities.length > 0 ? (
            activities.slice(0, 2).map((a, idx) => (
              <div
                key={a.id || idx}
                style={{
                  position: 'relative',
                  width: '100%',
                  minHeight: '95px',
                  borderRadius: '16px',
                  background: idx % 2 === 0 ? '#DCE5FF' : '#EFDCFF',
                  boxShadow: '2px 2px 5px rgba(0,0,0,0.25)',
                  padding: '15px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '75px',
                    height: '75px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#ccc',
                    flexShrink: 0,
                  }}
                >
                  <img src={a.avatar || childOne} alt={a.child} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'Nunito',
                      fontWeight: 800,
                      fontSize: '18px',
                      lineHeight: '1.364',
                      color: '#544C3B',
                      marginBottom: '4px',
                    }}
                  >
                    {a.child}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Nunito',
                      fontWeight: 400,
                      fontSize: '18px',
                      lineHeight: '1.364',
                      color: '#544C3B',
                    }}
                  >
                    {a.text}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                fontFamily: 'Nunito',
                fontWeight: 400,
                fontSize: '16px',
                color: '#6F5A4A',
                padding: '20px 0',
                textAlign: 'center',
              }}
            >
              Noch keine Aktivitäten
            </div>
          )}
        </div>

        {/* Deine Kinder */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '12px 24px',
            width: '100%',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontFamily: 'Nunito',
              fontWeight: 900,
              fontSize: '24px',
              lineHeight: '1.364',
              color: '#544C3B',
            }}
          >
            Deine Kinder
          </span>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {children.length > 0 ? (
              children.map((c) => (
                <Link
                  key={c.id}
                  to={`/parent/myfamily/student/${c.id}`}
                  style={{
                    width: '113px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textDecoration: 'none',
                  }}
                >
                  <div
                    style={{
                      width: '95px',
                      height: '95px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: '#ccc',
                      marginBottom: '8px',
                    }}
                  >
                    <img src={c.avatar || childOne} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div
                    style={{
                      fontFamily: 'Nunito',
                      fontWeight: 900,
                      fontSize: '16px',
                      lineHeight: '1.364',
                      color: '#544C3B',
                      marginBottom: '4px',
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Nunito',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '1.364',
                      color: '#544C3B',
                      textAlign: 'center',
                    }}
                  >
                    {c.meta}
                  </div>
                </Link>
              ))
            ) : (
              <div
                style={{
                  fontFamily: 'Nunito',
                  fontWeight: 400,
                  fontSize: '16px',
                  color: '#6F5A4A',
                  padding: '20px 0',
                  textAlign: 'center',
                }}
              >
                Noch keine Kinder hinzugefügt
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '100%',
            height: '2px',
            backgroundColor: '#F4EDE6',
            margin: '10px 0',
            position: 'relative',
            zIndex: 1,
          }}
        />

        {/* Neuigkeiten & Einblicke */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '12px 24px',
            width: '100%',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontFamily: 'Nunito',
              fontWeight: 900,
              fontSize: '24px',
              lineHeight: '1.364',
              color: '#544C3B',
            }}
          >
            Neuigkeiten & Einblicke
          </span>

          {/* News cards */}
          {(news.length > 0 ? news : [
            { id: 1, tag: "Blog Post", title: "Tips for Encouraging Reading", desc: "Learn how to foster a love \nfor reading in your child.", image: blogNews, badgeColor: "#87A01D", to: "/parent/communications/news" },
            { id: 2, tag: "Plattform update", title: "Tips for Encouraging Reading", desc: "Learn how to foster a love \nfor reading in your child.", image: platNews, badgeColor: "#E27474", to: "/parent/communications/news" },
            { id: 3, tag: "Unknown Category", title: "Tips for Encouraging Reading ", desc: "Learn how to foster a love \nfor reading in your child.", image: unkCat, badgeColor: "#3ABBC1", to: "/parent/communications/news" },
          ]).map((card, idx) => (
            <Link
              key={card.id || idx}
              to={card.to || `/parent/communications/news/preview/${card.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  minHeight: '200px',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid #C9B7A7',
                  boxShadow: '2px 2px 5px rgba(0,0,0,0.25)',
                  padding: '24px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: card.badgeColor || '#69b06b',
                      color: '#FFFFFF',
                      fontFamily: 'Nunito',
                      fontWeight: 800,
                      fontSize: '16px',
                      marginBottom: '12px',
                    }}
                  >
                    {card.tag || card.badge}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Nunito',
                      fontWeight: 900,
                      fontSize: `${card.titleSize || 23}px`,
                      lineHeight: '1.364',
                      color: card.labelColor || '#544C3B',
                      marginBottom: '8px',
                    }}
                  >
                    {card.title || ''}
                  </div>
                  <div
                    style={{
                      whiteSpace: 'pre-line',
                      fontFamily: 'Nunito',
                      fontWeight: 400,
                      fontSize: '18px',
                      lineHeight: '1.364',
                      color: '#544C3B',
                    }}
                  >
                    {card.desc || card.body || ''}
                  </div>
                </div>
                <div
                  style={{
                    width: '150px',
                    height: '150px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    marginLeft: '20px',
                  }}
                >
                  <img
                    src={card.image}
                    alt={card.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Sticky bottom tab bar */}
      <div className="flex-shrink-0">
        <BottomTabBar />
      </div>
    </div>
  );
}
