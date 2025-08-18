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
          removePath: (id) => `/students/${id}`, // if you support delete
          // 👇 Use your exact normalization
          parseList: (data) => {
           const src = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
const fallback = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : v);

return src.map((student) => {
  const fullName = [student.user?.first_name, student.user?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: student.id,
    name: fallback(fullName),                 // ← merged first + last
    email: fallback(student.user?.email),
    phone: fallback(student.user?.contact_number),
    class_name: fallback(student.class?.class_name),
    status: fallback(student.user?.status),
    user_id: student.user_id,
    class_id: student.class_id,
    created_at: student.created_at,
    subjects: Array.isArray(student.subjects) ? student.subjects : ["-"],
  };
});

          },
        },
        statusFilter: true,
        billingFilter: false,
        columnsMap: (navigate, H) => ({
          status: F.status("status"),
          id: F.idLink("ID", "/admin/students", "id", navigate),
          name: F.text("Full name", "name"),
          phone: F.text("Phone number", "phone"),
          class_name: F.text("Class", "class_name"),
          email: F.email("email"),
           // Address / location block (added)
          location:   F.text("Location", "location"),
          street:     F.text("Street Address", "street"),
          bundesland: F.text("Bundesland", "bundesland"),
          city:       F.text("City", "city"),
          zipCode:    F.text("Zip Code", "zipCode"),
          county:     F.text("County", "county"),
          created_at: F.date("Date added", "created_at"),
        }),
        defaultVisible: ["status", "id", "name", "phone", "class_name", "email", "created_at"],
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
