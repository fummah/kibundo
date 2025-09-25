// src/pages/students/StudentsList.jsx
import React, { useEffect, useState, useRef } from "react";
import EntityList from "@/components/EntityList.jsx";
import { columnFactories as F } from "@/components/entityList/columnFactories.jsx";
import api from "@/api/axios";

export default function StudentsList() {
  const [stateMap, setStateMap] = useState({}); // { id:number|string -> name }
  const [parentsMap, setParentsMap] = useState({}); // { parent_id -> "First Last" }
  const fetchingParents = useRef(new Set());
  // Keep a stable per-student cache of resolved parent display names to prevent flicker
  const parentNameByStudentRef = useRef({}); // { student_id: string }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/states");
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
        const map = {};
        rows.forEach((s) => {
          const id = s?.id ?? s?.value ?? s;
          const name = s?.state_name ?? s?.label ?? String(s);
          map[String(id)] = name;
        });
        if (mounted) setStateMap(map);
      } catch {
        // ignore – we will fallback to raw values
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/parents");
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
        const map = {};
        rows.forEach((p) => {
          const u = p?.user || {};
          const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
          map[String(p?.id)] = fullName || u.name || u.email || `#${p?.id}`;
        });
        if (mounted) setParentsMap(map);
      } catch {
        // ignore – we will fallback to joined data or lazy fetch per-miss
      }
    })();
    return () => { mounted = false; };
  }, []);

  const mapStateVal = (val) => {
    if (val == null) return "-";
    const key = String(val);
    // If it looks like an ID and we have a mapping, show the name; otherwise show as-is
    return stateMap[key] || key;
  };

  const requestParentName = async (pid) => {
    const key = String(pid);
    if (!pid || fetchingParents.current.has(key) || parentsMap[key]) return;
    fetchingParents.current.add(key);
    try {
      const res = await api.get(`/parent/${pid}`);
      const p = res?.data?.data ?? res?.data ?? {};
      const u = p?.user || {};
      const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
      setParentsMap((prev) => ({ ...prev, [key]: fullName || u.name || u.email || `#${key}` }));
    } catch {
      // keep silent on errors; fallback stays
    } finally {
      fetchingParents.current.delete(key);
    }
  };

  return (
    <EntityList
      cfg={{
        entityKey: "students",
        titlePlural: "Students",
        titleSingular: "Student",
        routeBase: "/admin/students",
        idField: "id",
        api: {
          listPath: "/allstudents",
          updateStatusPath: (id) => `/students/${id}/status`,
          removePath: (id) => `/students/${id}`,
          // Normalize BE → UI (robust to differing shapes)
          parseList: (data) => {
            const src = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            const fallback = (v) => (v === undefined || v === null || String(v).trim() === "") ? "-" : String(v).trim();

            return src.map((student) => {
              const user = student.user || {};
              const parent = student.parent || {};
              const parentUser = parent.user || {};

              const fullName = fallback([user.first_name, user.last_name].filter(Boolean).join(' '));
              const schoolName = fallback(student.school?.name || student.school_name || student.school);

              const grade = fallback(student.class?.class_name || student.class_name || student.grade || user.grade);

              // Subjects as CSV (defensive across shapes)
              const subjectsArray = Array.isArray(student.subjects)
                ? student.subjects
                : (Array.isArray(student.subject)
                    ? student.subject.map((s) => s?.subject?.subject_name || s?.subject_name).filter(Boolean)
                    : []);
              const subjectsText = subjectsArray.length > 0
                ? subjectsArray.map((s) => (typeof s === 'string' ? s : (s?.subject_name || s))).filter(Boolean).join(', ')
                : "-";

              const rawState = user.state || student.state;
              const state = mapStateVal(rawState);

              const joinedParentName = [parentUser.first_name, parentUser.last_name].filter(Boolean).join(" ").trim();
              const pid = student.parent_id ?? parent?.id ?? null;
              const pidKey = pid != null ? String(pid) : "";
              const cached = pidKey ? parentsMap[pidKey] : "";

              // Priority: previously resolved name (per student) > cached map > joined name > fetch placeholder
              let parentDisplay = parentNameByStudentRef.current[student.id] || cached || joinedParentName || "-";
              if (!cached && pidKey) {
                // Kick off async fetch; do not regress display if we already have a name
                requestParentName(pidKey);
              }
              // Store stable name if we have something meaningful
              if (parentDisplay && parentDisplay !== "-") {
                parentNameByStudentRef.current[student.id] = parentDisplay;
              }

              return {
                id: student.id,
                name: fullName,
                email: fallback(user.email),
                grade,
                subjectsText,
                school: schoolName,
                state,
                parent_name: parentDisplay,
                status: fallback(user.status || student.status),
                created_at: user.created_at || student.created_at,
              };
            });
          },
        },
        statusFilter: true,
        billingFilter: false,

        columnsMap: (navigate) => ({
          status: F.status("status"),
          id: F.idLink("ID", "/admin/students", "id", navigate),
          name: F.text("Full name", "name"),
          grade: F.text("Grade", "grade"),
          subjectsText: F.text("Subjects", "subjectsText"),
          parent_name: F.text("Parent", "parent_name"),
          school: F.text("School", "school"),
          state: F.text("State", "state"),
          email: F.text("Email", "email"),
          created_at: F.date("Date added", "created_at"),
        }),

        defaultVisible: [
          "status",
          "id",
          "name",
          "grade",
          "subjectsText",
          "parent_name",
          "school",
          "state",
          "email",
          "created_at",
        ],

        rowClassName: (r) =>
          r.status === "active"
            ? "row-status-active"
            : r.status === "suspended"
            ? "row-status-suspended"
            : r.status === "disabled"
            ? "row-status-disabled"
            : "",
      }}
    />
  );
}
