import EntityForm from "@/components/form/EntityForm";
import { useLocation } from "react-router-dom";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "disabled", label: "Blocked" },
];

export default function StudentForm() {
  const location = useLocation();
  const prefill = location.state?.prefill || {};

  return (
    <EntityForm
      titleNew="Add Student"
      titleEdit="Edit Student"
      initialValues={prefill}
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
          name: "subjects",
          label: "Subjects",
          input: "select",
          mode: "multiple", // Enable multi-select
          placeholder: "Search for subjects...",
          optionsUrl: "/allsubjects",
          serverSearch: true,
          searchParam: "q",
          optionValue: "id",
          optionLabel: "subject_name",
          rules: [{ required: false }],
        },

        {
          name: "grade",
          label: "Grade",
          input: "select",
          placeholder: "Search for a grade/class...",
          optionsUrl: "/allclasses",
          serverSearch: true,
          searchParam: "q",
          optionValue: "id",
          optionLabel: "class_name",
          rules: [{ required: true, message: "Grade is required" }],
        },

        // Parent Linkage (now optional)
        {
          name: "parent_id",
          label: "Parent ",
          input: "select",
          placeholder: "Search for a parent...",
          optionsUrl: "/parents",
          serverSearch: true,
          searchParam: "q", // Assuming backend supports search on 'q'
          optionValue: "id",
          // Format the label to show the parent's full name
          optionLabel: (item) => `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim(),
          disabled: !!prefill.parent_id, // Disable if pre-filled
          initialOptions: prefill.parent_id ? [{ value: prefill.parent_id, label: prefill.parent_name }] : [],
        },

        // Location = School only
        { name: "school", label: "School (Optional)", placeholder: "e.g., South Campus" },

        // Bundesland (DB-backed)
        {
          name: "bundesland",
          label: "bundesland",
          input: "select",
          placeholder: "Search Bundesland…",
          optionsUrl: "/bundeslaender",
          serverSearch: true,
          searchParam: "q",
          transform: (it) => ({ value: it.code ?? it.id ?? it, label: it.name ?? it.label ?? String(it) }),
          autoloadOptions: false,
        },

        // 🔗 Optional: link a parent immediately by email
       // { name: "parent_email", label: "Link Parent by Email (optional)", placeholder: "parent@example.com", rules: [{ type: "email", message: "Invalid email" }] },
      ]}
      // Optional: map form payload before submit to match your API
      transformSubmit={(vals) => {
        const payload = {
          first_name: vals.first_name,
          last_name: vals.last_name,
          email: vals.email,
          grade: vals.grade,
          school: vals.school,
          bundesland: vals.bundesland,
          parent_id: vals.parent_id,
        };

        // If a parent email is provided, include linkage instructions
        if (vals.parent_email) {
          payload.parent_link = {
            email: vals.parent_email,
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
