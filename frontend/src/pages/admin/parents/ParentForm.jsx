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
      toListRelative=".."
      toDetailRelative={(id) => `${id}`}
      apiCfg={{
        getPath: (id) => `/parents/${id}`,
        createPath: "/addparent",
        updatePath: (id) => `/parents/${id}`,
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
        { name: "status", label: "Status", input: "select", options: statusOptions, placeholder: "Select status" },

        // --- Address (kept light) ---
        { name: "street",  label: "Street Address", placeholder: "e.g., Gartenweg 8" },
        { name: "city",    label: "City",           placeholder: "e.g., Munich" },
        { name: "zipCode", label: "ZIP / Postal Code", placeholder: "e.g., 80331" },
        { name: "country", label: "Country",        placeholder: "e.g., Germany" },

        // --- Optional context ---
        { name: "location", label: "Location (Campus / School)", placeholder: "e.g., East Campus" },

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

        // --- Ops helper: send reset after create/update (optional) ---
        {
          name: "__sendReset",
          label: "Send password reset email",
          input: "switch",
          initialValue: true,
          help: "If enabled, a reset email is sent to this parent after saving.",
        },
      ]}
    />
  );
}
