import React from 'react';
import EntityForm from "@/components/form/EntityForm";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "disabled", label: "Blocked" },
];

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
        }
      }}
      fields={[
        // Basic Information
        { 
          name: "first_name", 
          label: "First name", 
          placeholder: "e.g., John", 
          rules: [{ required: true, message: "First name is required" }] 
        },
        { 
          name: "last_name",  
          label: "Last name",  
          placeholder: "e.g., Smith", 
          rules: [{ required: true, message: "Last name is required" }] 
        },
        { 
          name: "email",  
          label: "Email", 
          placeholder: "student@example.com", 
          rules: [
            { required: true, message: 'Email is required' },
            { type: 'email', message: 'Please enter a valid email' }
          ] 
        },

        // Academic Information
        {
          name: "grade",
          label: "Grade",
          input: "select",
          placeholder: "Search for a grade/class...",
          optionsUrl: "/allclasses",
          serverSearch: true,
          searchParam: "q",
          optionValue: "id",
          optionLabel: "class_name",
          rules: [{ required: true, message: "Grade is required" }],
        },
        {
          name: "subjects",
          label: "Subjects",
          input: "select",
          mode: "multiple",
          placeholder: "Search for subjects...",
          optionsUrl: "/allsubjects",
          serverSearch: true,
          searchParam: "q",
          optionValue: "id",
          optionLabel: "subject_name",
        },

        // Parent Information (Optional)
        {
          name: "parent_id",
          label: "Parent",
          input: "select",
          placeholder: "Search for a parent...",
          optionsUrl: "/parents",
          serverSearch: true,
          searchParam: "q",
          optionValue: "id",
          optionLabel: (item) => `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim(),
          disabled: !!initialValues.parent_id,
          initialOptions: initialValues.parent_id 
            ? [{ value: initialValues.parent_id, label: initialValues.parent_name }] 
            : [],
        },

        // Additional Information
        { 
          name: "school", 
          label: "School (Optional)", 
          placeholder: "e.g., South Campus" 
        },
        // Status field removed — backend defaults status to 'active'
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
            label: it.name ?? it.label ?? String(it)
          }),
          autoloadOptions: false,
        },
      ]}
      transformSubmit={(values) => {
        // Transform the form values to match your API expectations
        const payload = {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          grade_id: values.grade,
          school: values.school,
          // status omitted — backend sets default
          bundesland: values.bundesland,
          subjects: values.subjects || [],
          parent_id: initialValues.parent_id || null,
        };
        
        return payload;
      }}
      toListRelative={isModal ? undefined : ".."}
      toDetailRelative={isModal ? undefined : (id) => `${id}`}
      submitLabel={isModal ? 'Add Student' : 'Save Changes'}
    />
  );
};

export default StudentForm;
