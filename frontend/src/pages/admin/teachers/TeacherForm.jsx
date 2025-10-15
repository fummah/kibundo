import EntityForm from "@/components/form/EntityForm";

export default function TeacherForm() {
  return (
    <EntityForm
      titleNew="Add Teacher"
      titleEdit="Edit Teacher"
      submitLabel="Save"
      toDetailRelative={(id) => `/admin/teachers/${id}`}
      apiCfg={{
        // Detail path
        getPath: (id) => `/teacher/${id}`,
        
        afterCreate: (res) => {
          // Redirect to the created teacher's detail page
          return { redirectTo: `/admin/teachers/${res.data.id}` };
        },

        // Create teacher with required email and de-dupe by email
        create: async (api, payload) => {
          try {
            const email = String(payload.email).trim();

            // Build base user data for /adduser
            const userData = {
              first_name: payload.first_name,
              last_name: payload.last_name,
              contact_number: payload.contact_number || null,
              state: payload.state || null,            // VARCHAR on users.state
              status: "active",
              role_id: 3,                              // Teacher role
              password: "TemporaryPassword123!",       // backend can force reset later
              isActive: true,
              email,                                   // email is required
              class_id: payload.class_id,
            };

            // Try to reuse existing user by email
            try {
              const checkUserRes = await api.get(`/users`);
              const allUsers = Array.isArray(checkUserRes.data)
                ? checkUserRes.data
                : (checkUserRes.data?.data || []);
              const existingUser = allUsers.find(
                (u) => u?.email && u.email.toLowerCase() === email.toLowerCase()
              );

              if (existingUser?.id) {
                // Is this user already a teacher?
                try {
                  const teacherCheckRes = await api.get(`/allteachers`);
                  const maybeArr = Array.isArray(teacherCheckRes.data)
                    ? teacherCheckRes.data
                    : (teacherCheckRes.data?.data || []);
                  const existingTeacher = maybeArr.find(
                    (t) => t?.user_id === existingUser.id || t?.user?.id === existingUser.id
                  );

                  if (existingTeacher?.id) {
                    // Short-circuit: return existing teacher
                    return {
                      data: {
                        id: existingTeacher.id,
                        message: "A teacher with this email already exists.",
                      },
                    };
                  }
                } catch (e) {
                  // If this check fails, continue to create the teacher record
                  console.warn("Teacher existence check failed, proceeding:", e);
                }

                // Create teacher record linked to the existing user
                try {
                  const teacherRes = await api.post(`/addteacher`, {
                    user_id: existingUser.id,
                    class_id: payload.class_id,
                    created_by: 1,
                  });

                  const newTeacherId =
                    teacherRes?.data?.id ||
                    teacherRes?.data?.teacher?.id ||
                    teacherRes?.data?.data?.id;

                  if (!newTeacherId) {
                    throw new Error("Teacher was created but no ID returned.");
                  }

                  return { data: { id: newTeacherId } };
                } catch (teacherError) {
                  // Handle 409 Conflict - teacher already exists
                  if (teacherError?.response?.status === 409) {
                    const existingTeacher = teacherError?.response?.data?.teacher;
                    if (existingTeacher?.id) {
                      return { data: { id: existingTeacher.id } };
                    }
                  }
                  throw teacherError;
                }
              }
            } catch (e) {
              console.warn("User lookup failed, will create new user:", e);
            }

            // Create a new user
            const userRes = await api.post(`/adduser`, userData);
            const createdUser =
              userRes?.data?.user || userRes?.data?.data || userRes?.data;

            if (!createdUser?.id) {
              throw new Error("Failed to create user account.");
            }

            // Check if teacher already exists before creating
            try {
              const teachersRes = await api.get(`/allteachers`);
              const teachers = Array.isArray(teachersRes.data) ? teachersRes.data : (teachersRes.data?.data || []);
              const existingTeacher = teachers.find(
                t => t.user_id === createdUser.id || t?.user?.id === createdUser.id
              );
              
              if (existingTeacher?.id) {
                return { data: { id: existingTeacher.id } };
              }
            } catch (checkError) {
              // Continue to create teacher
            }

            // Create the teacher linked to that user
            try {
              const teacherRes = await api.post(`/addteacher`, {
                user_id: createdUser.id,
                class_id: payload.class_id,
                created_by: 1,
              });

              const teacherId =
                teacherRes?.data?.id ||
                teacherRes?.data?.teacher?.id ||
                teacherRes?.data?.data?.id;

              if (!teacherId) {
                throw new Error("Failed to create teacher profile.");
              }

              return { data: { id: teacherId } };
            } catch (teacherError) {
              // Handle 409 Conflict - teacher already exists
              if (teacherError?.response?.status === 409) {
                const existingTeacher = teacherError?.response?.data?.teacher;
                if (existingTeacher?.id) {
                  return { data: { id: existingTeacher.id } };
                }
                
                // Final fallback: search again
                try {
                  const teachersRes = await api.get(`/allteachers`);
                  const teachers = Array.isArray(teachersRes.data) ? teachersRes.data : (teachersRes.data?.data || []);
                  const existingTeacherFromSearch = teachers.find(
                    t => t.user_id === createdUser.id || t?.user?.id === createdUser.id
                  );
                  
                  if (existingTeacherFromSearch?.id) {
                    return { data: { id: existingTeacherFromSearch.id } };
                  }
                } catch (searchError) {
                  console.warn("Failed to search for existing teacher:", searchError);
                }
              }
              throw teacherError;
            }
          } catch (error) {
            console.error("Error in teacher creation:", error);

            const msg =
              error?.response?.data?.message ||
              error?.message ||
              "Failed to create teacher. Please try again.";

            // Friendlier duplicate email message if applicable
            if (typeof msg === "string" && msg.toLowerCase().includes("already exists")) {
              throw new Error("This email is already registered. Please use a different email address.");
            }
            throw new Error(msg);
          }
        },

        // Email is now required
        requiredKeys: ["first_name", "last_name", "email", "class_id"],
      }}

      fields={[
        { name: "first_name", label: "First Name", placeholder: "Enter teacher's first name", rules: [{ required: true }] },
        { name: "last_name", label: "Last Name", placeholder: "Enter teacher's last name", rules: [{ required: true }] },

        // REQUIRED email
        {
          name: "email",
          label: "Email",
          rules: [
            { required: true, message: "Email is required" },
            { type: "email", message: "Please enter a valid email" }
          ],
          placeholder: "teacher@example.com",
        },

        { 
          name: "contact_number", 
          label: "Phone Number", 
          placeholder: "+49 30 12345678",
          rules: [
            { 
              pattern: /^(\+49|0)[1-9]\d{1,14}$/, 
              message: "Please enter a valid German phone number (e.g., +49 30 12345678 or 030 12345678)" 
            }
          ]
        },

        // Class assignment (REQUIRED)
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
        },

        // users.state is a string (state name)
        {
          name: "state",
          label: "State",
          input: "select",
          placeholder: "Search state…",
          optionsUrl: "/states",
          serverSearch: true,
          autoloadOptions: true,
          searchParam: "q",
          transform: (it) => ({
            value: it?.state_name ?? it?.name ?? String(it ?? ""),
            label: it?.state_name ?? it?.name ?? String(it ?? ""),
          }),
        },
      ]}

      transformSubmit={(vals) => {
        const out = {
          first_name: vals.first_name?.trim(),
          last_name: vals.last_name?.trim(),
          email: vals.email?.trim(), // email is required
          contact_number: vals.contact_number?.replace(/\s/g, '') || null, // remove spaces
          state: vals.state || null,
          class_id: vals.class_id,
        };
        // Strip nullish
        Object.keys(out).forEach((k) => {
          if (out[k] == null) delete out[k];
        });
        return out;
      }}
    />
  );
}
