// src/pages/students/StudentsList.jsx
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
              const parentFullName = fallback([parentUser.first_name, parentUser.last_name].filter(Boolean).join(' '));
              const schoolName = fallback(student.school?.name || student.school_name || student.school);
              const grade = fallback(student.class?.class_name || student.class_name || student.grade || user.grade);

              return {
                id: student.id,
                name: fullName,
                email: fallback(user.email),
                grade,
                // school: schoolName,
                parent_name: parentFullName,
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
          // school: F.text("School", "school"),
          parent_name: F.text("Parent", "parent_name"),
          email: F.text("Email", "email"),
          created_at: F.date("Date added", "created_at"),
        }),

        defaultVisible: [
          "status",
          "id",
          "name",
          "grade",
          "parent_name",
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
