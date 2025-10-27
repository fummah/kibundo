// src/pages/students/StudentsList.jsx
import React from "react";
import { Link } from "react-router-dom";
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
          listPath: "/allstudents",
          updateStatusPath: (id) => `/student/${id}/status`,
          removePath: (id) => `/student/${id}`,
          parseList: (data) => {
            const src = Array.isArray(data) ? data : [];
            const fallback = (v) =>
              v === undefined || v === null || String(v).trim() === "" ? "-" : String(v).trim();

            return src.map((student) => {
              const user = student.user || {};
              const parent = student.parent || {};
              const parentUser = parent?.user || {};

              const fullName = fallback([user.first_name, user.last_name].filter(Boolean).join(" "));
              const schoolName = fallback(
                student.school?.name || student.school_name || student.school
              );
              const grade = fallback(
                student.class?.class_name || student.class_name || student.grade || user.grade
              );

              // Use the same logic as StudentDetail (lines 130-146)
              let parentName = "-";
              let parentEmail = "-";
              let parentId = null;

              if (parent) {
                const possibleNames = [
                  [parentUser.first_name, parentUser.last_name].filter(Boolean).join(" ").trim(),
                  parent.name,
                  parentUser.name,
                  parentUser.username,
                  parent.username,
                ].filter(Boolean);
                parentName = possibleNames[0] || (parent.id ? `Parent #${parent.id}` : "-");
                parentEmail = parentUser.email || parent.email || parentUser.username || parent.username || "-";
                parentId = parent.id || null;
              }

              return {
                id: student.id,
                name: fullName,
                grade,
                parent_name: parentName,
                parent_email: parentEmail,
                parent_id: parentId, // used only to build the Link
                school: schoolName,
                state: user.state || student.state || "-",
                status: fallback(user.status || student.status),
                created_at: user.created_at || student.created_at,
                raw: student,
              };
            });
          },
        },
        statusFilter: true,
        billingFilter: false,

        columnsMap: () => ({
          status: F.status("status"),
          id: F.idLink("ID", "/admin/students", "id"),
          name: F.text("Full Name", "name"),
          grade: F.text("Grade", "grade"),
          state: F.text("State", "state"),
          created_at: F.date("Date added", "created_at"),
        }),

        // No Parent ID column
        defaultVisible: [
          "status",
          "id",
          "name",
          "grade",
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
