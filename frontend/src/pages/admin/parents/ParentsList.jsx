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
          removePath: (id) => `/parent/${id}`,
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
                // fields available for row + detail prefill
                id: p.id,
                name: fb(name),
                email: fb(u.email ?? p.email),
                status: fb(u.status ?? p.status),

                // 🔹 NEW / FIXED mappings
                contact_number: fb(u.contact_number ?? p.contact_number),
                bundesland: fb(u.state ?? p.bundesland),

                created_at: p.created_at || u.created_at || null,

                // keep originals around
                user_id: p.user_id,
                raw: p,
              };
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
                  navigate(`/admin/parents/${row.id}`, { state: { prefill: row } });
                }}
                href={`/admin/parents/${row.id}`}
              >
                {v}
              </a>
            ),
          },

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

          // 🔹 Contact number column
          contact_number: F.text("Phone number", "contact_number"),

          // 🔹 Show as “State”, value comes from user.state (bundesland)
          bundesland: F.text("State", "bundesland"),

          created_at: F.date("Date added", "created_at"),
        }),

        // 🔹 Make contact + state visible by default
        defaultVisible: ["status", "id", "name", "email", "contact_number", "bundesland", "created_at"],
      }}
    />
  );
}
