// src/pages/student/homework/HomeworkList.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChatStripSpacer } from "@/components/student/mobile/FooterChat.jsx";
import {
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useChatDock } from "@/context/ChatDockContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import api from "@/api/axios";
import HomeworkCard from "@/components/homework/HomeworkCard.jsx";

// ───────────────────────────────────────────────────────────────────────────────
// Base (unscoped) localStorage keys — will be scoped per-student below
const TASKS_KEY = "kibundo.homework.tasks.v1";
const PROGRESS_KEY = "kibundo.homework.progress.v1";

// Subject visual meta
const SUBJECTS = {
  Mathe: { color: "#bfe3ff", icon: "🔢" },
  Deutsch: { color: "#e6f6c9", icon: "📗" },
  Sonstiges: { color: "#ffe2e0", icon: "🧩" },
};

// Transform API homework scan data to task format
function transformHomeworkScanToTask(scan) {
  // Derive "what" (task type) from raw_text
  const deriveWhat = (text) => {
    if (!text) return 'Foto-Aufgabe';
    const questionMatch = text.match(/\d+\s*Frage/i);
    if (questionMatch) return questionMatch[0];
    if (text.length > 50) return 'Hausaufgabe';
    return 'Foto-Aufgabe';
  };
  
  return {
    id: `scan_${scan.id}`,
    scanId: scan.id,
    createdAt: scan.created_at,
    updatedAt: scan.created_at,
    subject: scan.detected_subject || 'Sonstiges',
    what: deriveWhat(scan.raw_text),
    description: scan.raw_text ? scan.raw_text.slice(0, 120).trim() + (scan.raw_text.length > 120 ? '...' : '') : (scan.notes || '—'),
    due: null,
    done: Boolean(scan.completed_at),
    completedAt: scan.completed_at || null,
    completionPhotoUrl: scan.completion_photo_url || null,
    grade: scan.grade || null,
    source: 'image',
    hasImage: !!scan.file_url,
    fileName: null,
    fileType: null,
    fileSize: null,
    conversationId: null,
    userId: scan.student_id,
  };
}

