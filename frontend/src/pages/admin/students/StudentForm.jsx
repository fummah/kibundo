import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import EntityForm from "@/components/form/EntityForm";
import api from "@/api/axios";

const StudentForm = ({ isModal = false, initialValues = {}, onSuccess = () => {} }) => {
  const location = useLocation();
  const prefill = location.state?.prefill || {};
  const baseInitials = { ...initialValues, ...prefill };
  
  // State to hold the parent display name
  const [parentDisplayName, setParentDisplayName] = useState(
    baseInitials.parent_name || "Loading parent..."
  );

  // Merge with parent display name for the form
  // When parent is pre-filled, we show the name in the parent_id field as text
  const mergedInitials = {
    ...baseInitials,
    // Override parent_id with parent name for display when it's a disabled text field
    ...(baseInitials.parent_id ? { parent_id: parentDisplayName } : {}),
  };

  // Fetch parent data to display in the disabled text input
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // If we already have parent_name, use it
      if (baseInitials.parent_name) {
        if (mounted) setParentDisplayName(baseInitials.parent_name);
        return;
      }
      
      // If we only have parent_id, fetch the parent details
      if (!baseInitials.parent_id) return;
      
      try {
        const { data } = await api.get(`/parent/${baseInitials.parent_id}`);
        const p = data?.data ?? data ?? {};
        const u = p?.user || {};
        const label = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.name || u.email || `Parent #${baseInitials.parent_id}`;
        if (mounted) setParentDisplayName(label);
      } catch {
        if (mounted) setParentDisplayName(`Parent #${baseInitials.parent_id}`);
      }
    };
    load();
    return () => { mounted = false; };
  }, [baseInitials.parent_id, baseInitials.parent_name, initialValues.parent_id, initialValues.parent_name]);

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
            return { preventRedirect: true, preventMessage: true };
          }
          // For non-modal forms, redirect to the created student's detail page
          return { redirectTo: `/admin/students/${res.data.id}` };
        },
        // Create user (role_id=1) then student is created server-side in /adduser
        create: async (api, payload) => {
          // Generate a temporary unique email for the student (backend requires it for now)
          // Format: student_{timestamp}_{random}@temp.kibundo.local
          const tempEmail = `student_${Date.now()}_${Math.random().toString(36).substring(2, 9)}@temp.kibundo.local`;

          const userBody = {
            role_id: 1, // Student role
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: tempEmail, // Temporary email until backend supports optional email
            state: payload.state,
            class_id: payload.class_id,
            parent_id: payload.parent_id ?? null,
            subjects: Array.isArray(payload.subjects) ? payload.subjects : [],
          };

          // POST /adduser; backend will create associated Student when role_id===1
          return await api.post("/adduser", userBody);
        },
      }}
      fields={[
        // Basic
        { name: "first_name", label: "First Name", placeholder: "Enter student's first name", rules: [{ required: true }] },
        { name: "last_name",  label: "Last Name", placeholder: "Enter student's last name", rules: [{ required: true }] },

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
          placeholder: "Select subjects for this student",
          optionsUrl: "/allsubjects",
          serverSearch: true,
          autoloadOptions: false,
          searchParam: "q",
          allowClear: true,
          transform: (it) => ({ value: it?.id ?? it, label: it?.subject_name ?? String(it) }),
          rules: [{ required: true }],
        },

        // Parent - grayed out when pre-filled, otherwise show searchable select
        {
          name: "parent_id",
          label: "Parent",
          ...(mergedInitials.parent_id
            ? {
                // When parent is pre-filled: show as disabled text input with parent name
                input: "text",
                placeholder: "Loading parent...",
                props: {
                  disabled: true,
                  readOnly: true,
                },
              }
            : {
                // When no parent: show as searchable select
                input: "select",
                placeholder: "Search and select parent",
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
              }),
          rules: [{ required: true }],
        },

        // Optional extras
        { name: "school", label: "School (Optional)", placeholder: "Enter school name (optional)" },
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
          // Use baseInitials.parent_id (the actual ID) if parent was pre-filled, otherwise use selected value
          parent_id: baseInitials.parent_id || values.parent_id || null,
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
