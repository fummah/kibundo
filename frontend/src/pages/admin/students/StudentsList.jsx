// src/pages/students/StudentsList.jsx
import React from "react";
import EntityList from "@/components/EntityList.jsx";
import { columnFactories as F } from "@/components/entityList/columnFactories.jsx";

export default function StudentsList() {
  return (
    <EntityList
      cfg={{
        entityKey: "students",
        titlePlural: "Students",
        titleSingular: "Student",
        routeBase: "/admin/students",
        idField: "id",
        api: {
          listPath: "/allstudents", // The backend now provides all necessary data
          updateStatusPath: (id) => `/students/${id}/status`,
          removePath: (id) => `/students/${id}`,
          parseList: (data) => {
            const src = Array.isArray(data) ? data : [];
            const fallback = (v) => (v === undefined || v === null || String(v).trim() === "") ? "-" : String(v).trim();

            return src.map((student) => {
              const user = student.user || {};
              const parentUser = student.parent?.user || {};

              const fullName = fallback([user.first_name, user.last_name].filter(Boolean).join(' '));
              const schoolName = fallback(student.school?.name || student.school_name || student.school);
              const grade = fallback(student.class?.class_name || student.class_name || student.grade || user.grade);
              const parentDisplay = fallback([parentUser.first_name, parentUser.last_name].filter(Boolean).join(' '));

              return {
                id: student.id,
                name: fullName,
                grade,
                parent_name: parentDisplay,
                parent_email: parentUser.email || student.parent?.email || '-',
                school: schoolName,
                state: user.state || student.state || '-',
                status: fallback(user.status || student.status),
                created_at: user.created_at || student.created_at,
                raw: student, // Keep raw data in case we need it
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
          parent_name: F.text("Parent", "parent_name"),
          parent_email: F.text("Parent Email", "parent_email"),
          school: F.text("School", "school"),
          state: F.text("State", "state"),
          created_at: F.date("Date added", "created_at"),
        }),

        defaultVisible: [
          "status",
          "id",
          "name",
          "grade",
          "parent_name",
          "parent_email",
          "school",
          "state",
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
