// src/pages/parents/ParentsList.jsx
import { useNavigate } from "react-router-dom";
import EntityList from "@/components/EntityList.jsx";
import { columnFactories as F } from "@/components/entityList/columnFactories.jsx";

export default function ParentsList() {
  return (
    <EntityList
      cfg={{
        entityKey: "parents",
        titlePlural: "Parents",
        titleSingular: "Parent",
        routeBase: "/admin/parents",
        idField: "id",
        api: {
          listPath: "/parents",
          updateStatusPath: (id) => `/parents/${id}/status`,
          removePath: (id) => `/parents/${id}`,
          parseList: (data) => {
            const src = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            const fb = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : v);

            return src.map((p) => {
              const u = p.user || {};
              const name =
                u.name ||
                [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
                p.name || "-";

              return {
                // everything we want available on detail prefill:
                id: p.id,
                name: fb(name),
                email: fb(u.email || p.email),
                status: fb(u.status || p.status),
                // school: fb(p.school?.name || p.school_name || p.location),
                bundesland: fb(p.bundesland),
                created_at: p.created_at || u.created_at || null,

                // keep originals around just in case
                user_id: p.user_id,
                raw: p,
              };
            });
          },
        },
        statusFilter: true,
        billingFilter: false,

        // IMPORTANT: override the ID column to navigate with router state
        columnsMap: (navigate) => ({
          status: F.status("status"),

          // ID column → pass prefill
          id: {
            title: "ID",
            dataIndex: "id",
            key: "id",
            width: 110,
            render: (v, row) => (
              <a
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/admin/parents/${row.id}`, { state: { prefill: row } });
                }}
                href={`/admin/parents/${row.id}`}
              >
                {v}
              </a>
            ),
          },

          // Name column also clickable (optional)
          name: {
            title: "Full name",
            dataIndex: "name",
            key: "name",
            render: (v, row) => (
              <a
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/admin/parents/${row.id}`, { state: { prefill: row } });
                }}
                href={`/admin/parents/${row.id}`}
              >
                {v}
              </a>
            ),
          },

          email: F.email("email"),
          // school: F.text("School", "school"),
          bundesland: F.text("Bundesland", "bundesland"),
          
          created_at: F.date("Date added", "created_at"),
        }),

        defaultVisible: ["status", "id", "name", "email", "bundesland", "created_at"],
      }}
    />
  );
}
