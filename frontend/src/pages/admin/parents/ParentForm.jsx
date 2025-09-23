import EntityForm from "@/components/form/EntityForm";

export default function ParentForm() {
  return (
    <EntityForm
      titleNew="Add Parent"
      titleEdit="Edit Parent"
      submitLabel="Save"
      toDetailRelative={(id) => `${id}`}
      apiCfg={{
        // detail exists:
        getPath: (id) => `/parent/${id}`,

        // ✅ create must hit /addparent (your router file)
        create: async (api, payload) => {
          console.log(payload);
          const res = await api.post("/addparent", payload); // verifyToken required → make sure axios sends the token
          // normalize the id for EntityForm redirect
          const raw = res?.data?.data ?? res?.data ?? {};
          const id =
            raw?.id ??
            raw?.parent?.id ??
            raw?.data?.id;
          return { data: { id } };
        },

        // There’s no PUT/PATCH route for parents in your routes.
        // Leave updatePath out or add one on the server before enabling edit.
        // updatePath: (id) => `/parent/${id}`, // only if you implement it server-side
        requiredKeys: ["first_name", "last_name", "email"],
      }}

      fields={[
        { name: "first_name", label: "First name", rules: [{ required: true }] },
        { name: "last_name",  label: "Last name",  rules: [{ required: true }] },
        { name: "email",      label: "Email", rules: [{ required: true }, { type: "email" }] },
        { name: "contact_number", label: "Phone number", placeholder: "+27 82 123 4567" },

        // State is a VARCHAR on users.state → send the name string
        {
          name: "state",
          label: "State",
          input: "select",
          placeholder: "Search state…",
          optionsUrl: "/states",
          serverSearch: true,
          autoloadOptions: false,
          searchParam: "q",
          transform: (it) => ({
            value: it?.state_name ?? it?.name ?? String(it),
            label: it?.state_name ?? it?.name ?? String(it),
          }),
        },

        // Optional: link students by IDs
        {
          name: "student_ids",
          label: "Link Students (Optional)",
          input: "select",
          mode: "multiple",
          placeholder: "Search for students…",
          optionsUrl: "/allstudents",
          serverSearch: true,
          autoloadOptions: false,
          searchParam: "q",
          transform: (it) => {
            const u = it?.user ?? {};
            const nm = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
            return { value: it?.id ?? it, label: nm ? `${nm} (ID: ${it?.id})` : `Student #${it?.id ?? ""}` };
          },
          coerce: "number", // EntityForm will coerce to numbers before submit
        },
      ]}

      transformSubmit={(vals) => {
        const out = {
          first_name: vals.first_name?.trim(),
          last_name: vals.last_name?.trim(),
          email: vals.email?.trim(),
          contact_number: vals.contact_number || null,
          state: vals.state || null, // string name
          student_ids: Array.isArray(vals.student_ids) ? vals.student_ids : [],
        };
        Object.keys(out).forEach((k) => out[k] == null && delete out[k]);
        return out;
      }}
    />
  );
}
