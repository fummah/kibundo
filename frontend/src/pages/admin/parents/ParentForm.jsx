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

        // Use existing backend route: create a User with role_id=2; backend will create Parent
        create: async (api, payload) => {
          const body = { ...payload, role_id: 2 };
          const res = await api.post("/adduser", body);
          const createdUser = res?.data?.user || res?.data?.data || res?.data || {};

          // Try to resolve the Parent.id associated with this user by email
          try {
            const parentsRes = await api.get("/parents");
            const parents = Array.isArray(parentsRes?.data) ? parentsRes.data : [];
            const match = parents.find((p) => (p?.user?.email && payload?.email) && p.user.email === payload.email);
            if (match?.id) {
              return { data: { id: match.id } };
            }
          } catch (e) {
            // ignore and fall back
          }

          // If we can't resolve Parent.id, surface a clear message
          throw new Error("Parent created, but could not resolve Parent ID for redirect. Refresh Parents list.");
        },

        // There’s no PUT/PATCH route for parents in your routes.
        // updatePath: (id) => `/parent/${id}`,
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

        // Optional: link students by IDs (not used by /adduser)
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
          coerce: "number",
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
