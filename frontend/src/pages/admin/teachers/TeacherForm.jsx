import EntityForm from "@/components/form/EntityForm";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "disabled", label: "Blocked" },
];

export default function TeacherForm() {
  return (
    <EntityForm
      titleNew="Add Teacher"
      titleEdit="Edit Teacher"
      apiCfg={{
        getPath: (id) => `/teachers/${id}`,
        createPath: "/addteacher",
        updatePath: (id) => `/teachers/${id}`,
      }}
      fields={[
        { name: "name",       label: "Full name",  placeholder: "e.g., Jane Doe", rules: [{ required: true, message: "Name is required" }] },
        { name: "department", label: "Department", placeholder: "e.g., Mathematics" },

        { name: "email", label: "Email", placeholder: "name@example.com", rules: [{ type: "email", message: "Invalid email" }] },
        { name: "phone", label: "Phone number", placeholder: "+49 171 1234567" },
        { name: "status", label: "Status", input: "select", options: statusOptions, placeholder: "Select status" },

        // Address
        { name: "location", label: "Location (area/campus)", placeholder: "e.g., North Campus" },
        { name: "street",   label: "Street Address",         placeholder: "e.g., Hauptstraße 12" },
        { name: "city",     label: "City",                   placeholder: "e.g., Berlin" },
        { name: "county",   label: "County",                 placeholder: "e.g., Charlottenburg-Wilmersdorf" },
        { name: "zipCode",  label: "Zip / Postal Code",      placeholder: "e.g., 10115" },
        { name: "country",  label: "Country",                placeholder: "e.g., Germany" },

        // Bundesland from DB
        {
          name: "bundesland",
          label: "Bundesland",
          input: "select",
          placeholder: "Search Bundesland…",
          optionsUrl: "/bundeslaender",
          serverSearch: true,
          searchParam: "q",
          transform: (it) => ({ value: it.code ?? it.id ?? it, label: it.name ?? it.label ?? String(it) }),
          autoloadOptions: false,
        },
      ]}
      toListRelative=".."
      toDetailRelative={(id) => `${id}`}
      submitLabel="Add"
    />
  );
}
