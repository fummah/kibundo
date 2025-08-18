import EntityForm from "@/components/form/EntityForm";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "disabled", label: "Blocked" },
];

export default function StudentForm() {
  return (
    <EntityForm
      titleNew="Add Student"
      titleEdit="Edit Student"
      apiCfg={{
        getPath: (id) => `/students/${id}`,
        createPath: "/addstudent",
        updatePath: (id) => `/students/${id}`,
      }}
      // lead layout with async DB-backed selects
      fields={[
        { name: "first_name", label: "First name", placeholder: "e.g., John", rules: [{ required: true, message: "First name is required" }] },
        { name: "last_name",  label: "Last name",  placeholder: "e.g., Smith", rules: [{ required: true, message: "Last name is required" }] },

        // Grade from DB (server search, lazy-loaded on first open)
        {
          name: "grade",
          label: "Grade",
          input: "select",
          placeholder: "Search grade…",
          optionsUrl: "/grades",
          serverSearch: true,
          searchParam: "q",
          optionValue: "value",        // adjust if your API uses different keys
          optionLabel: "label",
          autoloadOptions: false,
        },

        { name: "email",  label: "Email",       placeholder: "student@example.com", rules: [{ type: "email", message: "Invalid email" }] },
        { name: "phone",  label: "Phone",       placeholder: "+49 151 9876543" },
        { name: "status", label: "Status",      input: "select", options: statusOptions, placeholder: "Select status" },

        // Address
        { name: "location",  label: "Location",       placeholder: "e.g., South Campus" },
        { name: "street",    label: "Street Address", placeholder: "e.g., Lindenstraße 5" },
        { name: "city",      label: "City",           placeholder: "e.g., Hamburg" },
        { name: "county",    label: "County",         placeholder: "e.g., Altona" },
        { name: "zipCode",   label: "ZIP / Postal Code", placeholder: "e.g., 20095" },
        { name: "country",   label: "Country",        placeholder: "e.g., Germany" },

        // Bundesland from DB
        {
          name: "bundesland",
          label: "Bundesland",
          input: "select",
          placeholder: "Search Bundesland…",
          optionsUrl: "/bundeslaender",
          serverSearch: true,
          searchParam: "q",
          // If API returns { code, name }:
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