// Load tasks from one or more keys and merge (sorted newest first)
function loadTasksFromKeys(keys = []) {
  const out = [];
  const seen = new Set();
  for (const k of keys) {
    try {
      const arr = JSON.parse(localStorage.getItem(k) || "[]");
      if (Array.isArray(arr)) {
        for (const t of arr) {
          const id = t?.id || `${t?.what || ""}|${t?.createdAt || ""}`;
          if (seen.has(id)) continue;
          seen.add(id);
          const normalized = { ...t };
          if (
            normalized.completionPhotoDataUrl &&
            !normalized.completionPhotoUrl
          ) {
            normalized.completionPhotoUrl = normalized.completionPhotoDataUrl;
            delete normalized.completionPhotoDataUrl;
          }
          out.push(normalized);
        }
      }
    } catch {}
  }
  return out.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

// Nice date (Gescannt am)
function formatScanDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

// Derive subject from any available text (analysis/what/description)
function deriveSubjectFromText(text = "") {
  const t = (text || "").toLowerCase();

  // math-ish
  if (
    /mathe|rechnung|addieren|subtrahieren|multiplizieren|division|dividieren|bruch|geometrie|gleichung|reihe|arbeitsblatt|aufgaben|worksheet|task|numbers?|times? table|multiply|divide/.test(
      t
    )
  ) {
    return "Mathe";
  }

  // german/reading/writing-ish
  if (
    /deutsch|lesen|vorlesen|buch|text|aufsatz|schreiben|diktat|grammatik|rechtschreibung|vokabeln|erzählen|bericht/.test(
      t
    )
  ) {
    return "Deutsch";
  }

  return "Sonstiges";
}



export default function HomeworkList() {
  const navigate = useNavigate();
  const { openChat, expandChat, getChatMessages, closeChat } = useChatDock(); // ⬅️ we read analysis from chat
  const { user: authUser, account } = useAuthContext();

  // 🔥 Get the effective student context (handles parent viewing child)
  // When parent views child: account.id = student_id, account.userId = user_id
  // When student logs in directly: authUser.id = user_id, need to fetch student_id
  
  // If parent has selected a child account, account.id is the student_id
  const directStudentId = account?.type === "child" ? account.id : null;
  
  // Get the user_id to fetch student_id if needed
  const effectiveUserId = account?.type === "child" && account?.userId 
    ? account.userId 
    : (authUser?.id ?? "anon");
  
  // State to store the fetched student_id (when student logs in directly)
  const [fetchedStudentId, setFetchedStudentId] = useState(null);
  
  // Final student_id to use - prefer direct from account, otherwise use fetched
  const studentId = directStudentId ?? fetchedStudentId;

  // Build SCOPED storage keys per student (use studentId if available, otherwise effectiveUserId)
  const storageKey = studentId ?? effectiveUserId;
  const TASKS_KEY_USER = `${TASKS_KEY}::u:${storageKey}`;
  const PROGRESS_KEY_USER = `${PROGRESS_KEY}::u:${storageKey}`;

  // Candidate keys: scoped, legacy unscoped, anon-scoped
  const FALLBACK_KEYS = useMemo(
    () => [TASKS_KEY_USER, TASKS_KEY, `${TASKS_KEY}::u:anon`],
    [TASKS_KEY_USER]
  );

  // Maintain tasks in state - will merge localStorage + API data
  const [localStorageTasks, setLocalStorageTasks] = useState(() => loadTasksFromKeys(FALLBACK_KEYS));
  const [apiTasks, setApiTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const persistTasksToStorage = useCallback(
    (tasksToPersist) => {
      try {
        localStorage.setItem(TASKS_KEY_USER, JSON.stringify(tasksToPersist));
      } catch {}
      try {
        setTimeout(() => {
          try {
            window.dispatchEvent(new Event("kibundo:tasks-updated"));
          } catch {}
        }, 0);
      } catch {}
    },
    [TASKS_KEY_USER]
  );
  
  // Cache to remember if endpoint is not implemented (501) - use sessionStorage to persist across remounts
  const ENDPOINT_CACHE_KEY = 'homeworkscans_endpoint_status';
  const fetchingRef = useRef(false); // Prevent concurrent requests
  
  // Check if endpoint is not implemented (persisted in sessionStorage)
  const isEndpointNotImplemented = () => {
    try {
      return sessionStorage.getItem(ENDPOINT_CACHE_KEY) === '501';
    } catch {
      return false;
    }
  };
  
  // Set endpoint status in sessionStorage
  const setEndpointNotImplemented = (value) => {
    try {
      if (value) {
        sessionStorage.setItem(ENDPOINT_CACHE_KEY, '501');
      } else {
        sessionStorage.removeItem(ENDPOINT_CACHE_KEY);
      }
    } catch {}
  };

  // State to store student information map (student_id -> student data)
  const [studentsMap, setStudentsMap] = useState({});

  // Fetch student information for all unique student_ids in tasks
  const fetchStudentInfo = useCallback(async () => {
    const studentIds = new Set();
    
    // Collect all unique student_ids from tasks
    [...localStorageTasks, ...apiTasks].forEach(task => {
      const sid = task?.userId || task?.student_id;
      if (sid) studentIds.add(Number(sid));
    });

    if (studentIds.size === 0) return;

    try {
      const studentsRes = await api.get("/allstudents");
      const allStudents = Array.isArray(studentsRes.data) 
        ? studentsRes.data 
        : (studentsRes.data?.data || []);
      
      const map = {};
      allStudents.forEach(student => {
        if (studentIds.has(student.id)) {
          const studentUser = student.user || {};
          map[student.id] = {
            id: student.id,
            name: studentUser.first_name && studentUser.last_name
              ? `${studentUser.first_name} ${studentUser.last_name}`.trim()
              : studentUser.first_name || studentUser.last_name || `Student #${student.id}`,
            number: student.id, // Student number is the student_id
          };
        }
      });
      
      setStudentsMap(map);
    } catch (error) {
      console.error("Failed to fetch student info:", error);
    }
  }, [localStorageTasks, apiTasks]);

  // Fetch student info when tasks change
  useEffect(() => {
    fetchStudentInfo();
  }, [fetchStudentInfo]);

  // Merge and deduplicate tasks from both sources
  const tasks = useMemo(() => {
    const merged = [];
    const seen = new Set();

    // 🔥 Filter localStorage tasks by student_id to only show current student's homework
    const filteredLocalTasks = localStorageTasks.filter((task) => {
      // If task has userId, it must match current studentId or storageKey
      if (task?.userId) {
        return task.userId === studentId || task.userId === storageKey || task.userId === String(studentId) || task.userId === String(storageKey);
      }
      // If no userId, include it (legacy tasks - will be filtered out if they don't match API data)
      return true;
    });

    // Add local tasks first so student updates (done/photo) override API snapshots
    for (const task of filteredLocalTasks) {
      const key = task?.scanId ? `scan_${task.scanId}` : task?.id;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(task);
    }

    // Add API tasks if they are not already represented locally
    // API tasks are already filtered by student_id from the backend
    for (const task of apiTasks) {
      const key = task?.scanId ? `scan_${task.scanId}` : task?.id;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(task);
    }

    return merged.sort(
      (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
    );
  }, [apiTasks, localStorageTasks, studentId, storageKey]);

  // Fetch student_id from user_id (only if not already available from account)
  const fetchStudentId = useCallback(async () => {
    if (effectiveUserId === "anon" || directStudentId) return; // Skip if already have student_id or not authenticated
    
    try {
      const { data } = await api.get('/student-id', {
        params: { user_id: effectiveUserId },
        withCredentials: true,
        validateStatus: (status) => status < 500,
      });
      
      if (data?.student_id) {
        setFetchedStudentId(data.student_id);
      }
    } catch (error) {
      // Failed to fetch student_id - silently continue
    }
  }, [effectiveUserId, directStudentId]);

  // Fetch homework scans from API
  const fetchHomeworkScans = useCallback(async () => {
    if (effectiveUserId === "anon" || !studentId) {
      return; // Skip if not authenticated or student_id not loaded
    }
    
    // Skip request if we already know endpoint is not implemented (persisted in sessionStorage)
    if (isEndpointNotImplemented()) {
      return;
    }
    
    // Prevent concurrent requests
    if (fetchingRef.current) {
      return;
    }
    
    fetchingRef.current = true;
    
    try {
      setLoading(true);
      const { data, status } = await api.get('/homeworkscans', {
        params: { student_id: studentId }, // 🔥 Use student_id
        withCredentials: true, // Include auth headers
        validateStatus: (status) => status < 600, // Accept all status codes (including 501)
      });
      
      // Check if endpoint is not implemented (501)
      if (status === 501 || !data) {
        // Endpoint not implemented yet - cache this in sessionStorage and skip future requests
        setEndpointNotImplemented(true);
        setApiTasks([]);
        return;
      }
      
      // Endpoint works - reset the flag in case it was set before
      setEndpointNotImplemented(false);
      
      const transformedTasks = Array.isArray(data) 
        ? data.map(transformHomeworkScanToTask)
        : [];
      
      setApiTasks(transformedTasks);
    } catch (error) {
      // Check if it's a 501 error
      if (error?.response?.status === 501) {
        // Cache that endpoint is not implemented in sessionStorage
        setEndpointNotImplemented(true);
      }
      setApiTasks([]); // Set empty array on error
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [studentId]);

  // Refresh localStorage tasks
  const refreshLocalTasks = useCallback(() => {
    setLocalStorageTasks(loadTasksFromKeys(FALLBACK_KEYS));
  }, [FALLBACK_KEYS]);

  // Close any open chat when navigating to the list page
  useEffect(() => {
    closeChat?.();
  }, [closeChat]);

  // Fetch student_id on mount and when userId changes
  useEffect(() => {
    fetchStudentId();
  }, [fetchStudentId]);

  // Fetch homework scans when studentId is available
  useEffect(() => {
    if (studentId) {
      fetchHomeworkScans();
    }
  }, [studentId, fetchHomeworkScans]);

  // Refresh when window regains focus (user returns from another screen)
  useEffect(() => {
    const onFocus = () => {
      refreshLocalTasks();
      fetchHomeworkScans();
    };
    
    window.addEventListener('focus', onFocus);
    
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshLocalTasks, fetchHomeworkScans]);

  useEffect(() => {
    // Update on storage changes (e.g., when HomeworkDoing saves)
    const onStorage = (e) => {
      if (!e?.key) return;
      if (FALLBACK_KEYS.includes(e.key)) {
        refreshLocalTasks();
        fetchHomeworkScans(); // Also refresh API data
      }
    };
    window.addEventListener("storage", onStorage);

    // Listen for custom task update events (fired from HomeworkDoing in same tab)
    const onTaskUpdate = () => {
      refreshLocalTasks();
      fetchHomeworkScans();
    };
    window.addEventListener("kibundo:tasks-updated", onTaskUpdate);

    // Also refresh when user returns to tab
    const onVis = () => {
      if (document.visibilityState === "visible") {
        refreshLocalTasks();
        fetchHomeworkScans();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("kibundo:tasks-updated", onTaskUpdate);
    };
  }, [FALLBACK_KEYS, refreshLocalTasks, fetchHomeworkScans]);

  // Enrich tasks with derived subject/description from latest analysis (if needed)
  const enhancedRows = useMemo(() => {
    return tasks.map((t) => {
      const chatKey = `${t.id}::u:${storageKey}`;
      const msgs = getChatMessages?.("homework", chatKey) || [];

      // Find latest analysis table (agent message with content.extractedText/qa)
      const latestTable = [...msgs]
        .reverse()
        .find((m) => m?.type === "table" && m?.from !== "student");

      let analysisText = "";
      if (latestTable) {
        const extracted = latestTable?.content?.extractedText || "";
        const qa = Array.isArray(latestTable?.content?.qa)
          ? latestTable.content.qa
          : [];
        const qaStr =
          qa
            .slice(0, 3)
            .map((q) => [q?.text, q?.answer].filter(Boolean).join(": "))
            .join(" • ") || "";
        analysisText = [extracted, qaStr].filter(Boolean).join(" • ");
      }

      // If subject missing or generic, derive from analysis/what/description
      const baseText = [t.what, t.description, analysisText].filter(Boolean).join(" ");
      const derivedSubject =
        !t.subject || t.subject === "Sonstiges"
          ? deriveSubjectFromText(baseText)
          : t.subject;

      // If description is empty, take a short snippet from analysis
      const derivedDescription =
        t.description && t.description.trim().length > 0
          ? t.description
          : analysisText
          ? analysisText.slice(0, 120)
          : "";

      // Get student information for this task
      const taskStudentId = t?.userId || t?.student_id;
      const studentInfo = taskStudentId ? studentsMap[Number(taskStudentId)] : null;

      return {
        ...t,
        subject: derivedSubject,
        description: derivedDescription,
        studentInfo: studentInfo || null, // Add student info to task
      };
    });
  }, [tasks, getChatMessages, storageKey, studentsMap]);

  const pageSize = 7;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(enhancedRows.length / pageSize));

  const rows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return enhancedRows.slice(start, start + pageSize);
  }, [enhancedRows, page]);

  // Clicking a task → open FooterChat with the task context
  const openTask = (task) => {
    if (!task) return;
    
    // 🔥 Check if task is completed - must navigate to feedback page, not open chat
    const isCompleted = Boolean(
      task.done || 
      task.completedAt || 
      task.completed_at ||
      (task.completionPhotoUrl && task.completedAt)
    );
    
    if (isCompleted) {
      try {
        localStorage.setItem(
          PROGRESS_KEY_USER,
          JSON.stringify({ step: 3, taskId: task.id })
        );
      } catch {}
      
      closeChat?.();
      navigate("/student/homework/feedback", {
        state: {
          taskId: task.id,
          task,
          from: "list",
          readOnly: true,
        },
      });
      return;
    }
    
    // Task is not completed - open chat normally
    try {
      localStorage.setItem(
        PROGRESS_KEY_USER,
        JSON.stringify({ step: 1, taskId: task.id })
      );
    } catch {}

    const chatKey = `homework:${task.id}::u:${storageKey}`;

    // 🔥 Open the FooterChat with task context
    // Ensure scanId is preserved if task has it (for scan-based tasks)
    const taskWithContext = { 
      ...task, 
      userId: storageKey,
      // Preserve scanId if it exists (for tasks created from homework scans)
      scanId: task.scanId || (task.id?.startsWith('scan_') ? parseInt(task.id.replace('scan_', ''), 10) : undefined)
    };
    
    openChat?.({
      mode: "homework",
      task: taskWithContext,
      key: chatKey,
      restore: true,
      focus: "last",
      analyzeOnOpen: false,
    });

    // Expand the chat to show it
    expandChat?.(true);
  };

  // Handle edit task
  const handleEditTask = (task) => {
    // Add edit functionality here
  };

  // Handle delete task
  const handleDeleteTask = (task) => {
    // Add delete functionality here
  };

  // Handle mark task as done/undone
  const handleMarkTaskDone = useCallback(
    async (task) => {
      if (!task) return;
      const resolvedKey = task?.scanId ? `scan_${task.scanId}` : task?.id;
      if (!resolvedKey) return;

      const toggledDone = !Boolean(task?.done);
      const timestamp = toggledDone ? new Date().toISOString() : null;

      let updatedTaskRef = null;
      setLocalStorageTasks((prev) => {
        const list = Array.isArray(prev) ? [...prev] : [];
        const idx = list.findIndex((entry) => {
          const entryKey = entry?.scanId ? `scan_${entry.scanId}` : entry?.id;
          return entryKey === resolvedKey;
        });
        const existing = idx >= 0 ? list[idx] : task;
        const updatedTask = {
          ...existing,
          done: toggledDone,
          completedAt: timestamp,
        };
        if (idx >= 0) {
          list[idx] = updatedTask;
        } else {
          list.unshift(updatedTask);
        }
        updatedTaskRef = updatedTask;
        persistTasksToStorage(list);
        return list;
      });

      if (task?.scanId) {
        try {
          await api.put(`/homeworkscans/${task.scanId}/completion`, {
            completedAt: timestamp,
            completionPhotoUrl:
              updatedTaskRef?.completionPhotoUrl || task?.completionPhotoUrl || null,
          });
        } catch (error) {
          // Error updating completion status - silently fail
        }
      }
    },
    [persistTasksToStorage]
  );

  return (
    <>
      <section className="w-full">
       

        {/* Cards Grid */}
        {rows.length ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {/* Add New Scan Button - First card in grid */}
            <button
              onClick={() => navigate("/student/homework/doing")}
              className="min-h-[200px] rounded-xl border-2 border-dashed border-[#2b6a5b] bg-white hover:bg-[#f0f7f5] transition-all duration-200 flex flex-col items-center justify-center gap-3 p-6 group hover:border-[#1f4f43] hover:shadow-lg"
              aria-label="Neue Aufgabe scannen"
            >
              <div className="w-16 h-16 rounded-full bg-[#2b6a5b] flex items-center justify-center group-hover:bg-[#1f4f43] transition-colors">
                <PlusOutlined className="text-3xl text-white" />
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-[#2b6a5b] group-hover:text-[#1f4f43]">
                  Neue Aufgabe
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Scannen oder hinzufügen
                </div>
              </div>
            </button>

            {rows.map((r) => (
              <HomeworkCard
                key={r.id || `${r.subject}-${r.what}`}
                {...r}
                studentInfo={r.studentInfo}
                onOpen={() => openTask(r)}
                onEdit={() => handleEditTask(r)}
                onDelete={() => handleDeleteTask(r)}
                onMarkDone={() => handleMarkTaskDone(r)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 max-w-md mx-auto">
              <div className="text-[#51625e] mb-6">
                <div className="text-6xl mb-4">📚</div>
                <div className="text-xl font-semibold mb-2">Noch keine Aufgaben</div>
                <div className="text-sm text-gray-500">Noch keine Aufgaben gescannt oder hinzugefügt.</div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/student/homework/doing")}
                className="px-8 py-4 rounded-full bg-[#2b6a5b] text-white hover:bg-[#1f4d3f] transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <PlusOutlined className="mr-2" />
                Erste Aufgabe hinzufügen
              </button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-4 shadow-sm">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#e7ecea] text-[#51625e] hover:bg-[#d4ddd9] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <LeftOutlined /> <span>Zurück</span>
            </button>

            <div className="text-sm text-[#51625e] font-medium">
              Seite <strong className="text-[#2b6a5b] text-lg">{Math.min(page, pageCount)}</strong> von {pageCount}
            </div>

            <button
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#e7ecea] text-[#51625e] hover:bg-[#d4ddd9] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              <span>Weiter</span> <RightOutlined />
            </button>
          </div>
        )}

      </section>

      <ChatStripSpacer />
    </>
  );
}
