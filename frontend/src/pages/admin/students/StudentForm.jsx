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
      titleNew="Schüler hinzufügen"
      titleEdit="Schüler bearbeiten"
      initialValues={mergedInitials}
      apiCfg={{
        getPath: (id) => `/student/${id}`,
        createPath: "/addstudent",
        updatePath: (id) => `/students/${id}`,
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

          // Ensure subjects is a valid array of numbers
          const subjectsArray = Array.isArray(payload.subjects) 
            ? payload.subjects.map(id => Number(id)).filter(id => !isNaN(id) && id > 0)
            : [];

          const userBody = {
            role_id: 1, // Student role
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: tempEmail, // Temporary email until backend supports optional email
            state: payload.state,
            class_id: payload.class_id,
            parent_id: payload.parent_id ?? null,
            subjects: subjectsArray, // Array of subject IDs to be saved in student_subjects table
          };

          console.log('📤 [StudentForm] Creating student with subjects:', {
            subjectsCount: subjectsArray.length,
            subjects: subjectsArray,
            userBody: { ...userBody, subjects: subjectsArray }
          });

          // POST /adduser; backend will create associated Student when role_id===1
          // The backend's adduser endpoint already handles creating student_subjects entries
          // when subjects array is provided in the request body (see backend adduser controller)
          const userRes = await api.post("/adduser", userBody);
          
          // Wait a bit for backend to create student record and student_subjects entries
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Find the newly created student
          const studentsRes = await api.get("/allstudents");
          const allStudents = Array.isArray(studentsRes.data) 
            ? studentsRes.data 
            : (studentsRes.data?.data || []);
          const createdUser = userRes?.data?.user || userRes?.data;
          const newStudent = allStudents.find(s => s.user_id === createdUser?.id);
          
          if (newStudent) {
            // Update student record with age and school if provided
            if (payload.age || payload.school) {
              try {
                const updatePayload = {};
                if (payload.age) {
                  updatePayload.age = Number(payload.age);
                }
                if (payload.school) {
                  updatePayload.school = payload.school;
                }
                
                if (Object.keys(updatePayload).length > 0) {
                  await api.put(`/students/${newStudent.id}`, updatePayload);
                }
              } catch (updateError) {
                console.warn("⚠️ Could not update student age/school:", updateError);
                // Continue anyway - student was created successfully
              }
            }
            
            // Verify subjects were created in student_subjects table
            if (subjectsArray.length > 0) {
              try {
                // Wait a bit more for the backend to finish creating student_subjects entries
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Fetch the student again to verify subjects were created
                const verifyRes = await api.get(`/student/${newStudent.id}`);
                const verifyStudent = verifyRes?.data?.data || verifyRes?.data || {};
                const createdSubjects = Array.isArray(verifyStudent.subject) ? verifyStudent.subject : [];
                
                console.log(`✅ [StudentForm] Verification - Student created with ${createdSubjects.length} subjects:`, 
                  createdSubjects.map(s => ({ id: s?.subject?.id, name: s?.subject?.subject_name }))
                );
              } catch (verifyError) {
                console.warn('⚠️ [StudentForm] Could not verify subjects creation:', verifyError);
                // Continue anyway - subjects should have been created by backend
              }
            }
          }
          
          return userRes;
        },
      }}
      fields={[
        // Basic
        { name: "first_name", label: "Vorname", placeholder: "Vorname des Schülers eingeben", rules: [{ required: true }] },
        { name: "last_name",  label: "Nachname", placeholder: "Nachname des Schülers eingeben", rules: [{ required: true }] },
        { 
          name: "age", 
          label: "Alter", 
          placeholder: "Alter des Schülers eingeben", 
          input: "number",
          props: { min: 4, max: 18 },
          rules: [
            { required: true, message: "Alter ist erforderlich" },
            {
              validator: (_, v) => {
                if (v === undefined || v === null || v === "") {
                  return Promise.reject(new Error("Alter ist erforderlich"));
                }
                const n = Number(v);
                return n >= 4 && n <= 18
                  ? Promise.resolve()
                  : Promise.reject(new Error("Alter muss zwischen 4 und 18 liegen"));
              },
            },
          ]
        },

        // Class (IMPORTANT: backend wants class_id)
        {
          name: "class_id",
          label: "Klasse",
          input: "select",
          placeholder: "Klasse auswählen",
          optionsUrl: "/allclasses",
          serverSearch: true,
          autoloadOptions: true,
          searchParam: "q",
          allowClear: true,
          transform: (it) => ({ value: it?.id ?? it, label: it?.class_name ?? String(it) }),
          rules: [{ required: true, message: "Klasse ist erforderlich" }],
          initialOptions:
            mergedInitials?.class?.id && mergedInitials?.class?.class_name
              ? [{ value: mergedInitials.class.id, label: mergedInitials.class.class_name }]
              : undefined,
        },

        // Subjects (IDs array)
        {
          name: "subjects",
          label: "Fächer",
          input: "select",
          mode: "multiple",
          placeholder: "Fächer für diesen Schüler auswählen",
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
          label: "Elternteil",
          ...(mergedInitials.parent_id
            ? {
                // When parent is pre-filled: show as disabled text input with parent name
                input: "text",
                placeholder: "Elternteil wird geladen...",
                props: {
                  disabled: true,
                  readOnly: true,
                },
              }
            : {
                // When no parent: show as searchable select
                input: "select",
                placeholder: "Elternteil suchen und auswählen",
                optionsUrl: "/parents",
                serverSearch: true,
                autoloadOptions: false,
                searchParam: "q",
                allowClear: true,
                transform: (it) => {
                  const fn = it?.user?.first_name || "";
                  const ln = it?.user?.last_name || "";
                  const nm = it?.user?.name || [fn, ln].filter(Boolean).join(" ");
                  return { value: it?.id ?? it, label: (nm || `Elternteil #${it?.id ?? ""}`).trim() };
                },
              }),
          rules: [{ required: true }],
        },

        // Optional extras
        { name: "school", label: "Schule (fakultativ)", placeholder: "Schulname eingeben (fakultativ)" },
        {
          name: "state", // <-- your users table shows "state"
          label: "Bundesland",
          input: "select",
          placeholder: "Bundesland auswählen",
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
        // Debug: Log all form values to see what's being submitted
        console.log('📝 [StudentForm] transformSubmit received values:', {
          allValues: values,
          subjectsValue: values.subjects,
          subjectsType: typeof values.subjects,
          isArray: Array.isArray(values.subjects),
        });
        
        // Map to what /adduser expects; student is created server-side
        const payload = {
          first_name: values.first_name?.trim(),
          last_name: values.last_name?.trim(),
          // No email for students - will be linked to parent's email
          state: values.state || null,
          class_id: values.class_id,
          subjects: Array.isArray(values.subjects) ? values.subjects : (values.subjects ? [values.subjects] : []),
          // Use baseInitials.parent_id (the actual ID) if parent was pre-filled, otherwise use selected value
          parent_id: baseInitials.parent_id || values.parent_id || null,
          school: values.school || null,
          age: values.age ? Number(values.age) : null,
        };
        
        console.log('📤 [StudentForm] transformSubmit payload:', payload);
        
        Object.keys(payload).forEach((k) => payload[k] == null && delete payload[k]);
        return payload;
      }}
      toListRelative={isModal ? undefined : ".."}
      toDetailRelative={isModal ? undefined : (id) => `${id}`}
      submitLabel={isModal ? 'Schüler hinzufügen' : 'Änderungen speichern'}
    />
  );
};

export default StudentForm;
