// src/pages/students/StudentsList.jsx
import EntityList, { columnFactories as F } from "@/components/EntityList";

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
            const src = Array.isArray(data)
              ? data
              : (Array.isArray(data?.data) ? data.data : []);

            const fallback = (v) => {
              if (v === undefined || v === null) return "-";
              const s = String(v).trim();
              return s === "" ? "-" : s;
            };

            const pickParent = (student) => {
              // Accept a single object or an array of guardians
              const maybeArray =
                student.parents ??
                student.guardians ??
                student.parent ??
                student.guardian ??
                student.linked_parent;

              if (Array.isArray(maybeArray)) {
                // Prefer payer, else first
                const payer = maybeArray.find((g) => g?.is_payer);
                return payer || maybeArray[0];
              }
              return maybeArray || null;
            };

            return src.map((student) => {
              // ---- student name ----
              const fullName = [
                student.user?.first_name,
                student.user?.last_name,
              ]
                .filter(Boolean)
                .join(" ")
                .trim();

              // ---- school name (Location = School only) ----
              const schoolName =
                student.school?.name ??
                student.school_name ??
                student.school ??
                student.location ??
                "-";

              // ---- parent linkage ----
              const parent = pickParent(student);

              const parentFullName = parent
                ? (
                    [
                      parent.name,
                      parent.full_name,
                      [parent.first_name, parent.last_name].filter(Boolean).join(" "),
                      [parent.user?.first_name, parent.user?.last_name].filter(Boolean).join(" "),
                    ].find((x) => x && String(x).trim() !== "") || "-"
                  )
                : "-";

              const parentEmail =
                parent?.email ??
                parent?.user?.email ??
                parent?.contact_email ??
                "-";

              return {
                id: student.id,
                name: fallback(fullName),
                class_name: fallback(student.class?.class_name ?? student.class_name),
                grade: fallback(student.grade ?? student.user?.grade),
                school: fallback(schoolName),                   // ← School only
                parent_name: fallback(parentFullName),          // ← Parent linkage
                parent_email: fallback(parentEmail),            // ← Parent linkage
                status: fallback(student.user?.status ?? student.status),
                user_id: student.user_id,
                class_id: student.class_id,
                created_at: student.created_at,
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
          class_name: F.text("Class", "class_name"),
          grade: F.text("Grade", "grade"),
          school: F.text("School", "school"),
          parent_name: F.text("Parent", "parent_name"),
          parent_email: F.email("parent_email"),
          created_at: F.date("Date added", "created_at"),
        }),

        defaultVisible: [
          "status",
          "id",
          "name",
          "class_name",
          "grade",
          "school",
          "parent_name",
          "parent_email",
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
