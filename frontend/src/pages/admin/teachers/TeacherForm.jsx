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
        // detail route
        getPath: (id) => `/teacher/${id}`,
        // we will create via /adduser so the backend also creates a Teacher (role_id=3)
        create: async (api, payload) => {
          const body = {
            role_id: 3,
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: payload.email,
            // store readable state name
            state: payload.state,
            // teacher specific
            class_id: payload.class_id,
            // map phone from form to user's contact_number
            contact_number: payload.contact_number ?? payload.phone ?? null,
          };

          const res = await api.post("/adduser", body);

          // Resolve Teacher.id for redirect (backend returns user, not teacher)
          try {
            const list = await api.get("/allteachers");
            const rows = Array.isArray(list?.data) ? list.data : (Array.isArray(list?.data?.data) ? list.data.data : []);
            const match = rows.find((t) => (t?.user?.email && payload?.email) && t.user.email === payload.email);
            if (match?.id) return { data: { id: match.id } };
          } catch {}

          throw new Error("Teacher created, but could not resolve Teacher ID for redirect. Refresh Teachers list.");
        },
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
        // In detail payload phone lives at user.contact_number
        { name: ["user", "contact_number"], label: "Phone number", placeholder: "+27 82 123 4567" },

        // Class assignment
        {
          name: "class_id",
          label: "Class",
          input: "select",
          placeholder: "Select class…",
          optionsUrl: "/allclasses",
          serverSearch: true,
          autoloadOptions: true,
          searchParam: "q",
          transform: (it) => ({ value: it?.id ?? it, label: it?.class_name ?? String(it) }),
          rules: [{ required: true, message: "Class is required" }],
          initialOptions: undefined,
        },

        // State (use state name as the value)
        {
          name: ["user", "state"],
          label: "State",
          input: "select",
          placeholder: "Search Bundesland…",
          optionsUrl: "/states",
          serverSearch: true,
          searchParam: "q",
          transform: (it) => ({ value: it?.state_name ?? String(it), label: it?.state_name ?? String(it) }),
          autoloadOptions: false,
        },
      ]}
      transformSubmit={(vals) => {
        return {
          first_name: vals.first_name?.trim(),
          last_name: vals.last_name?.trim(),
          email: vals.email?.trim(),
          // read phone from nested user.contact_number or flat
          contact_number: vals?.user?.contact_number ?? vals.contact_number ?? vals.phone ?? null,
          class_id: vals.class_id,
          // read state from nested user.state or flat
          state: vals?.user?.state ?? vals.state ?? null,
        };
      }}
    />
  );
}
