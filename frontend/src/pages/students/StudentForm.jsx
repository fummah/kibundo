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
        getPath:   (id) => `/students/${id}`,
        createPath: "/addstudent",
        updatePath: (id) => `/students/${id}`,
      }}
      // Minimal profile per spec
      fields={[
        // Identity
        { name: "first_name", label: "First name", placeholder: "e.g., John", rules: [{ required: true, message: "First name is required" }] },
        { name: "last_name",  label: "Last name",  placeholder: "e.g., Smith", rules: [{ required: true, message: "Last name is required" }] },

        // Core
        { name: "email",  label: "Email", placeholder: "student@example.com", rules: [{ type: "email", message: "Invalid email" }] },

        {
          name: "grade",
          label: "Grade",
          input: "select",
          placeholder: "Search grade…",
          optionsUrl: "/grades",
          serverSearch: true,
          searchParam: "q",
          optionValue: "value",
          optionLabel: "label",
          autoloadOptions: false,
          rules: [{ required: true, message: "Grade is required" }],
        },

        { name: "status", label: "Status", input: "select", options: statusOptions, placeholder: "Select status" },

        // Location = School only
        { name: "school", label: "School", placeholder: "e.g., South Campus" },

        // Bundesland (DB-backed)
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

        // 🔗 Optional: link a parent immediately by email
        { name: "parent_email", label: "Link Parent by Email (optional)", placeholder: "parent@example.com", rules: [{ type: "email", message: "Invalid email" }] },
        { name: "is_payer", label: "Parent is Payer", input: "switch", initialValue: true },

        // Extras (optional)
        { name: "interests", label: "Interests", input: "tags", placeholder: "Type and press Enter" },
      ]}
      // Optional: map form payload before submit to match your API
      transformSubmit={(vals) => {
        const payload = {
          first_name: vals.first_name,
          last_name: vals.last_name,
          email: vals.email,
          grade: vals.grade,
          status: vals.status,
          school: vals.school,
          bundesland: vals.bundesland,
          interests: vals.interests ?? [],
        };

        // If a parent email is provided, include linkage instructions
        if (vals.parent_email) {
          payload.parent_link = {
            email: vals.parent_email,
            is_payer: Boolean(vals.is_payer),
          };
        }
        return payload;
      }}
      toListRelative=".."
      toDetailRelative={(id) => `${id}`}
      submitLabel="Add"
    />
  );
}
