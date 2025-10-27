import { useNavigate } from "react-router-dom";
import EntityList from "@/components/EntityList.jsx";
import { columnFactories as F } from "@/components/entityList/columnFactories.jsx";

export default function TeachersList() {
  const navigate = useNavigate();

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
          updateStatusPath: (id) => `/teacher/${id}/status`,
          removePath: (id) => `/teacher/${id}`,
          parseList: (data) => {
            const src = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            const fb = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : v);

            return src.map((t) => {
              const u = t.user || {};
              const name =
                u.name ||
                [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
                t.name || "-";

              const parsed = {
                // fields available for row + detail prefill
                id: t.id,
                name: fb(name),
                email: fb(u.email ?? t.email),
                status: fb(u.status ?? t.status),

                // Phone and state mappings
                contact_number: fb(u.contact_number ?? t.contact_number ?? t.phone),
                bundesland: fb(u.state ?? t.bundesland),
                
                // Class information
                grade: fb(t.class?.class_name ?? t.department),
                class_id: t.class_id,

                created_at: t.created_at || u.created_at || null,

                // keep originals around
                user_id: t.user_id,
                raw: t,
              };

              return parsed;
            });
          },
        },
        statusFilter: true,
        billingFilter: false,

        // Override the ID column to navigate with router state (prefill)
        columnsMap: (navigate) => ({
          status: F.status("status"),

          id: {
            title: "ID",
            dataIndex: "id",
            key: "id",
            width: 110,
            render: (v, row) => (
              <a
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/admin/teachers/${row.id}`, { state: { prefill: row } });
                }}
                href={`/admin/teachers/${row.id}`}
              >
                {v}
              </a>
            ),
          },

          name: {
            title: "Full Name",
            dataIndex: "name",
            key: "name",
            render: (v, row) => (
              <a
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/admin/teachers/${row.id}`, { state: { prefill: row } });
                }}
                href={`/admin/teachers/${row.id}`}
              >
                {v}
              </a>
            ),
          },

          email: F.email("email"),

          // Phone number column
          contact_number: F.text("Phone number", "contact_number"),

          // Class column
          grade: F.text("Class", "grade"),

          // Show as "State", value comes from user.state (bundesland)
          bundesland: F.text("State", "bundesland"),

          created_at: F.date("Date added", "created_at"),
        }),

        // Make contact + state visible by default
        defaultVisible: ["status", "id", "name", "grade", "bundesland", "email", "contact_number", "created_at"],
        
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
