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
      apiCfg={{
        getPath: (id) => `/parents/${id}`,
        createPath: "/addparent",
        updatePath: (id) => `/parents/${id}`,
      }}
      fields={[
        { name: "name",         label: "Full name",  placeholder: "e.g., Anna Müller", rules: [{ required: true, message: "Name is required" }] },
        { name: "relationship", label: "Relationship", placeholder: "e.g., Mother" },

        { name: "email", label: "Email", placeholder: "parent@example.com", rules: [{ type: "email", message: "Invalid email" }] },
        { name: "phone", label: "Phone number", placeholder: "+49 160 2345678" },
        { name: "status", label: "Status", input: "select", options: statusOptions, placeholder: "Select status" },

        // Address
        { name: "location", label: "Location",       placeholder: "e.g., East Campus" },
        { name: "street",   label: "Street Address", placeholder: "e.g., Gartenweg 8" },
        { name: "city",     label: "City",           placeholder: "e.g., Munich" },
        { name: "county",   label: "County",         placeholder: "e.g., Schwabing-Freimann" },
        { name: "zipCode",  label: "ZIP / Postal Code", placeholder: "e.g., 80331" },
        { name: "country",  label: "Country",        placeholder: "e.g., Germany" },

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
