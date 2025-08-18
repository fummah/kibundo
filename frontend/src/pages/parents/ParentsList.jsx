import EntityList, { columnFactories as F } from "@/components/EntityList";

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
          listPath: "/allparents",
          updateStatusPath: (id) => `/parents/${id}/status`,
          removePath: (id) => `/parents/${id}`,
          parseList: (data) => {
            const src = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            const fb = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : v);

            return src.map((p) => {
              const u = p.user || {};
              const fullName =
                u.name ||
                [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
                p.name;

              return {
                id: p.id,
                name: fb(fullName),
                email: fb(u.email || p.email),
                phone: fb(u.contact_number || u.phone || p.phone),
                relationship: fb(p.relationship),
                status: fb(u.status || p.status),
                user_id: p.user_id,
                created_at: p.created_at || u.created_at || null,

                // future address/location fields
                location: fb(p.location),
                street: fb(p.street),
                city: fb(p.city),
                county: fb(p.county),
                zipCode: fb(p.zipCode || p.zip_code),
                country: fb(p.country),
                bundesland: fb(p.bundesland),
              };
            });
          },
        },
        statusFilter: true,
        billingFilter: false,
        columnsMap: (navigate) => ({
          status: F.status("status"),
          id: F.idLink("ID", "/admin/parents", "id", navigate),
          name: F.text("Full name", "name"),
          relationship: F.text("Relationship", "relationship"),
          email: F.email("email"),
          phone: F.text("Phone number", "phone"),

          // keep address columns for future data
          location:   F.text("Location", "location"),
          street:     F.text("Street Address", "street"),
          city:       F.text("City", "city"),
          bundesland: F.text("Bundesland", "bundesland"),
          zipCode:    F.text("Zip Code", "zipCode"),
          country:    F.text("Country", "country"),
          

          created_at: F.date("Date added", "created_at"),
        }),
        defaultVisible: ["status", "id", "name", "relationship", "email", "phone", "created_at"],
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
