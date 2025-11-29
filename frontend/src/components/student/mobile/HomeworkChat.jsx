// src/components/student/mobile/HomeworkChat.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App, Modal } from "antd";
import { CheckOutlined, SoundOutlined, BulbOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useChatDock, TASKS_KEY } from "@/context/ChatDockContext";
import { useAuthContext } from "@/context/AuthContext";
import { useStudentApp } from "@/context/StudentAppContext";
import useTTS from "@/lib/voice/useTTS";
import useASR from "@/lib/voice/useASR";
import { resolveStudentAgent } from "@/utils/studentAgent";
import { useStudentFirstName } from "@/hooks/useStudentFirstName";
import { extractSpeechText, removeSpeechTags } from "@/utils/extractSpeechText";

import minimiseBg from "@/assets/backgrounds/minimise.png";
import agentIcon from "@/assets/mobile/icons/agent-icon.png";
import cameraIcon from "@/assets/mobile/icons/camera.png";
import galleryIcon from "@/assets/mobile/icons/galary.png";
import micIcon from "@/assets/mobile/icons/mic.png";
import studentIcon from "@/assets/mobile/icons/stud-icon.png";
import buddyMascot from "@/assets/buddies/kibundo-buddy.png";

const FALLBACK_IMAGE_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'>
      <rect width='100%' height='100%' fill='#f3f4f6'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-family='Segoe UI, Arial' font-size='14'>
        Bild konnte nicht geladen werden
      </text>
    </svg>`
  );

const formatMessage = (content, from = "agent", type = "text", meta = {}) => ({
  id: Date.now() + Math.random().toString(36).slice(2, 9),
  from,
  sender: from,
  type,
  content,
  timestamp: new Date().toISOString(),
  ...meta,
});

// Helper to clean angle brackets from text (convert to proper formatting)
const cleanAngleBrackets = (text) => {
  if (!text || typeof text !== "string") return text;
  // Remove angle brackets around text (often used for emphasis)
  return text.replace(/<([^>]+)>/g, "$1");
};

// Helper to replace "Schüler" with student name
const replaceSchuelerWithName = (text, studentName) => {
  if (!text || typeof text !== "string") return text;
  if (!studentName) {
    // If no student name, just remove "Schüler" or replace with "Du"
    return text.replace(/\bSchüler\b/gi, "Du");
  }
  // Replace "Schüler" (case-insensitive) with student name, but preserve capitalization context
  return text.replace(/\bSchüler\b/gi, (match) => {
    // Preserve capitalization: if "Schüler" is capitalized, capitalize student name
    if (match[0] === match[0].toUpperCase()) {
      return studentName.charAt(0).toUpperCase() + studentName.slice(1);
    }
    return studentName;
  });
};

// Parse AI response to extract tips and split into multiple messages
// Also removes <SPEECH> tags from displayed content
const parseResponseWithTips = (response, agentName = "Kibundo", studentName = null) => {
  if (!response || typeof response !== "string") {
    let cleanedResponse = removeSpeechTags(response || "");
    cleanedResponse = cleanAngleBrackets(cleanedResponse);
    cleanedResponse = replaceSchuelerWithName(cleanedResponse, studentName);
    return [formatMessage(cleanedResponse, "agent", "text", { agentName })];
  }
  
  // Remove speech tags for display, clean angle brackets, and replace "Schüler" with student name
  let cleanedResponse = removeSpeechTags(response);
  cleanedResponse = cleanAngleBrackets(cleanedResponse);
  cleanedResponse = replaceSchuelerWithName(cleanedResponse, studentName);
  
  const tipRegex = /\[TIP\](.*?)\[\/TIP\]/gs;
  const messages = [];
  let lastIndex = 0;
  let match;
  
  // Find all tips
  const tips = [];
  while ((match = tipRegex.exec(cleanedResponse)) !== null) {
    tips.push({
      content: match[1].trim(),
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  // If no tips found, return single message (without speech tags)
  // But only if there's actual content to display
  if (tips.length === 0) {
    if (cleanedResponse.trim()) {
      return [formatMessage(cleanedResponse, "agent", "text", { agentName })];
    }
    // If content is empty after removing speech tags, return empty array
    return [];
  }
  
  // Split response into text parts and tips
  tips.forEach((tip, index) => {
    // Add text before tip
    const textBefore = cleanedResponse.substring(lastIndex, tip.start).trim();
    if (textBefore) {
      messages.push(formatMessage(textBefore, "agent", "text", { agentName }));
    }
    
    // Add tip
    messages.push(formatMessage(tip.content, "agent", "tip", { agentName }));
    
    lastIndex = tip.end;
    
    // If this is the last tip, add remaining text
    if (index === tips.length - 1) {
      const textAfter = cleanedResponse.substring(tip.end).trim();
      if (textAfter) {
        messages.push(formatMessage(textAfter, "agent", "text", { agentName }));
      }
    }
  });
  
  // Only return messages if we have actual content
  if (messages.length > 0) {
    return messages;
  }
  // Fallback: if cleaned response has content, return it as a single message
  if (cleanedResponse.trim()) {
    return [formatMessage(cleanedResponse, "agent", "text", { agentName })];
  }
  // If no content at all, return empty array
  return [];
};

/** stable signature for de-dupe */
const msgSig = (m) => {
  const type = m?.type ?? "text";
  const from = (m?.from ?? m?.sender ?? "agent").toLowerCase();
  const body =
    typeof m?.content === "string"
      ? m.content.trim().replace(/\s+/g, " ")
      : JSON.stringify(m?.content ?? "");
  return `${type}|${from}|${body.slice(0, 160)}`;
};

/** ✅ ENHANCED: More aggressive deduplication to prevent duplicate messages */
const mergeById = (serverMessages = [], localMessages = []) => {
  const seen = new Set();
  const out = [];

  const createKey = (m) => {
    // Normalize the message content for comparison
    const content = String(m?.content || "").trim().toLowerCase();
    const from = (m?.from ?? m?.sender ?? "agent").toLowerCase();
    const type = m?.type ?? "text";
    
    // Create multiple keys to catch different types of duplicates
    const keys = [];
    
    // Key 1: Use ID if available (most reliable)
    if (m?.id) {
      keys.push(`id:${m.id}`);
    }
    
    // Key 2: Content-based signature (primary deduplication)
    keys.push(`content:${type}|${from}|${content}`);
    
    // Key 3: Simplified content key for exact matches
    keys.push(`simple:${from}|${content}`);
    
    // Key 4: Student-specific key for better matching
    if (from === "student") {
      keys.push(`student:${content}`);
    }
    
    // Key 5: Agent-specific key for better matching agent message duplicates
    if (from === "agent") {
      keys.push(`agent:${content}`);
    }
    
    // Key 6: Timestamp-based key for very recent messages
    if (m?.timestamp) {
      keys.push(`time:${from}|${content}|${new Date(m.timestamp).getTime()}`);
    }
    
    // Return the first available key
    return keys[0];
  };

  const isDuplicate = (m) => {
    const content = String(m?.content || "").trim().toLowerCase();
    const from = (m?.from ?? m?.sender ?? "agent").toLowerCase();
    
    // For student messages, be more aggressive about matching by content
    // since they often don't have IDs from the server initially
    const isStudentMessage = from === "student";
    
    // Check against all possible keys
    const keys = [
      m?.id ? `id:${m.id}` : null,
      `content:text|${from}|${content}`,
      `simple:${from}|${content}`,
      // For student messages, also check without type prefix for better matching
      isStudentMessage ? `student:${content}` : null,
      // Add timestamp-based key for very recent messages
      m?.timestamp ? `time:${from}|${content}|${new Date(m.timestamp).getTime()}` : null,
      // 🔥 CRITICAL: Also check by content alone for agent messages (catches duplicates from local + backend)
      from === "agent" ? `agent:${content}` : null
    ].filter(Boolean);
    
    return keys.some(key => seen.has(key));
  };

  const pushUnique = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const m of arr) {
      if (!m || typeof m !== "object") continue;
      
      if (isDuplicate(m)) {
        continue;
      }
      
      const key = createKey(m);
      if (key) seen.add(key);
      out.push(m);
    }
  };

  // priority: server messages first (they have real IDs and timestamps)
  // then local messages (optimistic messages should be filtered out if server equivalent exists)
  pushUnique(serverMessages);
  pushUnique(localMessages);
  
  // Final cleanup: remove any remaining duplicates by content for ALL messages (not just student)
  const finalDedup = [];
  const contentSeen = new Set();
  
  for (const msg of out) {
    const contentKey = typeof msg.content === 'string' 
      ? msg.content.trim().toLowerCase() 
      : String(msg.content || "").trim().toLowerCase();
    const from = (msg?.from ?? msg?.sender ?? "agent").toLowerCase();
    
    // Create a unique key for this message: from + content
    // This catches duplicates even if they have different IDs or timestamps
    const uniqueKey = `${from}|${contentKey}`;
    
    // Skip if we've already seen this exact message (same sender + same content)
    if (contentKey && contentSeen.has(uniqueKey)) {
        continue;
      }
    
    if (contentKey) contentSeen.add(uniqueKey);
    finalDedup.push(msg);
  }
  
  return finalDedup.sort(
    (a, b) => new Date(a?.timestamp || 0) - new Date(b?.timestamp || 0)
  );
};

const messageKey = (m, i) => m?.id ?? `${msgSig(m)}|${i}`;

export default function HomeworkChat({
  messages: controlledMessagesProp,
  onMessagesChange: onMessagesChangeProp,
  initialMessages,
  onSendText,
  onSendMedia,
  isTyping: externalTyping = false,
  onClose,
  minimiseTo = "/student/homework",
  minimiseHeight = 54,
  className = "",
  readOnly = false,
  onDone,
}) {
  const navigate = useNavigate();
  const { message: antdMessage } = App.useApp();
  const {
    state: dockState,
    markHomeworkDone,
    getChatMessages,
    setChatMessages,
    clearChatMessages,
    setReadOnly: setDockReadOnly,
    closeChat,
    openChat,
    expandChat,
  } = useChatDock();
  const { user: authUser } = useAuthContext();

  // Check if task is completed
  const isTaskCompleted = useMemo(() => {
    return Boolean(dockState?.task?.done || dockState?.task?.completedAt);
  }, [dockState?.task?.done, dockState?.task?.completedAt]);
  
  // Chat is read-only if explicitly set OR if task is completed
  const effectiveReadOnly = Boolean(readOnly || dockState?.readOnly || isTaskCompleted);

  // per-student scoping
  const mode = "homework";
  const taskId = dockState?.task?.id ?? null;
  // 🔥 CRITICAL: Get actual student table ID (from students table, not users table)
  // Priority: account.id (when parent viewing child) > dockState.student.id > dockState.task.studentId
  const { account } = useAuthContext();
  
  // account.id is the student table ID when parent is viewing a child
  const studentTableId = account?.type === "child" 
    ? account.id 
    : (
        dockState?.student?.id ??
        // Prefer explicit studentId on task, then userId as a fallback (for legacy tasks)
        dockState?.task?.studentId ??
        dockState?.task?.userId ??
        null
      );
  
  // This is the ID from the students table that we'll send to the backend
  const studentId = studentTableId;

  const scopedTaskKey = useMemo(
    () => `${taskId ?? "global"}::u:${studentId}`,
    [taskId, studentId]
  );

  const stableModeRef = useRef(mode);
  const stableTaskIdRef = useRef(taskId); // Use taskId (not scopedTaskKey) for message storage/retrieval
  
  // Clear processed refs when task changes
  useEffect(() => {
    if (stableTaskIdRef.current !== taskId) {
      // Task changed, clear processed refs
      lastProcessedScanIdRef.current = null;
      lastProcessedTaskKeyRef.current = null;
      scanResultsLoadedRef.current.clear();
      scanResultsLoadingRef.current = false; // Reset loading state
      lastSyncedMessageCountRef.current = 0;
      lastSyncedTaskKeyRef.current = null;
      lastSyncedMessageIdsRef.current.clear();
      isNavigatingAwayRef.current = false; // Reset navigation flag when task changes
      stableTaskIdRef.current = taskId;
    }
  }, [taskId]);

  // conversation id per thread
  const convKey = useMemo(
    () => `kibundo.convId.${mode}.${scopedTaskKey}`,
    [mode, scopedTaskKey]
  );

  const [conversationId, setConversationId] = useState(() => {
    if (dockState?.task?.conversationId) return dockState.task.conversationId;
    try {
      const stored =
        typeof window !== "undefined" && window.localStorage.getItem(convKey);
      return stored || null;
    } catch {
      return null;
    }
  });
  
  // Update conversationId when dockState changes
  useEffect(() => {
    if (dockState?.task?.conversationId) {
      setConversationId(dockState.task.conversationId);
    }
  }, [dockState?.task?.conversationId]);

  const [scanId, setScanId] = useState(() => dockState?.task?.scanId ?? null);
  
  // Refs to prevent infinite loops in scan results loading
  const scanResultsLoadingRef = useRef(false); // Prevent multiple simultaneous scan result loads
  const isNavigatingAwayRef = useRef(false); // Track if we're navigating away (e.g., to feedback page)
  const scanResultsAbortControllerRef = useRef(null); // AbortController to cancel ongoing scan results loading
  const scanResultsLoadedRef = useRef(new Set()); // Track which scanIds have been loaded
  const lastProcessedScanIdRef = useRef(null); // Track the last scanId we processed
  const lastProcessedTaskKeyRef = useRef(null); // Track the last task key we processed
  const lastLoggedTaskRef = useRef(null); // Track which tasks we've logged warnings for (to avoid spam)
  
  // Refs to track last synced message count and IDs to prevent unnecessary updates
  const lastSyncedMessageCountRef = useRef(0);
  const lastSyncedTaskKeyRef = useRef(null);
  const lastSyncedMessageIdsRef = useRef(new Set());
  const lastSyncRef = useRef({ key: null, count: 0, ids: new Set() });
  
  // Update scanId when dockState changes (but only if it's actually different)
  useEffect(() => {
    const newScanId = dockState?.task?.scanId;
    const taskSource = dockState?.task?.source;
    
    // Skip scanId logic for audio-only tasks (they don't have scans)
    if (taskSource === "audio") {
      return;
    }
    
    if (newScanId && newScanId !== scanId) {
      // scanId updated from dockState
      setScanId(newScanId);
      // Clear processed refs when scanId changes from dockState
      lastProcessedScanIdRef.current = null;
      lastProcessedTaskKeyRef.current = null;
    } else if (dockState?.task && !newScanId) {
      // Only log warning for image-based tasks that should have scanId
      const taskId = dockState.task.id;
      const hasScanIdPattern = taskId && (taskId.startsWith('scan_') || /^scan_\d+$/.test(taskId));
      const isImageTask = taskSource === "image" || hasScanIdPattern;
      
      // Check if task has scanId in localStorage (might be a timing issue)
      let hasScanIdInStorage = false;
      if (taskId) {
        try {
          // Check tasks in localStorage
          const tasksKey = `kibundo.homework.tasks.v1::u:${dockState.task.userId || studentId || ''}`;
          const storedTasks = localStorage.getItem(tasksKey);
          if (storedTasks) {
            const tasks = JSON.parse(storedTasks);
            const foundTask = tasks.find((t) => t.id === taskId);
            if (foundTask?.scanId) {
              hasScanIdInStorage = true;
            }
          }
          
          // Also check progress storage
          if (!hasScanIdInStorage) {
            const progressKey = `kibundo.homework.progress.v1::u:${dockState.task.userId || studentId || ''}`;
            const storedProgress = localStorage.getItem(progressKey);
            if (storedProgress) {
              const progress = JSON.parse(storedProgress);
              if (progress?.task?.id === taskId && progress?.task?.scanId) {
                hasScanIdInStorage = true;
              }
            }
          }
        } catch (e) {
          // Ignore localStorage errors
        }
      }
      
      // Check if task was recently created (likely still uploading)
      const taskCreatedAt = dockState.task.createdAt || dockState.task.updatedAt;
      const isRecentlyCreated = taskCreatedAt && (Date.now() - new Date(taskCreatedAt).getTime()) < 10000; // 10 seconds
      
      // Only log warning if:
      // 1. It's an image task
      // 2. scanId is not in localStorage (not just a timing issue)
      // 3. Task is not recently created (not still uploading)
      // 4. We haven't logged for this task yet
      const taskKey = `${dockState.task.id}::${taskSource}`;
      if (isImageTask && !hasScanIdInStorage && !isRecentlyCreated && !lastLoggedTaskRef.current?.has(taskKey)) {
        if (!lastLoggedTaskRef.current) {
          lastLoggedTaskRef.current = new Set();
        }
        lastLoggedTaskRef.current.add(taskKey);
        // Limit log history to last 10 tasks
        if (lastLoggedTaskRef.current.size > 10) {
          const firstKey = lastLoggedTaskRef.current.values().next().value;
          lastLoggedTaskRef.current.delete(firstKey);
        }
        if (import.meta.env.DEV) {
          console.log("⚠️ FOOTERCHAT: Image task exists but no scanId:", { id: dockState.task.id, source: taskSource });
        }
      }
    }
  }, [dockState?.task?.scanId, dockState?.task?.source, scanId]);
  const [selectedAgent, setSelectedAgent] = useState("Kibundo"); // Default fallback
  const [agentMeta, setAgentMeta] = useState(null);
  
  // Get student's first name
  const studentFirstName = useStudentFirstName();
  
  // TTS integration
  const { profile, buddy } = useStudentApp();
  const ttsEnabled = profile?.ttsEnabled !== false; // Default to true if not set
  const { speak, stop: stopTTS } = useTTS({ lang: "de-DE", enabled: ttsEnabled });

  // Fetch selected agent from backend
  useEffect(() => {
    const fetchSelectedAgent = async () => {
      const agent = await resolveStudentAgent();
      if (agent?.name) {
        setSelectedAgent(agent.name);
        setAgentMeta(agent);
      }
    };

    fetchSelectedAgent();
  }, []);
  
  const [backendMessages, setBackendMessages] = useState([]);
  const [loadingBackendMessages, setLoadingBackendMessages] = useState(false);

  // Ref to track if we're currently fetching to prevent infinite loops
  const fetchingBackendMessagesRef = useRef(false);
  const lastFetchedConvIdRef = useRef(null);

  // Helper function to convert data to array
  const toArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.messages)) return data.messages;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  };

  // Map server messages to internal format (processes speech tags, tips, etc.)
  const mapServerToInternal = useCallback((arr) => {
    const allMessages = [];
    toArray(arr).forEach((m) => {
      const from = (m?.sender || "agent").toLowerCase() === "student" ? "student" : "agent";
      const agentName = m?.agent_name || selectedAgent || "Kibundo";
      
      if (from === "agent" && typeof m?.content === "string") {
        // Parse tips from agent messages and replace "Schüler" with student name
        const parsed = parseResponseWithTips(m.content, agentName, studentFirstName);
        parsed.forEach(msg => {
          allMessages.push({
            ...msg,
            id: m.id ? `${m.id}_${msg.id}` : msg.id, // Preserve original ID if available
            timestamp: m.created_at || m.timestamp || msg.timestamp,
            agentName: agentName
          });
        });
      } else {
        // Regular message (student or non-text agent message)
        // Remove speech tags, clean angle brackets, and replace "Schüler" with student name
        let content = typeof m?.content === "string" 
          ? removeSpeechTags(m.content) 
          : (m?.content ?? "");
        if (typeof content === "string") {
          content = cleanAngleBrackets(content);
          if (from === "agent") {
            content = replaceSchuelerWithName(content, studentFirstName);
          }
        }
        
        // 🔥 CRITICAL: Don't create empty messages - if content is empty after processing, skip it
        // unless it's a student message (which might be intentionally short)
        const trimmedContent = typeof content === "string" ? content.trim() : String(content || "").trim();
        if (!trimmedContent && from === "agent") {
          // Skip empty agent messages - they have no content to display
          return;
        }
        
        allMessages.push(formatMessage(
          content,
          from,
        "text",
        { 
          id: m.id,
          timestamp: m.created_at || m.timestamp,
            agentName: agentName
          }
        ));
      }
    });
    
    // Enhanced deduplication - normalize content including removing speech tags and angle brackets
    const seen = new Set();
    return allMessages.filter((m) => {
      // Normalize content: remove speech tags, angle brackets, and normalize whitespace for comparison
      let normalizedContent = typeof m?.content === "string"
        ? removeSpeechTags(m.content)
        : String(m?.content || "");
      normalizedContent = cleanAngleBrackets(normalizedContent);
      normalizedContent = normalizedContent.trim().replace(/\s+/g, " ");
      const key = `${m.from || "agent"}|${m.type || "text"}|${normalizedContent}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [selectedAgent, studentFirstName]);

  // Fetch messages from backend
  const fetchBackendMessages = useCallback(async (convId) => {
    if (!convId || loadingBackendMessages || fetchingBackendMessagesRef.current) return;
    if (lastFetchedConvIdRef.current === convId) {
      // Already fetched this conversation, skip
      return;
    }
    
    fetchingBackendMessagesRef.current = true;
    setLoadingBackendMessages(true);
    try {
      const response = await api.get(`conversations/${convId}/messages`, {
        withCredentials: true,
      });
      if (response?.data && Array.isArray(response.data)) {
        // Use mapServerToInternal to properly process messages (remove speech tags, parse tips, etc.)
        const formattedMessages = mapServerToInternal(response.data);
        setBackendMessages(formattedMessages);
        lastFetchedConvIdRef.current = convId;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("❌ FOOTERCHAT: Error fetching messages:", error);
      }
      setBackendMessages([]);
    } finally {
      setLoadingBackendMessages(false);
      fetchingBackendMessagesRef.current = false;
    }
  }, [selectedAgent, mapServerToInternal, loadingBackendMessages]); // Include mapServerToInternal in deps

  // 🔥 Search for existing conversation by scanId when task is opened
  useEffect(() => {
    const loadConversationByScanId = async () => {
      if (!scanId || conversationId || loadingBackendMessages) return;
      
      try {
        const { data } = await api.get('/conversations', {
          params: { scan_id: scanId },
          withCredentials: true,
        });
        
        if (data && data.length > 0) {
          const convId = data[0].id;
          setConversationId(convId);
          // Message fetching will be triggered by the next useEffect
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("❌ FOOTERCHAT: Failed to search conversations:", error);
        }
      }
    };
    
    loadConversationByScanId();
  }, [scanId, conversationId, loadingBackendMessages]);

  // 🔥 Load scan results into chat if not already present
  useEffect(() => {
    // Early exit if we're navigating away - prevent scan results check after navigation
    if (isNavigatingAwayRef.current) {
      // Silently exit - navigation is in progress, no need to log
      return;
    }
    
    // Early exit if we've already processed this exact combination
    // Also check if we're currently loading to prevent duplicate runs
    if (scanResultsLoadingRef.current) {
      return;
    }
    
    const currentKey = `${scopedTaskKey}::scan:${scanId || 'null'}`;
    // Check if we've already processed this exact combination
    if (lastProcessedTaskKeyRef.current === currentKey && lastProcessedScanIdRef.current === scanId) {
      // Already processed this exact combination, skip
      return;
    }
    
    // Check if scan results are already loaded for this scanId
    if (scanId) {
      const scanKey = `${scopedTaskKey}::scan:${scanId}`;
      if (scanResultsLoadedRef.current.has(scanKey)) {
        // Already loaded, just mark as processed
        lastProcessedScanIdRef.current = scanId;
        lastProcessedTaskKeyRef.current = currentKey;
        return;
      }
    }
    
    // Mark as loading IMMEDIATELY to prevent duplicate runs
    scanResultsLoadingRef.current = true;
    // Mark as processed IMMEDIATELY to prevent re-runs
    lastProcessedScanIdRef.current = scanId;
    lastProcessedTaskKeyRef.current = currentKey;
    
    // Create AbortController for this scan results load
    const abortController = new AbortController();
    scanResultsAbortControllerRef.current = abortController;
    
    const loadScanResultsIfNeeded = async () => {
      // Check if we're navigating away before starting any async operations
      if (isNavigatingAwayRef.current || abortController.signal.aborted) {
        // Silently exit - navigation is in progress
        scanResultsLoadingRef.current = false;
        return;
      }
      
      // This check is redundant now since we set it above, but keep for safety
      if (scanResultsLoadingRef.current === false) {
        // This shouldn't happen, but if it does, mark as loading
        scanResultsLoadingRef.current = true;
      }
      
      // If no scanId but we have a task, try to extract it from task.id or find from homework scans
      let effectiveScanId = scanId || dockState?.task?.scanId;
      
      // Try to extract scanId from task.id if it's in format "scan_XXX"
      if (!effectiveScanId && dockState?.task?.id) {
        const taskId = dockState.task.id;
        const scanIdMatch = taskId.match(/^scan_(\d+)$/);
        if (scanIdMatch) {
          effectiveScanId = parseInt(scanIdMatch[1], 10);
          // Extracted scanId from task.id
          if (effectiveScanId !== scanId) {
            setScanId(effectiveScanId);
          }
        }
      }
      
      // Skip scan loading for tasks that don't have scans
      const taskSource = dockState?.task?.source;
      const taskId = dockState?.task?.id;
      
      // Tasks that definitely don't have scans
      const tasksWithoutScans = ["audio", "text", "manual"];
      if (taskSource && tasksWithoutScans.includes(taskSource)) {
        // Silently skip - these tasks don't need scan results
        scanResultsLoadingRef.current = false;
        return;
      }
      
      // If task ID doesn't match scan pattern (scan_XXX) and no scanId, it's likely not scan-based
      const hasScanIdPattern = taskId && (taskId.startsWith('scan_') || /^scan_\d+$/.test(taskId));
      const hasExplicitScanId = effectiveScanId || dockState?.task?.scanId;
      
      // Only search for scans if task might be scan-related (has scan_ pattern or we're unsure)
      // Don't search if task is clearly not scan-based
      if (!hasExplicitScanId && !hasScanIdPattern && taskSource && taskSource !== "image") {
        // Task is not image-based and doesn't have scan pattern - skip silently
        scanResultsLoadingRef.current = false;
        return;
      }
      
      // If still no scanId, try to find it from homework scans (fallback)
      // Only do this for image-based tasks or tasks with scan pattern
      if (!effectiveScanId && hasScanIdPattern && dockState?.task?.id && dockState?.task?.userId) {
        // Check if aborted before making API call
        if (isNavigatingAwayRef.current || abortController.signal.aborted) {
          // Silently exit - navigation is in progress
          scanResultsLoadingRef.current = false;
          return;
        }
        
        try {
          const effectiveStudentId =
            dockState.task.userId ||
            dockState.task.studentId ||
            studentId ||
            "anon";
          const { data: scanData } = await api.get(`/homeworkscans`, {
            params: { student_id: effectiveStudentId },
            withCredentials: true,
            signal: abortController.signal, // Add abort signal to API call
          });
          
          if (Array.isArray(scanData) && scanData.length > 0) {
            // Try to match by task.id first (if it's scan_XXX format)
            let matchedScan = null;
            if (dockState.task.id && dockState.task.id.startsWith('scan_')) {
              const scanIdFromTask = parseInt(dockState.task.id.replace('scan_', ''), 10);
              matchedScan = scanData.find(s => s.id === scanIdFromTask || s.id === String(scanIdFromTask));
            }
            
            // If no match, use the most recent scan
            if (!matchedScan) {
              matchedScan = scanData.sort((a, b) => 
                new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)
              )[0];
            }
            
            if (matchedScan?.id) {
              effectiveScanId = matchedScan.id;
              // Found scanId from homework scans
              // Only set scanId if it's different to avoid triggering the effect again
              if (effectiveScanId !== scanId) {
                setScanId(effectiveScanId);
              }
            }
          }
        } catch (error) {
          // Only log error if it's not a cancellation (expected when navigating away)
          if (error.name !== "CanceledError" && error.code !== "ERR_CANCELED" && import.meta.env.DEV) {
            console.error("❌ FOOTERCHAT: Failed to fetch scanId from homework scans:", error);
          }
        }
      }
      
      if (!effectiveScanId) {
        // Only log warning if task is image-based (should have scanId) but doesn't
        // Silently skip for other task types
        if (taskSource === "image" && hasScanIdPattern && import.meta.env.DEV) {
          console.log("⚠️ FOOTERCHAT: Image task expected scanId but none found");
        }
        scanResultsLoadingRef.current = false;
        return;
      }
      
      // Check if we've already loaded results for this scanId
      const scanKey = `${scopedTaskKey}::scan:${effectiveScanId}`;
      if (scanResultsLoadedRef.current.has(scanKey)) {
        // Scan results already loaded for this scanId, skipping
        return;
      }
      
      scanResultsLoadingRef.current = true;
      
      // Wait for backend messages to finish loading first
      if (loadingBackendMessages) {
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (loadingBackendMessages) return; // Still loading, skip this time
      }
      
      // Wait a bit for any existing messages to load
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check if we're navigating away - if so, don't proceed with scan results check
      // This check happens after the delay, so we need to verify again
      if (isNavigatingAwayRef.current || abortController.signal.aborted) {
        // Silently exit - navigation is in progress
        scanResultsLoadingRef.current = false;
        return;
      }
      
      const existingMessages = getChatMessages?.("homework", taskId) || [];
      
      // Final check before logging - navigation might have started during message retrieval
      if (isNavigatingAwayRef.current || abortController.signal.aborted) {
        // Silently exit - navigation is in progress
        scanResultsLoadingRef.current = false;
        return;
      }
      
      // Check if scan results are already present (check for table type or extractedText in content)
      // Also check for common scan result message patterns
      const hasScanResults = existingMessages.some(msg => {
        if (msg?.type === "table") return true;
        if (typeof msg?.content === "object" && (msg.content?.extractedText || msg.content?.qa)) return true;
        // Check if message content contains scan result indicators
        const contentStr = typeof msg?.content === "string" ? msg.content : JSON.stringify(msg?.content || "");
        if (contentStr.includes("What I saw in your picture") || 
            contentStr.includes("What I saw in your picture:") ||
            contentStr.includes("Fertig! Ich habe deine Hausaufgabe gelesen") ||
            contentStr.includes("Done! I've read your homework") ||
            contentStr.includes("I've read your homework") ||
            contentStr.includes("Super! Ich habe deine Hausaufgabe gefunden") ||
            contentStr.includes("Subject:") ||
            contentStr.includes("Fach erkannt:")) {
          return true;
        }
        return false;
      });
      
      // Final check before logging - navigation might have started during async operations
      if (isNavigatingAwayRef.current) {
        // Silently exit - navigation is in progress
        scanResultsLoadingRef.current = false;
        return;
      }
      
      // Checking for scan results
      
      // If we don't have scan results in messages, fetch and display them
      if (!hasScanResults) {
        try {
          // Loading scan results for scanId
          
          // Fetch scan details from API - use studentId from task / context
          const effectiveStudentId =
            dockState?.task?.userId ||
            dockState?.task?.studentId ||
            studentId ||
            null;
          
          if (!effectiveStudentId) {
            if (import.meta.env.DEV) {
              console.warn("⚠️ FOOTERCHAT: No studentId available, cannot fetch scan");
            }
            return;
          }
          
          const { data: scanData } = await api.get(`/homeworkscans`, {
            params: { student_id: effectiveStudentId },
            withCredentials: true,
          });
          
          // Fetched scan data
          
          if (Array.isArray(scanData)) {
            // Ensure scanId is a number for comparison
            const scanIdNum = typeof effectiveScanId === 'number' ? effectiveScanId : parseInt(effectiveScanId, 10);
            const scan = scanData.find(s => s.id === scanIdNum || s.id === effectiveScanId);
            // Searching for scanId
            
            if (scan && scan.raw_text) {
              const extracted = scan.raw_text || "";
              
              // Check if this exact scan result already exists in messages
              const exists = existingMessages.some(msg => {
                // Check for table type with matching extracted text
                if (msg?.type === "table" && typeof msg?.content === "object") {
                  return msg.content?.extractedText === extracted;
                }
                // Check if message content contains the extracted text
                const contentStr = typeof msg?.content === "string" ? msg.content : JSON.stringify(msg?.content || "");
                return contentStr.includes(extracted.slice(0, 50)); // Check first 50 chars to avoid exact match issues
              });
              
              if (!exists && extracted) {
                // Adding scan results to chat
                setChatMessages?.("homework", taskId, (prev) => {
                  const prevMsgs = prev || [];
                  
                  // Check again before adding to prevent race conditions
                  const alreadyHasResults = prevMsgs.some(msg => {
                    if (msg?.type === "table" && typeof msg?.content === "object") {
                      return msg.content?.extractedText === extracted;
                    }
                    const contentStr = typeof msg?.content === "string" ? msg.content : JSON.stringify(msg?.content || "");
                    return contentStr.includes(extracted.slice(0, 50));
                  });
                  
                  if (alreadyHasResults) {
                    // Scan results already added (race condition prevented)
                    return prevMsgs;
                  }
                  
                  // Add scan results only (tip is already added in createTaskAndOpenChat.js)
                  const scanResultMsg = formatMessage(
                    { extractedText: extracted, qa: [] },
                    "agent",
                    "table",
                    { agentName: selectedAgent || "Kibundo" }
                  );
                  return [...prevMsgs, scanResultMsg];
                });
                
                // Mark as loaded to prevent re-loading
                scanResultsLoadedRef.current.add(scanKey);
                // Mark as processed
                lastProcessedScanIdRef.current = effectiveScanId;
                lastProcessedTaskKeyRef.current = `${scopedTaskKey}::scan:${effectiveScanId}`;
              } else {
                // Scan results already exist in messages, skipping
                // Mark as loaded even if already exists
                scanResultsLoadedRef.current.add(scanKey);
                // Mark as processed
                lastProcessedScanIdRef.current = effectiveScanId;
                lastProcessedTaskKeyRef.current = `${scopedTaskKey}::scan:${effectiveScanId}`;
              }
            } else {
              // Scan exists but doesn't have raw_text yet - it might still be processing
              if (import.meta.env.DEV) {
                console.warn("⚠️ FOOTERCHAT: Scan found but no raw_text (scan may still be processing):", {
                  id: scan.id,
                  hasFile: !!scan.file_url,
                  processedAt: scan.processed_at,
                  createdAt: scan.created_at
                });
              }
              // Mark as processed to prevent repeated attempts, but don't add scan results
              scanResultsLoadedRef.current.add(scanKey);
              lastProcessedScanIdRef.current = effectiveScanId;
              lastProcessedTaskKeyRef.current = `${scopedTaskKey}::scan:${effectiveScanId}`;
            }
          } else {
            if (import.meta.env.DEV) {
              console.warn("⚠️ FOOTERCHAT: Scan data is not an array:", scanData);
            }
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error("❌ FOOTERCHAT: Failed to load scan results:", error);
          }
        } finally {
          scanResultsLoadingRef.current = false;
        }
      } else {
        // Scan results already present in messages
        // Mark as loaded even if already present
        if (effectiveScanId) {
          const scanKey = `${scopedTaskKey}::scan:${effectiveScanId}`;
          scanResultsLoadedRef.current.add(scanKey);
          // Mark as processed
          lastProcessedScanIdRef.current = effectiveScanId;
          lastProcessedTaskKeyRef.current = scanKey;
        }
        scanResultsLoadingRef.current = false;
      }
    };
    
    // Run the async function
    loadScanResultsIfNeeded();
    
    // Cleanup function: cancel any ongoing operations if component unmounts or navigation starts
    return () => {
      // Abort any ongoing scan results loading
      if (scanResultsAbortControllerRef.current) {
        scanResultsAbortControllerRef.current.abort();
        scanResultsAbortControllerRef.current = null;
      }
      isNavigatingAwayRef.current = true;
      scanResultsLoadingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId, scopedTaskKey]); // Only depend on scanId and scopedTaskKey to prevent excessive re-runs

  useEffect(() => {
    if (taskId !== stableTaskIdRef.current) {
      stableTaskIdRef.current = taskId;
      didSeedRef.current = false;
      uploadNudgeShownRef.current = false;
      // Clear fetch tracking when task changes
      lastFetchedConvIdRef.current = null;
    }
  }, [taskId]);

  useEffect(() => {
    const tConv = dockState?.task?.conversationId;
    const tScan = dockState?.task?.scanId;
    if (tConv && tConv !== conversationId) setConversationId(tConv);
    if (!tConv && !conversationId) {
      try {
        const stored =
          typeof window !== "undefined" && window.localStorage.getItem(convKey);
        if (stored && stored !== conversationId) setConversationId(stored);
      } catch {}
    }
    if (tScan && tScan !== scanId) setScanId(tScan);
  }, [
    convKey,
    dockState?.task?.conversationId,
    dockState?.task?.scanId,
    conversationId,
    scanId,
  ]);

  useEffect(() => {
    try {
      if (conversationId) localStorage.setItem(convKey, conversationId);
      else localStorage.removeItem(convKey);
    } catch {}
  }, [conversationId, convKey]);

  // Fetch backend messages when conversation ID changes (ONCE, with guards)
  useEffect(() => {
    if (conversationId && lastFetchedConvIdRef.current !== conversationId) {
      // Reset initial load flag when a new conversation starts
      isInitialLoadRef.current = true;
      fetchBackendMessages(conversationId);
    } else if (!conversationId) {
      setBackendMessages([]);
      isInitialLoadRef.current = true;
      lastFetchedConvIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // Only depend on conversationId, not fetchBackendMessages

  // Local buffer
  const [localMessages, setLocalMessages] = useState(() => {
    if (controlledMessagesProp) return controlledMessagesProp;
    const persisted = getChatMessages?.(
      stableModeRef.current,
      stableTaskIdRef.current
    );
    if (persisted?.length) return persisted;
    if (initialMessages?.length) return initialMessages;
    return [];
  });

  // 🌱 Seed ONLY when no persisted thread; otherwise hydrate from persisted
  const didSeedRef = useRef(false);
  useEffect(() => {
    if (!setChatMessages || !getChatMessages) return;

    const persisted =
      getChatMessages(stableModeRef.current, stableTaskIdRef.current) || [];
    const seedMessages = initialMessages?.length
      ? initialMessages
      : [];

    if (!didSeedRef.current) {
      if (persisted.length === 0 && seedMessages.length > 0) {
        setChatMessages(
          stableModeRef.current,
          stableTaskIdRef.current,
          [...seedMessages]
        );
        setLocalMessages(seedMessages);
      } else if (persisted.length > 0) {
        setLocalMessages(persisted);
      }
      didSeedRef.current = true;
    }
  }, [
    setChatMessages,
    getChatMessages,
    initialMessages,
    taskId,
  ]);

  // 🔥 Sync localMessages with persisted messages when they change
  // Only sync when scopedTaskKey changes or when we detect new messages
  useEffect(() => {
    if (controlledMessagesProp) return;
    if (!getChatMessages) return;
    
    // Use current taskId (not scopedTaskKey) to get latest messages - messages are stored by taskId only
    const persisted = getChatMessages(stableModeRef.current, taskId) || [];
    const persistedCount = persisted.length;
    
    // Get current message IDs
    const currentMessageIds = new Set(persisted.map(m => m?.id).filter(Boolean));
    
    // Only sync if task changed or if message count/IDs actually changed
    const taskChanged = lastSyncedTaskKeyRef.current !== taskId;
    const countChanged = persistedCount !== lastSyncedMessageCountRef.current;
    const idsChanged = taskChanged || persisted.some(m => m?.id && !lastSyncedMessageIdsRef.current.has(m.id));
    const messagesChanged = taskChanged || (countChanged && idsChanged);
    
    // Use a ref to track the last sync to prevent duplicate syncs
    const syncKey = `${taskId}::${persistedCount}::${Array.from(currentMessageIds).sort().join(',')}`;
    
    // Prevent duplicate syncs - check if we already synced with this exact key
    if (lastSyncRef.current.key === syncKey) {
      return;
    }
    
    if (messagesChanged) {
      lastSyncRef.current = { key: syncKey, count: persistedCount, ids: currentMessageIds };
      
      setLocalMessages((prev) => {
        const merged = mergeById(persisted, prev);
        // Only update if there's a real change (new messages added or changed)
        if (merged.length !== prev.length || merged.some((m, i) => m.id !== prev[i]?.id)) {
          lastSyncedMessageCountRef.current = merged.length;
          lastSyncedTaskKeyRef.current = taskId;
          lastSyncedMessageIdsRef.current = currentMessageIds;
          return merged;
        }
        return prev;
      });
    } else {
      // Update refs even if no change to track current state
      lastSyncedMessageCountRef.current = persistedCount;
      lastSyncedTaskKeyRef.current = scopedTaskKey;
      lastSyncedMessageIdsRef.current = currentMessageIds;
      // Update sync key to prevent re-running
      lastSyncRef.current = { key: syncKey, count: persistedCount, ids: currentMessageIds };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, controlledMessagesProp]); // Only depend on taskId to prevent excessive re-runs

  // Helper to check if message has valid content
  const hasValidContent = useCallback((message) => {
    if (!message || typeof message !== "object") return false;
    
    // Check if message has a type that doesn't require content (like status messages)
    if (message.type === "status" && message.transient) {
      return true; // Allow transient status messages
    }
    
    // For table/analysis type, check if it has extractedText or qa
    if (message.type === "table" || message.type === "analysis") {
      const hasExtracted = message.content?.extractedText || message.content?.raw_text || message.content?.analysisText;
      const hasQa = Array.isArray(message.content?.qa) && message.content.qa.length > 0;
      const hasQuestions = Array.isArray(message.content?.questions) && message.content.questions.length > 0;
      return !!(hasExtracted || hasQa || hasQuestions);
    }
    
    // For image type, check if it has a valid src
    if (message.type === "image") {
      const src = typeof message.content === "string" ? message.content : message?.content?.url;
      return !!src && src.trim() !== "";
    }
    
    // For tip type, check if it has content
    if (message.type === "tip") {
      const tipContent = typeof message.content === "string" 
        ? message.content 
        : message.content?.text || message.content || "";
      return tipContent.trim() !== "";
    }
    
    // For text type, check if content is not empty
    const content = typeof message.content === "string" 
      ? message.content 
      : message.content != null 
        ? String(message.content) 
        : "";
    
    return content.trim() !== "";
  }, []);

  // Recompute messages (merge backend with existing messages to avoid duplicates)
  const msgs = useMemo(() => {
    let messages;
    
    if (controlledMessagesProp) {
      messages = controlledMessagesProp;
    } else {
      // Get existing messages - use current taskId directly (not scopedTaskKey) - messages are stored by taskId only
      const persisted = getChatMessages?.(stableModeRef.current, taskId) || [];
      const existingLocal = localMessages || [];
      
      // Debug logging (commented out to reduce console noise)
      // console.log("📊 HomeworkChat msgs useMemo:", {
      //   persisted: persisted.length,
      //   localMessages: existingLocal.length,
      //   backendMessages: backendMessages.length,
      //   scopedTaskKey,
      //   taskId: dockState?.task?.id,
      //   taskUserId: dockState?.task?.userId,
      // });
      
      // If we have backend messages, merge them with existing messages
      if (backendMessages.length > 0) {
        messages = mergeById(backendMessages, [...persisted, ...existingLocal]);
      } else {
        // Fallback to local storage if no backend messages
        messages = mergeById(persisted, existingLocal);
        if (messages.length === 0 && existingLocal.length > 0) {
          messages = existingLocal;
        }
      }
    }
    
    // Filter out messages with empty content
    return messages.filter(hasValidContent);
  }, [controlledMessagesProp, backendMessages, localMessages, conversationId, scanId, taskId, dockState?.chatByKey, hasValidContent, getChatMessages]); // Removed getChatMessages from deps to prevent re-renders

  // never persist transient/base64 previews
  const filterForPersist = useCallback((arr) => {
    return (arr || []).filter((m) => {
      if (m?.transient === true) return false;
      if (
        m?.type === "image" &&
        typeof m.content === "string" &&
        m.content.startsWith("data:")
      ) {
        return false;
      }
      return true;
    });
  }, []);

  // ✅ Use msgs (rendered source) as base so we don't drop persisted items
  const updateMessages = useCallback(
    (next) => {
      const compute = (base) => (typeof next === "function" ? next(base) : next);

      if (controlledMessagesProp && onMessagesChangeProp) {
        const base = compute(controlledMessagesProp);
        if (base !== controlledMessagesProp) onMessagesChangeProp(base);
        return;
      }

      const baseNow = Array.isArray(msgs) ? msgs : [];
      const nextVal = compute(baseNow);

      if (setChatMessages) {
        const persisted = filterForPersist(nextVal);
        setChatMessages(
          stableModeRef.current,
          stableTaskIdRef.current,
          persisted
        );
      }
      setLocalMessages(nextVal);
    },
    [
      controlledMessagesProp,
      onMessagesChangeProp,
      setChatMessages,
      filterForPersist,
      msgs,
    ]
  );

  // UI state
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showRescanModal, setShowRescanModal] = useState(false);
  const [isRescanUpload, setIsRescanUpload] = useState(false);
  
  // Voice input (ASR) - works even when chat is collapsed
  const { listening: isRecording, start: startRecording, stop: stopRecording, reset: resetRecording } = useASR({
    lang: "de-DE",
    onTranscript: (transcript) => {
      // Update draft with transcript as user speaks (interim results)
      setDraft(prev => {
        // Only update if we got new content
        if (transcript && transcript.trim()) {
          return transcript;
        }
        return prev;
      });
    },
    onError: (error) => {
      if (error === "not_supported") {
        antdMessage.warning("Spracherkennung wird in diesem Browser nicht unterstützt.");
      } else if (error === "no-speech") {
        antdMessage.info("Keine Sprache erkannt. Versuche es nochmal.");
      } else {
        antdMessage.error("Fehler bei der Spracherkennung. Bitte versuche es erneut.");
      }
    }
  });
  
  const handleMicClick = useCallback(async () => {
    if (isRecording) {
      // Stop recording and get final transcript
      const transcript = await stopRecording();
      if (transcript && transcript.trim()) {
        setDraft(transcript);
        // Auto-send if there's content (optional - can be changed to manual send)
        // For now, just put it in the input so user can review/edit before sending
      }
    } else {
      // Start recording - does NOT open chat if collapsed (per feedback H.4)
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const sendingRef = useRef(false);
  const lastSentMessageRef = useRef(null);
  const lastSentTimeRef = useRef(0);
  const isInitialLoadRef = useRef(true); // Track if this is the initial load

  // autoscroll
  const lastLenRef = useRef(0);
  useEffect(() => {
    if (!listRef.current) return;
    if (msgs?.length === lastLenRef.current && !typing && !externalTyping) return;
    lastLenRef.current = msgs?.length ?? 0;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight + 9999,
      behavior: "smooth",
    });
  }, [msgs, typing, externalTyping]);

  const hasAnyImage = useMemo(
    () => Array.isArray(msgs) && msgs.some((m) => m?.type === "image"),
    [msgs]
  );

  const uploadNudgeShownRef = useRef(false);

  const handleSendText = useCallback(
    async (text) => {
      if (effectiveReadOnly) {
        if (isTaskCompleted) {
          antdMessage?.warning("Diese Aufgabe ist bereits abgeschlossen. Du kannst keine weiteren Nachrichten senden.");
        }
        return;
      }
      const t = (text || "").trim();
      if (!t) return;
      if (sendingRef.current || sending) return;

      const now = Date.now();
      if (
        lastSentMessageRef.current === t &&
        now - lastSentTimeRef.current < 2000
      ) {
        return;
      }

      const recentStudentMessages = (msgs || [])
        .filter((m) => m?.from === "student" && m?.content === t)
        .slice(-2);
      if (recentStudentMessages.length > 0) {
        const lastMessage = recentStudentMessages[recentStudentMessages.length - 1];
        const messageTime = new Date(lastMessage.timestamp).getTime();
        if (now - messageTime < 3000) return;
      }

      lastSentMessageRef.current = t;
      lastSentTimeRef.current = now;

      sendingRef.current = true;
      setSending(true);
      setTyping(true); // Show thinking indicator in chat area
      
      // Mark that user has sent a message, so future responses should be spoken
      isInitialLoadRef.current = false;

      const optimisticMsg = formatMessage(t, "student", "text", { pending: true });
      updateMessages((m) => [...m, optimisticMsg]);

      try {
        if (onSendText) {
          await onSendText(t);
          return;
        }

        const firstUrl = conversationId
          ? `conversations/${conversationId}/message`
          : `conversations/message`;

        let resp;
        try {
          resp = await api.post(firstUrl, { message: t, scanId, agentName: selectedAgent, mode: "homework", studentId: studentId }, {
            withCredentials: true,
          });
        } catch (err) {
          const code = err?.response?.status;
          if (code === 404) {
            const payload = {
              question: t,
              ai_agent: selectedAgent,
              mode: "homework",
              scanId,
              conversationId,
            };
            if (agentMeta?.entities?.length) {
              payload.entities = agentMeta.entities;
            }
            if (
              agentMeta?.grade !== null &&
              agentMeta?.grade !== undefined &&
              agentMeta?.grade !== ""
            ) {
              payload.class = agentMeta.grade;
            }
            if (agentMeta?.state) {
              payload.state = agentMeta.state;
            }

            const r = await api.post("ai/chat", payload, {
              withCredentials: true,
            });
            const parsedMessages = parseResponseWithTips(r?.data?.answer || "Okay!", r?.data?.agentName || selectedAgent, studentFirstName);
            updateMessages((m) => [
              ...m.filter((x) => !x?.pending),
              ...parsedMessages,
            ]);
            
            // Speak agent response if TTS is enabled
            if (ttsEnabled && r?.data) {
              const speechText = extractSpeechText(r.data);
              if (speechText) {
                speak(speechText);
              }
            }
            return;
          }
          if (conversationId && (code === 400 || code === 404)) {
            resp = await api.post(`conversations/message`, { message: t, scanId, agentName: selectedAgent, mode: "homework", studentId: studentId }, {
              withCredentials: true,
            });
          } else {
            throw err;
          }
        }

        const j = resp?.data || {};
        if (j?.conversationId && j.conversationId !== conversationId) {
          setConversationId(j.conversationId);
        }

        const cid = j?.conversationId || conversationId;
        if (cid) {
          const r2 = await api.get(`conversations/${cid}/messages`);
          const serverMessages = mapServerToInternal(r2.data);
          updateMessages((current) => {
            const withoutPending = current.filter((m) => !m?.pending);
            
            // Merge server messages with local messages to avoid duplicates
            const merged = mergeById(serverMessages, withoutPending);
            
            // Only speak agent messages if this is NOT the initial load (i.e., user just sent a message)
            if (ttsEnabled && !isInitialLoadRef.current && serverMessages.length > 0) {
              const latestAgentMessage = [...serverMessages]
                .reverse()
                .find(msg => msg.from === "agent" || msg.sender === "agent");
              if (latestAgentMessage) {
                const speechText = extractSpeechText(latestAgentMessage.content);
                if (speechText) {
                  speak(speechText);
                }
              }
            }
            
            return merged;
          });
        } else if (j?.answer) {
          const parsedMessages = parseResponseWithTips(j.answer, j?.agentName || selectedAgent, studentFirstName);
          updateMessages((current) => [
            ...current.filter((m) => !m?.pending),
            ...parsedMessages,
          ]);
          
          // Speak agent response if TTS is enabled
          if (ttsEnabled && j) {
            const speechText = extractSpeechText(j);
            if (speechText) {
              speak(speechText);
            }
          }
        }
      } catch (err) {
        const status = err?.response?.status;
        const serverMsg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Unbekannter Fehler";
        updateMessages((current) => [
          ...current.filter((m) => !m?.pending),
          formatMessage(`Fehler beim Senden (${status ?? "?"}). ${serverMsg}`, "agent", "text", { agentName: selectedAgent }),
        ]);
        antdMessage.error(`Nachricht fehlgeschlagen: ${serverMsg}`);
      } finally {
        setSending(false);
        setTyping(false); // Hide thinking indicator when done
        sendingRef.current = false;
      }
    },
    [sending, onSendText, updateMessages, antdMessage, conversationId, scanId, msgs, agentMeta, ttsEnabled, speak, selectedAgent, effectiveReadOnly, studentId]
  );

  const handleMediaUpload = useCallback(
    async (files) => {
      if (effectiveReadOnly) return;
      if (!files.length || uploading) return;
      setUploading(true);
      setTyping(true); // Show thinking indicator when uploading

      const readAsDataURL = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      try {
        for (const file of files) {
          const isImg = (file.type || "").startsWith("image/");
          let dataUrl = null;
          if (isImg) {
            try {
              dataUrl = await readAsDataURL(file);
            } catch {}
          }

          // Removed loading message - just upload silently

          try {
            if (onSendMedia) {
              await onSendMedia([file]);
            } else {
              const formData = new FormData();
              formData.append("file", file);
              
              // 🔥 Pass existing conversationId and scanId to continue the conversation
              if (conversationId) {
                formData.append("conversationId", String(conversationId));
              }
              if (scanId) {
                formData.append("scanId", String(scanId));
              }

              const res = await api.post(`ai/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });

              const data = res?.data || {};
              const extracted =
                data?.scan?.raw_text || data?.extractedText || "";
              const qa = Array.isArray(data?.parsed?.questions)
                ? data.parsed.questions
                : Array.isArray(data?.qa)
                ? data.qa
                : [];
              const needsClearerImage = data?.needsClearerImage || data?.parsed?.unclear || data?.error;
              const isDifferentHomework = data?.isDifferentHomework || false; // 🔥 Check if this is a different homework

              updateMessages((m) => {
                const arr = [...m];
                const idx = arr.findIndex((msg) => msg.id === loadingMessage.id);
                
                if (needsClearerImage) {
                  // Handle unclear image case
                  if (idx !== -1)
                    arr[idx] = formatMessage("🤔 Ich kann das Bild nicht gut lesen...", "agent", "text", { agentName: selectedAgent });
                  
                  arr.push(
                    formatMessage(
                      "📸 **Bitte mach ein besseres Foto!**\n\n" +
                      "✨ **Tipps für ein gutes Foto:**\n" +
                      "• Halte das Handy ruhig\n" +
                      "• Achte auf gutes Licht (nicht zu dunkel)\n" +
                      "• Das Blatt soll ganz im Bild sein\n" +
                      "• Der Text soll scharf und klar zu lesen sein\n\n" +
                      "Dann kann ich dir viel besser helfen! 😊",
                      "agent",
                      "text",
                      { agentName: selectedAgent }
                    )
                  );
                } else if (isDifferentHomework) {
                  // 🔥 Handle different homework detected
                  if (idx !== -1)
                    arr[idx] = formatMessage("🔍 Ich habe das Bild analysiert...", "agent", "text", { agentName: selectedAgent });
                  
                  arr.push(
                    formatMessage(
                      "⚠️ **Das ist eine andere Hausaufgabe!**\n\n" +
                      "Ich sehe, dass dieses Bild zu einer anderen Hausaufgabe gehört als die, über die wir gerade sprechen.\n\n" +
                      "Möchtest du:\n" +
                      "• Mit dieser neuen Hausaufgabe weitermachen? (Ich werde die neue Hausaufgabe analysieren)\n" +
                      "• Zur vorherigen Hausaufgabe zurückkehren?\n\n" +
                      "Sag mir einfach, was du möchtest! 😊",
                      "agent",
                      "text",
                      { agentName: selectedAgent }
                    )
                  );
                  
                  // Still show the extracted content so student can see what was detected
                  if (extracted || qa.length > 0) {
                    arr.push(formatMessage({ extractedText: extracted, qa }, "agent", "table", { agentName: selectedAgent }));
                  }
                } else if (extracted || qa.length > 0) {
                  // Handle successful analysis (same homework continuation)
                  if (idx !== -1)
                    arr[idx] = formatMessage("🎉 Fertig! Ich habe dein Bild analysiert!", "agent", "text", { agentName: selectedAgent });
                  
                  arr.push(formatMessage({ extractedText: extracted, qa }, "agent", "table", { agentName: selectedAgent }));
                  
                  // If this was a rescan upload, show completion message and navigate to feedback
                  if (isRescanUpload) {
                    arr.push(
                      formatMessage(
                        "✅ Perfekt! Ich habe dein fertiges Arbeitsblatt gesehen. Jetzt kann ich dir eine Rückmeldung geben! 🎉",
                        "agent",
                        "text",
                        { agentName: selectedAgent }
                      )
                    );
                    // Close chat and navigate to feedback after a short delay
                    setTimeout(() => {
                      setIsRescanUpload(false); // Reset flag
                      onClose?.(); // Close chat
                      // Navigate to feedback page
                      const taskId = dockState?.task?.id || taskId;
                      navigate("/student/homework/feedback", { 
                        state: { taskId: taskId || null },
                        replace: false 
                      });
                    }, 2000); // 2 second delay to show the message
                  } else {
                    arr.push(
                      formatMessage(
                        "✅ Perfekt! Ich habe dein neues Bild zur Hausaufgabe hinzugefügt. Du kannst mir weiter Fragen stellen! 😊",
                        "agent",
                        "text",
                        { agentName: selectedAgent }
                      )
                    );
                  }
                } else {
                  // Handle other cases
                  if (idx !== -1)
                    arr[idx] = formatMessage("🤔 Ich kann das Bild nicht gut lesen...", "agent", "text", { agentName: selectedAgent });
                  
                  arr.push(
                    formatMessage(
                      "📸 **Das Bild ist nicht klar genug!**\n\n" +
                      "✨ **Versuche es nochmal mit:**\n" +
                      "• Mehr Licht\n" +
                      "• Ruhiger Hand\n" +
                      "• Scharfem Text\n\n" +
                      "Dann kann ich dir helfen! 😊",
                      "agent",
                      "text",
                      { agentName: selectedAgent }
                    )
                  );
                }
                return arr;
              });

              const newCid = data?.conversationId;
              if (newCid && newCid !== conversationId) setConversationId(newCid);
              
              // Update scanId if provided in response
              const newScanId = data?.scan?.id;
              if (newScanId && newScanId !== scanId) setScanId(newScanId);

              // Upsert task in local storage
              try {
                const sid = studentId || "anon";
                const tasksKeyUser = `${TASKS_KEY}::u:${sid}`;
                const nowIso = new Date().toISOString();
                const effectiveTaskId = taskId || "global";
                const load = () => {
                  try {
                    return JSON.parse(localStorage.getItem(tasksKeyUser) || "[]");
                  } catch {
                    return [];
                  }
                };
                const save = (arr) => {
                  try {
                    localStorage.setItem(tasksKeyUser, JSON.stringify(arr));
                    return true;
                  } catch {
                    return false;
                  }
                };
                const tasks = load();
                const idx = tasks.findIndex((t) => t?.id === effectiveTaskId);
                const base = idx >= 0 ? tasks[idx] : {};

                const deriveSubject = (text) => {
                  const lower = (text || "").toLowerCase();
                  if (lower.match(/mathe|rechnen|zahl/)) return "Mathe";
                  if (lower.match(/deutsch|text|lesen/)) return "Deutsch";
                  if (lower.match(/englisch|english/)) return "Englisch";
                  if (lower.match(/wissenschaft|science/)) return "Science";
                  return "Sonstiges";
                };
                const deriveWhat = (text, count) => {
                  if (count > 0) return `${count} Frage${count > 1 ? "n" : ""}`;
                  if ((text || "").length > 50) return "Hausaufgabe";
                  return "Foto-Aufgabe";
                };

                const subjectFromAnalysis = extracted ? deriveSubject(extracted) : null;
                const whatFromAnalysis = deriveWhat(extracted, qa.length);
                const descriptionFromAnalysis = extracted
                  ? extracted.slice(0, 120).trim() + (extracted.length > 120 ? "..." : "")
                  : null;

                const updated = {
                  id: effectiveTaskId,
                  createdAt: base.createdAt || nowIso,
                  updatedAt: nowIso,
                  subject: subjectFromAnalysis || base.subject || "Sonstiges",
                  what: whatFromAnalysis || base.what || "Foto-Aufgabe",
                  description:
                    descriptionFromAnalysis || base.description || (file?.name || ""),
                  due: base.due || null,
                  done: base.done ?? false,
                  source: base.source || "image",
                  fileName: base.fileName || file?.name || null,
                  fileType: base.fileType || file?.type || null,
                  fileSize: base.fileSize || file?.size || null,
                  hasImage: true,
                  scanId: data?.scan?.id ?? base.scanId ?? null,
                  conversationId: newCid ?? base.conversationId ?? null,
                  userId: sid,
                };
                const next = [...tasks];
                if (idx >= 0) next[idx] = { ...base, ...updated };
                else next.unshift(updated);
                if (save(next)) {
                  try {
                    window.dispatchEvent(new Event("kibundo:tasks-updated"));
                  } catch {}
                }
              } catch {}
            }
          } catch (err) {
            const status = err?.response?.status;
            const serverMsg =
              err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              "Unbekannter Fehler";
            updateMessages((m) => {
              const arr = [...m];
              const idx = arr.findIndex((msg) => msg.id === loadingMessage.id);
              if (idx !== -1) {
                arr[idx] = formatMessage(
                  `Analyse fehlgeschlagen (${status ?? "?"}). ${serverMsg}`,
                  "agent",
                  "text",
                  { agentName: selectedAgent }
                );
              }
              return arr;
            });
            antdMessage.error(`Upload/Analyse fehlgeschlagen: ${serverMsg}`);
          }
        }
      } finally {
        setUploading(false);
        setTyping(false); // Hide thinking indicator when upload is done
      }
    },
    [onSendMedia, updateMessages, antdMessage, uploading, conversationId, studentId, taskId, effectiveReadOnly, isRescanUpload, selectedAgent, dockState?.task?.id, onClose, navigate, scanId]
  );

  const sendText = useCallback(() => {
    if (effectiveReadOnly) return;
    if (!draft.trim()) return;
    if (sendingRef.current || sending) return;
    const originalDraft = draft;
    setDraft("");
    handleSendText(originalDraft).then(() => {
      requestAnimationFrame(() => inputRef.current?.focus());
    }).catch(() => {
      setDraft(originalDraft);
    });
  }, [draft, handleSendText, sending, effectiveReadOnly]);

  const onMinimise = () => {
    if (typeof onClose === "function") onClose();
    else navigate(minimiseTo);
  };

  // Handle rescan upload - bypasses chat and goes directly to completion
  const handleRescanUpload = useCallback(async (file) => {
    if (!file || !dockState?.task) {
      if (import.meta.env.DEV) {
        console.error("❌ handleRescanUpload: Missing file or task", { file: !!file, task: !!dockState?.task });
      }
      return;
    }
    
    // Starting rescan upload
    
    try {
      setUploading(true);
      
      // Upload the completion photo
      const formData = new FormData();
      formData.append("file", file);
      const uploadResponse = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploadedUrl = uploadResponse?.data?.fileUrl || uploadResponse?.data?.url;
      
      if (!uploadedUrl) {
        throw new Error("Foto konnte nicht hochgeladen werden");
      }
      
      const timestamp = new Date().toISOString();
      const task = dockState.task;
      const taskId = task.id;
      const scanId = task.scanId;
      
      // Update task in localStorage
      try {
        const effectiveStudentId = task.userId || studentId || "anon";
        const tasksKeyUser = `${TASKS_KEY}::u:${effectiveStudentId}`;
        const load = () => {
          try {
            return JSON.parse(localStorage.getItem(tasksKeyUser) || "[]");
          } catch {
            return [];
          }
        };
        const save = (arr) => {
          try {
            localStorage.setItem(tasksKeyUser, JSON.stringify(arr));
            return true;
          } catch {
            return false;
          }
        };
        
        const tasks = load();
        const idx = tasks.findIndex((t) => t?.id === taskId);
        const baseTask = idx >= 0 ? tasks[idx] : task;
        
        const updatedTask = {
          ...baseTask,
          completionPhotoUrl: uploadedUrl,
          completedAt: timestamp,
          done: true,
        };
        
        const next = [...tasks];
        if (idx >= 0) {
          next[idx] = updatedTask;
        } else {
          next.unshift(updatedTask);
        }
        save(next);
        
        // Dispatch event to update homework list
        try {
          window.dispatchEvent(new Event("kibundo:tasks-updated"));
        } catch {}
      } catch (storageError) {
        if (import.meta.env.DEV) {
          console.error("Error updating task in storage:", storageError);
        }
      }
      
      // Sync to server
      if (scanId) {
        try {
          await api.put(`/homeworkscans/${scanId}/completion`, {
            completedAt: timestamp,
            completionPhotoUrl: uploadedUrl,
          }, {
            meta: { toast5xx: false },
          });
        } catch (serverError) {
          if (import.meta.env.DEV) {
            console.error("Error syncing completion to server:", serverError);
          }
        }
      }
      
      // Close chat and navigate to feedback
      // Upload complete, navigating to feedback
      setIsRescanUpload(false);
      
      // Mark that we're navigating away to prevent scan results check from running
      isNavigatingAwayRef.current = true;
      // Also stop any ongoing scan results loading
      scanResultsLoadingRef.current = false;
      // Abort any ongoing scan results API calls
      if (scanResultsAbortControllerRef.current) {
        scanResultsAbortControllerRef.current.abort();
        scanResultsAbortControllerRef.current = null;
      }
      
      // Close chat first
      if (onClose) {
        // Closing chat via onClose
        onClose();
      }
      if (closeChat) {
        // Closing chat via closeChat
        closeChat();
      }
      
      // Navigate to feedback page with a small delay to ensure chat closes
      setTimeout(() => {
        // Navigating to feedback page
        navigate("/student/homework/feedback", {
          state: { taskId: taskId || null },
          replace: false,
        });
      }, 200);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("❌ Fehler beim Hochladen des Abschlussfotos:", error);
      }
      antdMessage.error("Abschlussfoto konnte nicht hochgeladen werden.");
      setIsRescanUpload(false);
    } finally {
      setUploading(false);
    }
  }, [dockState?.task, studentId, onClose, navigate, antdMessage, closeChat]);

  const startNewChat = useCallback(() => {
    // 🔥 Clear all conversation state first
    setConversationId(null);
    setBackendMessages([]);
    setLocalMessages([]);
    setDraft("");
    
    // Clear conversation ID from localStorage
    try {
      localStorage.removeItem(convKey);
    } catch (e) {
      // Failed to clear conversationId
    }
    
    // Clear chat messages from context
    clearChatMessages?.(mode, scopedTaskKey);
    setChatMessages?.(mode, scopedTaskKey, []);
    
    // Reset refs
    lastFetchedConvIdRef.current = null;
    fetchingBackendMessagesRef.current = false;
    
    // 🔥 Close current chat (both dock and sheet)
    closeChat?.();
    onClose?.(); // Close the sheet in FooterChat
    
    // Navigate to homework doing page so student can scan new homework
    // Use a small delay to ensure the sheet closes first
    setTimeout(() => {
      navigate("/student/homework/doing", { replace: true });
    }, 150);
  }, [closeChat, onClose, navigate, setConversationId, setBackendMessages, setLocalMessages, setDraft, convKey, clearChatMessages, setChatMessages, mode, scopedTaskKey]);

  const handleCameraChange = (e) => {
    if (effectiveReadOnly) return;
    const file = e.target.files?.[0];
    if (file) {
      // If this is a rescan upload, use the rescan handler instead
      if (isRescanUpload) {
        // Camera: Rescan upload detected
        handleRescanUpload(file);
      } else {
        // Camera: Regular upload
        handleMediaUpload([file]);
      }
    }
    e.target.value = "";
  };
  const handleGalleryChange = (e) => {
    if (effectiveReadOnly) return;
    const files = Array.from(e.target.files || []);
    if (files.length) {
      // If this is a rescan upload, use the rescan handler instead (only first file)
      if (isRescanUpload) {
        // Gallery: Rescan upload detected
        handleRescanUpload(files[0]);
      } else {
        // Gallery: Regular upload
        handleMediaUpload(files);
      }
    }
    e.target.value = "";
  };

  const renderMessageContent = (message) => {
    switch (message.type) {
      case "tip":
        const tipContent = typeof message.content === "string" 
          ? message.content 
          : message.content?.text || message.content || "";
        return (
          <div className="w-full">
            <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 rounded-xl border-2 border-amber-300 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                  <BulbOutlined className="text-amber-900 text-lg" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-amber-900 text-base mb-2 flex items-center gap-2">
                    💡 Tipp
                  </div>
                  <div className="text-amber-800 text-base leading-relaxed whitespace-pre-wrap">
                    {tipContent}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "image":
        return (
          <div className="relative">
            <img
              src={
                typeof message.content === "string"
                  ? message.content
                  : message.content?.url || ""
              }
              alt={message.fileName || "Hochgeladenes Bild"}
              className="max-w-full max-h-64 rounded-lg"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallbackApplied === "1") return;
                img.dataset.fallbackApplied = "1";
                img.src = FALLBACK_IMAGE_DATA_URL;
              }}
            />
            {message.fileName && (
              <div className="text-xs text-gray-500 mt-1 truncate">
                {message.fileName}
              </div>
            )}
          </div>
        );
      case "table":
      case "analysis": {
        const extracted =
          message.content?.extractedText ||
          message.content?.raw_text ||
          message.content?.analysisText;
        const qa = Array.isArray(message.content?.qa)
          ? message.content.qa
          : Array.isArray(message.content?.questions)
          ? message.content.questions
          : [];
        return (
          <div className="w-full">
            {extracted && (
              <div className="mb-4">
                <div className="font-bold mb-2 text-green-600 text-base flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                  📖 <span>Was ich in deinem Bild gesehen habe:</span>
                  </div>
                  {/* TTS button for extracted text */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (extracted && extracted.trim()) {
                        speak(extracted);
                      }
                    }}
                    className="flex-shrink-0 w-8 h-8 grid place-items-center rounded-full bg-green-100 hover:bg-green-200 transition-colors"
                    aria-label="Text vorlesen"
                    title="Text vorlesen"
                  >
                    <SoundOutlined className="text-green-600 text-sm" />
                  </button>
                </div>
                <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200 whitespace-pre-wrap text-base leading-relaxed">
                  {extracted}
                </div>
              </div>
            )}
            {qa.length > 0 && (
              <div>
                <div className="font-bold mb-3 text-blue-600 text-base flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                  🎯 <span>Deine Aufgaben ({qa.length}):</span>
                  </div>
                  {/* TTS button to read all questions */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const allQuestions = qa
                        .map((q, idx) => `Frage ${idx + 1}: ${q?.text || q?.question || ""}`)
                        .join(". ");
                      if (allQuestions && allQuestions.trim()) {
                        speak(allQuestions);
                      }
                    }}
                    className="flex-shrink-0 w-8 h-8 grid place-items-center rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
                    aria-label="Alle Fragen vorlesen"
                    title="Alle Fragen vorlesen"
                  >
                    <SoundOutlined className="text-blue-600 text-sm" />
                  </button>
                </div>
                <div className="space-y-3">
                  {qa.map((q, i) => (
                    <div key={i} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div>
                            <div className="font-bold text-blue-800 text-base mb-1 flex items-center gap-2">
                              💭 <span>Frage:</span>
                            </div>
                            <div className="text-gray-800 text-base leading-relaxed pl-6 flex items-start gap-2">
                              <span className="flex-1">{q?.text || q?.question || "-"}</span>
                              {/* TTS replay icon - allows students to replay the question text */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const questionText = q?.text || q?.question || "";
                                  if (questionText && questionText !== "-") {
                                    speak(questionText);
                                  }
                                }}
                                className="flex-shrink-0 w-6 h-6 grid place-items-center rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
                                aria-label="Frage vorlesen"
                                title="Frage vorlesen"
                              >
                                <SoundOutlined className="text-blue-600 text-xs" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!extracted && qa.length === 0 && (
              <div className="text-center p-6 bg-orange-50 rounded-xl border-2 border-orange-200">
                <div className="text-4xl mb-3">📸</div>
                <div className="text-orange-700 font-bold text-base mb-2">
                  Das Bild ist nicht klar genug!
                </div>
                <div className="text-orange-600 text-sm space-y-1">
                  <div>✨ <strong>Tipps für ein besseres Foto:</strong></div>
                  <div>• Halte das Handy ruhig</div>
                  <div>• Achte auf gutes Licht</div>
                  <div>• Das Blatt soll ganz im Bild sein</div>
                  <div>• Der Text soll scharf sein</div>
                </div>
                <div className="text-orange-700 font-medium text-sm mt-3">
                  Dann kann ich dir viel besser helfen! 😊
                </div>
              </div>
            )}
          </div>
        );
      }
      default:
        // Remove speech tags, clean angle brackets, and replace "Schüler" with student name
        let displayContent = typeof message.content === "string"
          ? removeSpeechTags(String(message.content))
          : String(message.content ?? "");
        displayContent = cleanAngleBrackets(displayContent);
        displayContent = replaceSchuelerWithName(displayContent, studentFirstName);
        return <div className="whitespace-pre-wrap">{displayContent}</div>;
    }
  };

  return (
    <div className={["relative w-full h-full bg-white overflow-hidden", className].join(" ")}>
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        onChange={handleCameraChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={handleGalleryChange}
        className="hidden"
      />

      {/* Minimize strip */}
      <div
        onClick={onMinimise}
        className="w-full cursor-pointer"
        style={{
          height: `${minimiseHeight}px`,
          backgroundImage: `url(${minimiseBg})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-label="Chat minimieren"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onMinimise()}
      />

      {/* Messages */}
      <div
        ref={listRef}
        className="relative px-3 overflow-y-auto bg-[#f3f7eb]"
        style={{ 
          height: `calc(100% - ${minimiseHeight}px)`,
          paddingTop: "max(0.5rem, env(safe-area-inset-top, 0.5rem))", // Fix clipping at top - account for safe area
          paddingBottom: "max(7rem, calc(6rem + env(safe-area-inset-bottom, 0px)))" // Extra bottom padding to prevent input box from covering last message
        }}
        aria-live="polite"
      >
        {msgs.map((message, idx) => {
          const roleLower = (message?.from ?? message?.sender ?? "agent").toLowerCase();
          const isStudent = roleLower === "student" || roleLower === "user";
          const isAgent = !isStudent;
          return (
            <div
              key={messageKey(message, idx)}
              className={`w-full flex ${isAgent ? "justify-start" : "justify-end"} mb-3`}
            >
              {isAgent && (
                <div className="flex flex-col mr-2 self-end">
                  <img src={agentIcon} alt="Kibundo" className="w-7 h-7 rounded-full" />
                  {message?.agentName && (
                    <div className="text-xs text-[#1b3a1b]/60 mt-1 text-center max-w-[60px] break-words">
                      {message.agentName}
                    </div>
                  )}
                </div>
              )}
              <div
                className={`max-w-[78%] px-3 py-2 rounded-2xl shadow-sm ${
                  isAgent ? "bg-white text-[#444]" : "bg-[#aee17b] text-[#1b3a1b]"
                }`}
              >
                {renderMessageContent(message)}
                <div className={`text-xs mt-1 ${isAgent ? "text-[#1b3a1b]/80" : "text-gray-500"}`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {!isAgent && (
                <div className="flex flex-col ml-2 self-end">
                  <img src={studentIcon} alt="Schüler" className="w-7 h-7 rounded-full" />
                  <div className="text-xs text-[#1b3a1b]/60 mt-1 text-center max-w-[60px] break-words">
                    {studentFirstName || "Du"}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {(typing || externalTyping) && (
          <div className="w-full flex justify-start mb-3">
            <div className="flex flex-col mr-2 self-end">
              <img
                src={agentIcon}
                alt={selectedAgent || "Kibundo"}
                className="w-7 h-7 rounded-full"
              />
              <div className="text-xs text-gray-600 mt-1 text-center max-w-[60px] break-words">
                {selectedAgent || "Kibundo"}
              </div>
            </div>
            <div className="max-w-[78%] px-3 py-2 rounded-2xl shadow-sm bg-white border border-gray-200">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                <div
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div
        className="absolute left-0 right-0 bottom-0 z-40"
        style={{ backgroundColor: "#b2c10a", paddingBottom: "env(safe-area-inset-bottom)" }}
        role="form"
        aria-label="Nachrichten-Eingabe"
      >
        <div className="mx-auto max-w-[900px] px-3 py-2 flex flex-col gap-2">
          {effectiveReadOnly ? (
            <div className="rounded-3xl bg-[#b2c10a] text-white px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-lg">
              <div className="text-sm md:text-base leading-snug text-center md:text-left">
                {isTaskCompleted 
                  ? "Diese Aufgabe ist bereits abgeschlossen. Du kannst den Chatverlauf lesen, aber keine neuen Nachrichten senden."
                  : "Dieser Chat gehört zu einer abgeschlossenen Aufgabe. Du kannst ihn lesen, aber keine neuen Nachrichten senden."}
              </div>
              <button
                type="button"
                onClick={startNewChat}
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white text-[#5a6505] font-semibold shadow-sm hover:shadow transition"
              >
                Neuen Chat starten
              </button>
            </div>
          ) : (
            <>
              {/* Top row: Input and action buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-10 h-10 grid place-items-center rounded-full bg-white/30 hidden md:grid"
                  aria-label="Kamera öffnen"
                  type="button"
                  disabled={sending || uploading}
                >
                  <img src={cameraIcon} alt="" className="w-6 h-6" />
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-10 h-10 grid place-items-center rounded-full bg-white/30 hidden md:grid"
                  aria-label="Galerie öffnen"
                  type="button"
                  disabled={sending || uploading}
                >
                  <img src={galleryIcon} alt="" className="w-6 h-6" />
                </button>
                
                {/* Microphone button - mandatory for voice input (especially grade 1-2) */}
                <button
                  onClick={handleMicClick}
                  className={`w-10 h-10 grid place-items-center rounded-full transition-all ${
                    isRecording 
                      ? "bg-red-500 animate-pulse" 
                      : "bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={isRecording ? "Aufnahme beenden" : "Spracheingabe starten"}
                  type="button"
                  disabled={sending || uploading}
                  title={isRecording ? "Aufnahme beenden" : "Spracheingabe (für Klasse 1-2 besonders wichtig)"}
                >
                  <img 
                    src={micIcon} 
                    alt="" 
                    className={`w-6 h-6 ${isRecording ? "brightness-0 invert" : ""}`}
                  />
                </button>

                <div className="flex-1 h-10 flex items-center px-3 bg-white rounded-full">
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing &&
                        !sendingRef.current &&
                        !sending &&
                        draft.trim()
                      ) {
                        e.preventDefault();
                        sendText();
                      }
                    }}
                    placeholder="Frag etwas zur Aufgabe oder lade ein Bild über die Kamera/Galerie hoch…"
                    className="w-full bg-transparent outline-none text-[15px]"
                    aria-label="Nachricht eingeben"
                    disabled={sending || uploading}
                  />
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draft.trim()) {
                      sendText();
                    } else {
                      startNewChat();
                    }
                  }}
                  className={`w-10 h-10 grid place-items-center rounded-full transition-colors shadow-sm ${
                    sending || uploading ? "opacity-70" : "hover:brightness-95"
                  }`}
                  style={{ backgroundColor: "#ff7a00" }}
                  aria-label={sending ? "Wird gesendet..." : draft.trim() ? "Nachricht senden" : "Neuen Chat starten"}
                  type="button"
                  disabled={sending || uploading}
                >
                  {draft.trim() ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="#ffffff">
                      <path d="M21.44 2.56a1 1 0 0 0-1.05-.22L3.6 9.06a1 1 0 0 0 .04 1.87l6.9 2.28 2.3 6.91a1 1 0 0 0 1.86.03l6.74-16.78a1 1 0 0 0-.99-1.81ZM11.8 13.18l-4.18-1.38 9.68-4.04-5.5 5.42Z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="#ffffff">
                      <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
                    </svg>
                  )}
                </button>

                {dockState?.mode === "homework" && (
                  <>
                    <button
                      onClick={() => setShowRescanModal(true)}
                      className="w-11 h-11 grid place-items-center rounded-full"
                      style={{ backgroundColor: "#8fd85d" }}
                      aria-label="Aufgabe abschließen"
                      type="button"
                      disabled={sending || uploading}
                    >
                      <CheckOutlined style={{ color: "#fff", fontSize: 16 }} />
                    </button>
                    
                    {/* Complete Task Confirmation Modal */}
                    <Modal
                      open={showRescanModal}
                      onCancel={() => setShowRescanModal(false)}
                      footer={null}
                      centered
                      className="rescan-modal"
                      width="90%"
                      style={{ maxWidth: 500 }}
                    >
                      <div className="py-6 px-2">
                        <div className="text-center mb-6">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                            <CheckOutlined style={{ color: "#8fd85d", fontSize: 32 }} />
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mb-2">
                            Aufgabe abschließen
                          </h3>
                        </div>
                        
                        <div className="bg-green-50 rounded-xl border-2 border-green-200 p-5 mb-6">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-green-200 flex items-center justify-center">
                              <img 
                                src={buddyMascot} 
                                alt="Kibundo" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {`Hallo! 🎉

Du bist dabei, deine Aufgabe abzuschließen. 

Nach der Bestätigung wirst du zur Rückmeldung weitergeleitet, wo du dein fertiges Arbeitsblatt hochladen kannst.`}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <button
                            onClick={async () => {
                              setShowRescanModal(false);
                              
                              const task = dockState?.task;
                              const currentTaskId = task?.id ?? null;
                              const scanId = task?.scanId;
                              const timestamp = new Date().toISOString();
                              
                              // Mark task as complete in localStorage
                              if (currentTaskId) {
                                try {
                                  const effectiveStudentId = task?.userId || studentId || "anon";
                                  const tasksKeyUser = `${TASKS_KEY}::u:${effectiveStudentId}`;
                                  const PROGRESS_KEY_USER = `kibundo.homework.progress.v1::u:${effectiveStudentId}`;
                                  
                                  // Update task in storage
                                  const loadTasks = () => {
                                    try {
                                      return JSON.parse(localStorage.getItem(tasksKeyUser) || "[]");
                                    } catch {
                                      return [];
                                    }
                                  };
                                  const saveTasks = (arr) => {
                                    try {
                                      localStorage.setItem(tasksKeyUser, JSON.stringify(arr));
                                      return true;
                                    } catch {
                                      return false;
                                    }
                                  };
                                  
                                  const tasks = loadTasks();
                                  const idx = tasks.findIndex((t) => t?.id === currentTaskId);
                                  const baseTask = idx >= 0 ? tasks[idx] : task;
                                  
                                  const updatedTask = {
                                    ...baseTask,
                                    done: true,
                                    completedAt: timestamp,
                                    // Preserve existing completionPhotoUrl if it exists
                                    completionPhotoUrl: baseTask?.completionPhotoUrl || task?.completionPhotoUrl || null,
                                  };
                                  
                                  const next = [...tasks];
                                  if (idx >= 0) {
                                    next[idx] = updatedTask;
                                  } else {
                                    next.unshift(updatedTask);
                                  }
                                  saveTasks(next);
                                  
                                  // Update progress to step 3 (feedback)
                                  try {
                                    localStorage.setItem(
                                      PROGRESS_KEY_USER,
                                      JSON.stringify({
                                        step: 3,
                                        taskId: currentTaskId,
                                        task: updatedTask,
                                        completedAt: timestamp,
                                        done: true,
                                      })
                                    );
                                  } catch {}
                                  
                                  // Dispatch event to update homework list
                                  try {
                                    window.dispatchEvent(new Event("kibundo:tasks-updated"));
                                  } catch {}
                                  
                                  // Sync to server if there's a scanId
                                  if (scanId) {
                                    try {
                                      await api.put(`/homeworkscans/${scanId}/completion`, {
                                        completedAt: timestamp,
                                        completionPhotoUrl: updatedTask?.completionPhotoUrl || null,
                                      }, {
                                        meta: { toast5xx: false },
                                      });
                                    } catch (serverError) {
                                      if (import.meta.env.DEV) {
                                        console.error("Error syncing completion to server:", serverError);
                                      }
                                    }
                                  }
                                } catch (error) {
                                  if (import.meta.env.DEV) {
                                    console.error("Error marking task as complete:", error);
                                  }
                                }
                              }
                              
                              // Close the homework chat - call both onClose and closeChat to ensure it closes
                              if (onClose) {
                                onClose();
                              }
                              if (closeChat) {
                                closeChat();
                              }
                              
                              // Small delay to ensure chat closes before navigation
                              setTimeout(() => {
                                // Navigate to feedback page with taskId
                                if (currentTaskId) {
                                  navigate("/student/homework/feedback", { 
                                    state: { taskId: currentTaskId } 
                                  });
                                } else {
                                  navigate("/student/homework/feedback");
                                }
                              }, 100);
                            }}
                            className="w-full py-3 px-4 rounded-xl bg-[#8fd85d] text-white font-semibold text-base hover:bg-[#7fc84d] transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckOutlined style={{ fontSize: 18 }} />
                            Ja, Aufgabe abschließen
                          </button>
                          
                          <button
                            onClick={() => setShowRescanModal(false)}
                            className="w-full py-2 px-4 rounded-xl text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    </Modal>
                  </>
                )}
              </div>

              {/* Bottom row: Scan buttons (mobile only) */}
              <div className="flex items-center justify-center gap-3 md:hidden">
                {/* Microphone button - mandatory for voice input (especially grade 1-2) */}
                <button
                  onClick={handleMicClick}
                  className={`w-12 h-12 grid place-items-center rounded-full transition-all ${
                    isRecording 
                      ? "bg-red-500 animate-pulse" 
                      : "bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={isRecording ? "Aufnahme beenden" : "Spracheingabe starten"}
                  type="button"
                  disabled={sending || uploading}
                  title={isRecording ? "Aufnahme beenden" : "Spracheingabe (für Klasse 1-2 besonders wichtig)"}
                >
                  <img 
                    src={micIcon} 
                    alt="" 
                    className={`w-7 h-7 ${isRecording ? "brightness-0 invert" : ""}`}
                  />
                </button>
                
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-12 h-12 grid place-items-center rounded-full bg-white/30"
                  aria-label="Kamera öffnen"
                  type="button"
                  disabled={sending || uploading}
                >
                  <img src={cameraIcon} alt="" className="w-7 h-7" />
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-12 h-12 grid place-items-center rounded-full bg-white/30"
                  aria-label="Galerie öffnen"
                  type="button"
                  disabled={sending || uploading}
                >
                  <img src={galleryIcon} alt="" className="w-7 h-7" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
