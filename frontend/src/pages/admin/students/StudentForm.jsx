// StudentForm.jsx
import React from "react";
import EntityForm from "@/components/form/EntityForm";

const StudentForm = ({ isModal = false, initialValues = {}, onSuccess = () => {} }) => {
  return (
    <EntityForm
      id={isModal ? "new" : undefined}
      titleNew="Add Student"
      titleEdit="Edit Student"
      initialValues={initialValues}
      apiCfg={{
        getPath: (id) => `/student/${id}`,
        createPath: "/addstudent",
        updatePath: (id) => `/student/${id}`,
        afterCreate: (res) => {
          if (isModal) {
            onSuccess(res);
            return { preventRedirect: true };
          }
        },
        // Create user (role_id=1) then student is created server-side in /adduser
        create: async (api, payload) => {
          console.log(payload);
          // Robust temp password generator
          const genTempPassword = (len = 12) => {
            try {
              const bytes = new Uint32Array(len);
              if (window?.crypto?.getRandomValues) {
                window.crypto.getRandomValues(bytes);
                return Array.from(bytes).map((x) => (x % 36).toString(36)).join("");
              }
            } catch {}
            // Fallback
            const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
            let out = "";
            for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
            return out;
          };

          const userBody = {
            role_id: 1,
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: payload.email,
            state: payload.state,
            class_id: payload.class_id, // required for student creation
            parent_id: payload.parent_id ?? null,
            subjects: Array.isArray(payload.subjects) ? payload.subjects : [],
            password: genTempPassword(14),
          };

          // POST /adduser; backend will create associated Student when role_id===1
          return await api.post("/adduser", userBody);
        },
      }}
      fields={[
        // Basic
        { name: "first_name", label: "First name", rules: [{ required: true }] },
        { name: "last_name",  label: "Last name",  rules: [{ required: true }] },
        {
          name: "email",
          label: "Email",
          rules: [{ required: true }, { type: "email" }],
        },

        // Class (IMPORTANT: backend wants class_id)
        {
          name: "class_id",
          label: "Class",
          input: "select",
          placeholder: "Search class…",
          optionsUrl: "/allclasses",
          serverSearch: true,
          autoloadOptions: false,
          searchParam: "q",
          allowClear: true,
          transform: (it) => ({ value: it?.id ?? it, label: it?.class_name ?? String(it) }),
          rules: [{ required: true, message: "Class is required" }],
        },

        // Subjects (IDs array)
        {
          name: "subjects",
          label: "Subjects",
          input: "select",
          mode: "multiple",
          optionsUrl: "/allsubjects",
          serverSearch: true,
          autoloadOptions: false,
          searchParam: "q",
          allowClear: true,
          transform: (it) => ({ value: it?.id ?? it, label: it?.subject_name ?? String(it) }),
        },

        // Parent (optional)
        {
          name: "parent_id",
          label: "Parent",
          input: "select",
          optionsUrl: "/parents",
          serverSearch: true,
          autoloadOptions: false,
          searchParam: "q",
          allowClear: true,
          transform: (it) => {
            const fn = it?.user?.first_name || "";
            const ln = it?.user?.last_name || "";
            const nm = it?.user?.name || [fn, ln].filter(Boolean).join(" ");
            return { value: it?.id ?? it, label: (nm || `Parent #${it?.id ?? ""}`).trim() };
          },
          disabled: !!initialValues.parent_id,
          initialOptions:
            initialValues.parent_id && initialValues.parent_name
              ? [{ value: initialValues.parent_id, label: initialValues.parent_name }]
              : undefined,
        },

        // Optional extras
        { name: "school", label: "School (Optional)" },
        {
          name: "state", // <-- your users table shows "state"
          label: "State",
          input: "select",
          placeholder: "Search state…",
          optionsUrl: "/states",
          serverSearch: true,
          autoloadOptions: false,
          searchParam: "q",
          allowClear: true,
          transform: (it) => ({ value: it?.id ?? it, label: it?.state_name ?? String(it) }),
        },
      ]}
      transformSubmit={(values) => {
        // Map to what /adduser expects; student is created server-side
        const payload = {
          first_name: values.first_name?.trim(),
          last_name: values.last_name?.trim(),
          email: values.email?.trim(),
          state: values.state || null,
          class_id: values.class_id, // map grade -> class_id
          subjects: Array.isArray(values.subjects) ? values.subjects : [],
          parent_id: values.parent_id ?? initialValues.parent_id ?? null,
          school: values.school || null,
        };
        Object.keys(payload).forEach((k) => payload[k] == null && delete payload[k]);
        return payload;
      }}
      toListRelative={isModal ? undefined : ".."}
      toDetailRelative={isModal ? undefined : (id) => `${id}`}
      submitLabel={isModal ? 'Add Student' : 'Save Changes'}
    />
  );
};

export default StudentForm;
