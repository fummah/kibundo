import EntityForm from "@/components/form/EntityForm";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "disabled", label: "Blocked" },
];

export default function ParentForm() {
  return (
    <EntityForm
      titleNew="Add Parent"
      titleEdit="Edit Parent"
      submitLabel="Save"
      toDetailRelative={(id) => `${id}`}
      apiCfg={{
        getPath: (id) => `/parent/${id}`,
        createPath: "/parents",
        updatePath: (id) => `/parents/${id}`,
        afterCreate: (res, form, antd) => {
          antd.message.success("Parent added successfully");
          // The generic form expects the new ID at res.id, but our API returns it at res.parent.id
          // We return the expected structure to let the form handle the redirect.
          return { id: res?.parent?.id };
        }
        /**
         * If your EntityForm supports lifecycle hooks, you can fire
         * a password reset mail immediately on creation:
         *
         * afterCreate: async (created, values, api) => {
         *   if (values.__sendReset !== false && created?.id) {
         *     try { await api.post(`/parents/${created.id}/send-password-reset`); } catch {}
         *   }
         * }
         */
      }}
      fields={[
        // --- Identity ---
        { name: "name",  label: "Full name", placeholder: "e.g., Anna Müller",
          rules: [{ required: true, message: "Name is required" }] },
        { name: "email", label: "Email", placeholder: "parent@example.com",
          rules: [{ required: true, message: "Email is required" }, { type: "email", message: "Invalid email" }] },
        { name: "phone", label: "Phone number", placeholder: "+49 160 2345678" },

        // --- Optional context ---
        

        // Bundesland (async select from DB)
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

        // Link Students (Optional)
        {
          name: "student_ids",
          label: "Link Students (Optional)",
          input: "select",
          mode: "multiple",
          placeholder: "Search for students to link...",
          optionsUrl: "/allstudents",
          serverSearch: true,
          searchParam: "q",
          optionValue: "id",
          optionLabel: (item) => {
            const user = item.user || {};
            const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
            return name ? `${name} (ID: ${item.id})` : `Student (ID: ${item.id})`;
          },
        },
      ]}
      transformSubmit={(vals) => ({
        ...vals,
        student_ids: vals.student_ids || [],
      })}
    />
  );
}
