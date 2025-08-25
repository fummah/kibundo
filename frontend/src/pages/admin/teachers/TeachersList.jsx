import EntityList, { columnFactories as F } from "@/components/EntityList";

export default function TeachersList() {
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
            const fb = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : v);

            return src.map((t) => {
              const u = t.user || {};
              const fullName =
                u.name ||
                [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
                t.name;

              return {
                id: t.id,
                name: fb(fullName),
                email: fb(u.email || t.email),
                phone: fb(u.contact_number || u.phone || t.phone),
                department: fb(t.department),
                status: fb(u.status || t.status),
                user_id: t.user_id,
                created_at: t.created_at || u.created_at || null,

                // future address/location fields
                location: fb(t.location),
                street: fb(t.street),
                city: fb(t.city),
                county: fb(t.county),
                zipCode: fb(t.zipCode || t.zip_code),
                country: fb(t.country),
                bundesland: fb(t.bundesland),
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
          department: F.text("Department", "department"),
          email: F.email("email"),
          phone: F.text("Phone number", "phone"),

          // keep address columns for future data
          location:   F.text("Location", "location"),
          street:     F.text("Street Address", "street"),
          city:       F.text("City", "city"),
          
          zipCode:    F.text("Zip Code", "zipCode"),
          country:    F.text("Country", "country"),
          

          created_at: F.date("Date added", "created_at"),
        }),
        defaultVisible: ["status", "id", "name", "department", "email", "phone", "created_at"],
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
