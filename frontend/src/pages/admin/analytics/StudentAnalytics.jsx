// src/pages/admin/analytics/StudentAnalytics.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Typography,
  DatePicker,
  Select,
  Table,
  Tag,
  Button,
  Space,
  Empty,
  Statistic,
  message,
} from "antd";
import dayjs from "dayjs";
import api from "@/api/axios";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const TRACK_KEY = "kibundo_track_v1";
const ONE_DAY = 24 * 60 * 60 * 1000;

/* ---------------- helpers ---------------- */
function startOfDayMs(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}
function inRange(ts, fromMs, toMs) {
  return ts >= fromMs && ts < toMs + ONE_DAY;
}
function mmss(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function hColonM(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
function loadEvents() {
  try {
    const raw = localStorage.getItem(TRACK_KEY);
    const store = raw ? JSON.parse(raw) : null;
    const events = Array.isArray(store) ? store : Array.isArray(store?.events) ? store.events : [];
    return events
      .map((e) => ({
        ts: Number(e.ts || Date.now()),
        taskId: String(e.taskId || e.id || "unknown"),
        status: String(e.status || e.type || ""),
        ms: Number(e.ms || 0),
        subject: e.meta?.subject ?? e.subject ?? null, // may be id or name
        topic: e.meta?.topic ?? e.topic ?? null,
        grade: e.meta?.grade ?? e.grade ?? null,
        studentId: e.meta?.studentId ?? e.studentId ?? "me", // may be id/email/name
      }))
      .filter((e) => isFinite(e.ts) && e.taskId);
  } catch {
    return [];
  }
}

/* ---------------- analytics ---------------- */
function computeAnalytics(events, { fromMs, toMs, studentMatch, subjectMatch }) {
  const filtered = events.filter(
    (e) => inRange(e.ts, fromMs, toMs) && (!studentMatch || studentMatch(e)) && (!subjectMatch || subjectMatch(e))
  );

  const byTask = new Map();
  for (const e of filtered) {
    if (!byTask.has(e.taskId)) byTask.set(e.taskId, []);
    byTask.get(e.taskId).push(e);
  }

  const rows = [];
  let totalFocusMs = 0;
  let longestSessionMs = 0;
  let interruptionsTotal = 0;

  // daily sum: use max terminal ms per (task, day)
  const byTaskDayMax = new Map(); // `${taskId}:${dayMs}` -> maxMs

  for (const [taskId, list] of byTask.entries()) {
    list.sort((a, b) => a.ts - b.ts);
    const first = list[0];
    const last = list[list.length - 1];

    const finalMs = list.reduce((m, e) => Math.max(m, e.ms || 0), 0);
    totalFocusMs += finalMs;

    const pauses = list.filter((e) => e.status === "paused").length;
    interruptionsTotal += pauses;

    let currentStart = null;
    for (const e of list) {
      if (e.status === "resumed" || e.status === "started") currentStart = e.ts;
      else if (currentStart && (e.status === "paused" || e.status === "completed" || e.status === "abandon")) {
        longestSessionMs = Math.max(longestSessionMs, e.ts - currentStart);
        currentStart = null;
      }
    }

    for (const e of list) {
      if (!["completed", "abandon"].includes(e.status)) continue;
      const dayKey = `${taskId}:${startOfDayMs(e.ts)}`;
      const prev = byTaskDayMax.get(dayKey) || 0;
      byTaskDayMax.set(dayKey, Math.max(prev, e.ms || 0));
    }

    rows.push({
      key: taskId,
      taskId,
      subject: first.subject || "-",
      topic: first.topic || "-",
      grade: first.grade || "-",
      studentId: first.studentId || "-",
      startedAt: new Date(first.ts),
      lastAt: new Date(last.ts),
      status: last.status,
      durationMs: finalMs,
      interruptions: pauses,
    });
  }

  const byDay = new Map();
  for (const [key, ms] of byTaskDayMax.entries()) {
    const dayMs = Number(key.split(":")[1]);
    byDay.set(dayMs, (byDay.get(dayMs) || 0) + (ms || 0));
  }
  for (let d = startOfDayMs(fromMs); d <= startOfDayMs(toMs); d += ONE_DAY) {
    if (!byDay.has(d)) byDay.set(d, 0);
  }
  const daily = Array.from(byDay.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, ms]) => ({ day, ms }));

  const avgPerTaskMs = rows.length ? Math.round(totalFocusMs / rows.length) : 0;
  const avgInterruptions = rows.length ? Number((interruptionsTotal / rows.length).toFixed(2)) : 0;

  return { rows, totalFocusMs, longestSessionMs, avgPerTaskMs, avgInterruptions, daily };
}

/* ---------------- tiny sparkline ---------------- */
function Sparkline({ data }) {
  if (!data?.length) return null;
  const w = 220, h = 36, pad = 2;
  const max = Math.max(...data.map((d) => d.ms), 1);
  const stepX = (w - pad * 2) / Math.max(1, data.length - 1);
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - d.ms / max);
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="opacity-80">
      <polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/* ---------------- csv ---------------- */
