import React, { useEffect, useState } from "react";
import EntityList from "@/components/EntityList.jsx";
import { columnFactories as F } from "@/components/entityList/columnFactories.jsx";
import api from "@/api/axios";

export default function TeachersList() {
  const [stateMap, setStateMap] = useState({}); // { id -> name }

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
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const mapStateVal = (val) => {
    if (val == null) return "-";
    const key = String(val);
    return stateMap[key] || key;
  };

  return (
    <EntityList
      cfg={{
        entityKey: "teachers",
        titlePlural: "Teachers",
        titleSingular: "Teacher",
        routeBase: "/admin/teachers",
        idField: "id",
        api: {
          listPath: "/allteachers",
          updateStatusPath: (id) => `/teachers/${id}/status`,
          removePath: (id) => `/teachers/${id}`,
          parseList: (data) => {
            const src = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            const fb = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : String(v).trim());

            return src.map((t) => {
              const u = t.user || {};
              const fullName = u.name || [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || t.name;
              const grade = t.class?.class_name || t.department || "-"; // prefer joined class label
              const state = mapStateVal(u.state || t.state || t.bundesland);

              return {
                id: t.id,
                name: fb(fullName),
                email: fb(u.email || t.email),
                phone: fb(u.contact_number || u.phone || t.phone),
                grade: fb(grade),
                state: fb(state),
                status: fb(u.status || t.status),
                created_at: t.created_at || u.created_at || null,
              };
            });
          },
        },
        statusFilter: true,
        billingFilter: false,
        columnsMap: (navigate) => ({
          status: F.status("status"),
          id: F.idLink("ID", "/admin/teachers", "id", navigate),
          name: F.text("Full name", "name"),
          grade: F.text("Class", "grade"),
          state: F.text("State", "state"),
          email: F.email("email"),
          phone: F.text("Phone number", "phone"),
          created_at: F.date("Date added", "created_at"),
        }),
        defaultVisible: ["status", "id", "name", "grade", "state", "email", "phone", "created_at"],
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
