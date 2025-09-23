import EntityForm from "@/components/form/EntityForm";

export default function TeacherForm() {
  return (
    <EntityForm
      titleNew="Add Teacher"
      titleEdit="Edit Teacher"
      submitLabel="Save"
      toListRelative=".."
      toDetailRelative={(id) => `${id}`}
      apiCfg={{
        // ✅ use singular route
        getPath: (id) => `/teacher/${id}`,
        // ✅ create route from your backend
        createPath: "/addteacher",
        // ❌ no update route defined in backend yet
        // updatePath: (id) => `/teacher/${id}`,
      }}
      fields={[
        {
          name: "first_name",
          label: "First name",
          placeholder: "e.g., Jane",
          rules: [{ required: true, message: "First name is required" }],
        },
        {
          name: "last_name",
          label: "Last name",
          placeholder: "e.g., Doe",
          rules: [{ required: true, message: "Last name is required" }],
        },
        {
          name: "email",
          label: "Email",
          placeholder: "name@example.com",
          rules: [{ required: true, message: "Email is required" }, { type: "email", message: "Invalid email" }],
        },
        { name: "phone", label: "Phone number", placeholder: "+27 82 123 4567" },

        // Class assignment
        {
          name: "class_id",
          label: "Class",
          input: "select",
          placeholder: "Select class…",
          optionsUrl: "/allclasses",
          serverSearch: true,
          searchParam: "q",
          optionValue: "id",
          optionLabel: "class_name",
          rules: [{ required: true, message: "Class is required" }],
        },

        // Bundesland (from DB)
        {
          name: "bundesland",
          label: "Bundesland",
          input: "select",
          placeholder: "Search Bundesland…",
          optionsUrl: "/states",
          serverSearch: true,
          searchParam: "q",
          transform: (it) => ({
            value: it.code ?? it.id ?? it,
            label: it.state_name ?? it.name ?? String(it),
          }),
          autoloadOptions: false,
        },
      ]}
      transformSubmit={(vals) => {
        return {
          first_name: vals.first_name?.trim(),
          last_name: vals.last_name?.trim(),
          email: vals.email?.trim(),
          phone: vals.phone,
          class_id: vals.class_id,
          bundesland: vals.bundesland,
        };
      }}
    />
  );
}