function exportCSV(rows) {
  if (!rows?.length) return message.info("Nothing to export.");
  const heads = [
    "Task ID",
    "Student",
    "Subject",
    "Topic",
    "Grade",
    "Status",
    "Duration (ms)",
    "Duration (mm:ss)",
    "Interruptions",
    "Started At",
    "Last Update",
  ];
  const lines = [heads.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.taskId,
        r.studentId,
        r.subject,
        r.topic,
        r.grade,
        r.status,
        r.durationMs,
        mmss(r.durationMs),
        r.interruptions,
        r.startedAt.toISOString(),
        r.lastAt.toISOString(),
      ]
        .map((x) => `"${String(x).replace(/"/g, '""')}"`)
        .join(",")
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kibundo-student-analytics.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- page ---------------- */
export default function StudentAnalytics() {
  // past 14 days
  const [range, setRange] = useState([dayjs().subtract(13, "day"), dayjs()]);
  const [events, setEvents] = useState([]);

  // selected filters (store both value and option for smarter matching)
  const [studentValue, setStudentValue] = useState();
  const [studentOption, setStudentOption] = useState(null);
  const [subjectValue, setSubjectValue] = useState();
  const [subjectOption, setSubjectOption] = useState(null);

  // options from API
  const [studentOptions, setStudentOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);

  // maps for pretty display (subject id->name, and student key->name)
  const subjectNameByKey = useMemo(() => {
    const m = new Map();
    for (const o of subjectOptions) {
      const name = o?.label ?? "";
      const id = o?.meta?.id;
      const code = o?.meta?.code;
      if (id) m.set(String(id), name);
      if (code) m.set(String(code), name);
      if (name) m.set(String(name), name);
    }
    return m;
  }, [subjectOptions]);

  const studentNameByKeys = useMemo(() => {
    const m = new Map();
    for (const o of studentOptions) {
      const full = o?.meta?.fullName || o?.label || "";
      const keys = o?.meta?.keys || [];
      keys.forEach((k) => m.set(String(k), full));
    }
    return m;
  }, [studentOptions]);

  /* ---- load local timing events ---- */
  useEffect(() => {
    setEvents(loadEvents());
    const onStorage = (e) => e.key === TRACK_KEY && setEvents(loadEvents());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ---- fetch dropdown options ---- */
  useEffect(() => {
    api
      .get("/allstudents")
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const opts = rows.map((s) => {
          const id = s.id ?? s.student_id ?? s.user_id;
          const first = s.first_name ?? s.firstname ?? s.firstName ?? "";
          const last = s.last_name ?? s.lastname ?? s.lastName ?? "";
          const email = s.email ?? "";
          const fullName = `${first} ${last}`.trim() || s.name || email || String(id ?? "");
          // build search keys: id, student_id, email, first, last, full
          const keys = [
            id,
            s.student_id,
            email,
            first,
            last,
            fullName,
            s.name,
          ]
            .filter(Boolean)
            .map((v) => String(v).toLowerCase());
          return {
            label: fullName,
            value: String(id ?? email ?? fullName), // value can be ID; we’ll match loosely
            search: [...new Set(keys)].join(" "),
            meta: { id, student_id: s.student_id, email, first, last, fullName, keys: new Set(keys) },
          };
        });
        setStudentOptions(opts);
      })
      .catch(() => setStudentOptions([]));

    api
      .get("/allsubjects")
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const opts = rows.map((s) => {
          const id = s.id ?? s.subject_id;
          const code = s.code ?? s.slug;
          const name = s.name ?? s.subject ?? String(id ?? code ?? "");
          const keys = [id, code, name].filter(Boolean).map((v) => String(v).toLowerCase());
          return {
            label: name,               // 👈 show subject NAME
            value: String(id ?? code ?? name),
            search: [...new Set(keys)].join(" "),
            meta: { id, code, name, keys: new Set(keys) },
          };
        });
        setSubjectOptions(opts);
      })
      .catch(() => setSubjectOptions([]));
  }, []);

  /* ---- fallback options derived from events (if API empty) ---- */
  const fallbackStudents = useMemo(() => {
    const ids = new Set(events.map((e) => e.studentId || "me"));
    return Array.from(ids).map((s) => ({
      label: s,
      value: s,
      search: String(s).toLowerCase(),
      meta: { fullName: s, keys: new Set([String(s).toLowerCase()]) },
    }));
  }, [events]);

  const fallbackSubjects = useMemo(() => {
    const ids = new Set(events.map((e) => e.subject).filter(Boolean));
    return Array.from(ids).map((s) => ({
      label: String(subjectNameByKey.get(String(s)) || s), // map to name if we know it
      value: s,
      search: String(s).toLowerCase(),
      meta: { name: String(s), keys: new Set([String(s).toLowerCase()]) },
    }));
  }, [events, subjectNameByKey]);

  /* ---- build matchers for filtering ---- */
  const studentMatch = useMemo(() => {
    if (!studentOption) return null;
    const set = studentOption?.meta?.keys || new Set([String(studentValue || "").toLowerCase()]);
    return (e) => set.has(String(e.studentId).toLowerCase());
  }, [studentOption, studentValue]);

  const subjectMatch = useMemo(() => {
    if (!subjectOption) return null;
    const set = subjectOption?.meta?.keys || new Set([String(subjectValue || "").toLowerCase()]);
    return (e) => set.has(String(e.subject).toLowerCase());
  }, [subjectOption, subjectValue]);

  const { rows, totalFocusMs, longestSessionMs, avgPerTaskMs, avgInterruptions, daily } = useMemo(() => {
    const fromMs = startOfDayMs(range[0].toDate());
    const toMs = startOfDayMs(range[1].toDate());
    return computeAnalytics(events, { fromMs, toMs, studentMatch, subjectMatch });
  }, [events, range, studentMatch, subjectMatch]);

  /* ---- columns (show subject NAME, and student NAME if known) ---- */
  const columns = [
    { title: "Task", dataIndex: "taskId", key: "taskId", render: (v) => <code>{v}</code> },
    {
      title: "Student",
      dataIndex: "studentId",
      key: "studentId",
      render: (v) => {
        const pretty = studentNameByKeys.get(String(v).toLowerCase()) || v;
        return <span>{pretty}</span>;
      },
    },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      render: (v) => {
        const name = subjectNameByKey.get(String(v)) || String(v || "-");
        return name ? <Tag color="blue">{name}</Tag> : "-";
      },
    },
    { title: "Topic", dataIndex: "topic", key: "topic" },
    { title: "Grade", dataIndex: "grade", key: "grade", width: 90 },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s) => {
        const color = s === "completed" ? "green" : s === "paused" ? "gold" : s === "abandon" ? "red" : "default";
        return <Tag color={color}>{s || "-"}</Tag>;
      },
    },
    {
      title: "Duration",
      key: "duration",
      width: 130,
      sorter: (a, b) => a.durationMs - b.durationMs,
      defaultSortOrder: "descend",
      render: (_, r) => <span className="font-mono">{mmss(r.durationMs)}</span>,
    },
    { title: "Interruptions", dataIndex: "interruptions", key: "interruptions", width: 140 },
    { title: "Started", dataIndex: "startedAt", key: "startedAt", width: 180, render: (d) => new Date(d).toLocaleString() },
    { title: "Last update", dataIndex: "lastAt", key: "lastAt", width: 180, render: (d) => new Date(d).toLocaleString() },
  ];

  /* ---- custom filter for Selects: first/last/email/ID (students) and name/code (subjects) ---- */
  const filterOption = (input, option) => {
    const hay = String(option?.search || option?.label || "").toLowerCase();
    return hay.includes(String(input).toLowerCase());
  };

  return (
    <div className="px-3 md:px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <Title level={4} className="!mb-0">Student Analytics</Title>
        <Space wrap>
          <RangePicker
            allowClear={false}
            value={range}
            onChange={(vals) => {
              if (!vals || vals.length !== 2) return;
              setRange(vals);
            }}
          />
          <Select
            allowClear
            showSearch
            placeholder="Search student (first, last, email, ID)"
            value={studentValue}
            onChange={(val, opt) => {
              setStudentValue(val);
              setStudentOption(opt || null);
            }}
            options={studentOptions.length ? studentOptions : fallbackStudents}
            style={{ minWidth: 240 }}
            filterOption={filterOption}
            optionFilterProp="label"
          />
          <Select
            allowClear
            showSearch
            placeholder="Search subject (name/code)"
            value={subjectValue}
            onChange={(val, opt) => {
              setSubjectValue(val);
              setSubjectOption(opt || null);
            }}
            options={subjectOptions.length ? subjectOptions : fallbackSubjects}
            style={{ minWidth: 220 }}
            filterOption={filterOption}
            optionFilterProp="label"
          />
          <Button onClick={() => exportCSV(rows)}>Export CSV</Button>
          <Button onClick={() => setEvents(loadEvents())}>Refresh</Button>
        </Space>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <Card className="rounded-2xl border-0 shadow-sm">
          <Statistic title="Total focus (range)" value={hColonM(totalFocusMs)} />
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm">
          <Statistic title="Avg per task" value={mmss(avgPerTaskMs)} />
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm">
          <Statistic title="Longest session" value={mmss(longestSessionMs)} />
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm">
          <Statistic title="Interruptions / task" value={String(avgInterruptions)} />
        </Card>
      </div>

      {/* Sparkline */}
      <Card className="rounded-2xl border-0 shadow-sm mb-3" bodyStyle={{ padding: 14 }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Text type="secondary">Daily total (consistency)</Text>
          <Text className="text-xs text-neutral-500">{daily.length} days</Text>
        </div>
        <div className="mt-2 text-indigo-600">
          <Sparkline data={daily} />
        </div>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl border-0 shadow-sm">
        {rows.length ? (
          <Table
            size="middle"
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 900 }}
          />
        ) : (
          <Empty description="No events in this range yet." />
        )}
      </Card>
    </div>
  );
}
