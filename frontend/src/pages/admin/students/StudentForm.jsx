import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import EntityForm from "@/components/form/EntityForm";
import api from "@/api/axios";

const StudentForm = ({ isModal = false, initialValues = {}, onSuccess = () => {} }) => {
  const location = useLocation();
  const prefill = location.state?.prefill || {};
  const mergedInitials = { ...initialValues, ...prefill };
  const [parentInitialOption, setParentInitialOption] = useState(() => {
    if (mergedInitials.parent_id && mergedInitials.parent_name) {
      return { value: mergedInitials.parent_id, label: mergedInitials.parent_name };
    }
    return null;
  });

  // If we have only parent_id, fetch the parent to display a human-friendly label in the disabled select
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mergedInitials.parent_id || mergedInitials.parent_name) return;
      try {
        const { data } = await api.get(`/parent/${mergedInitials.parent_id}`);
        const p = data?.data ?? data ?? {};
        const u = p?.user || {};
        const label = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.name || u.email || `Parent #${mergedInitials.parent_id}`;
        if (mounted) setParentInitialOption({ value: mergedInitials.parent_id, label });
      } catch {
        if (mounted) setParentInitialOption({ value: mergedInitials.parent_id, label: `Parent #${mergedInitials.parent_id}` });
      }
    };
    load();
    return () => { mounted = false; };
  }, [mergedInitials.parent_id, mergedInitials.parent_name]);

  return (
    <EntityForm
      id={isModal ? "new" : undefined}
      titleNew="Add Student"
      titleEdit="Edit Student"
      initialValues={mergedInitials}
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
            role_id: 1, // Student role
            first_name: payload.first_name,
            last_name: payload.last_name,
            // No email needed for students - will use parent's email
            state: payload.state,
            class_id: payload.class_id,
            parent_id: payload.parent_id ?? null,
            subjects: Array.isArray(payload.subjects) ? payload.subjects : [],
            password: genTempPassword(14), // Generate temp password for the student
          };

          // POST /adduser; backend will create associated Student when role_id===1
          return await api.post("/adduser", userBody);
        },
      }}
      fields={[
        // Basic
        { name: "first_name", label: "First name", rules: [{ required: true }] },
        { name: "last_name",  label: "Last name",  rules: [{ required: true }] },

        // Class (IMPORTANT: backend wants class_id)
        {
          name: "class_id",
          label: "Class",
          input: "select",
          placeholder: "Search class…",
          optionsUrl: "/allclasses",
          serverSearch: true,
          autoloadOptions: true,
          searchParam: "q",
          allowClear: true,
          transform: (it) => ({ value: it?.id ?? it, label: it?.class_name ?? String(it) }),
          rules: [{ required: true, message: "Class is required" }],
          initialOptions:
            mergedInitials?.class?.id && mergedInitials?.class?.class_name
              ? [{ value: mergedInitials.class.id, label: mergedInitials.class.class_name }]
              : undefined,
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
          rules: [{ required: true }],
        },

        // Parent (prefilled & disabled when coming from Parent detail)
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
          rules: [{ required: true }],
          disabled: !!mergedInitials.parent_id,
          initialOptions:
            parentInitialOption
              ? [parentInitialOption]
              : (mergedInitials.parent_id && mergedInitials.parent_name
                  ? [{ value: mergedInitials.parent_id, label: mergedInitials.parent_name }]
                  : undefined),
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
          transform: (it) => ({ value: it?.state_name ?? String(it), label: it?.state_name ?? String(it) }),
          rules: [{ required: true }],
        },
      ]}
      transformSubmit={(values) => {
        // Map to what /adduser expects; student is created server-side
        const payload = {
          first_name: values.first_name?.trim(),
          last_name: values.last_name?.trim(),
          // No email for students - will be linked to parent's email
          state: values.state || null,
          class_id: values.class_id,
          subjects: Array.isArray(values.subjects) ? values.subjects : [],
          parent_id: values.parent_id ?? mergedInitials.parent_id ?? null,
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
