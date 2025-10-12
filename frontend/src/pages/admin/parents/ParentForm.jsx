import EntityForm from "@/components/form/EntityForm";

export default function ParentForm() {
  return (
    <EntityForm
      titleNew="Add Parent"
      titleEdit="Edit Parent"
      submitLabel="Save"
      toDetailRelative={(id) => `/admin/parents/${id}`}
      apiCfg={{
        // Detail path (you already have GET /parent/:id)
        getPath: (id) => `/parent/${id}`,

        // Create parent with optional email and de-dupe by email if present
        create: async (api, payload) => {
          try {
            const hasEmail = !!(payload.email && String(payload.email).trim());
            const email = hasEmail ? String(payload.email).trim() : null;

            // Build base user data for /adduser
            const userData = {
              first_name: payload.first_name,
              last_name: payload.last_name,
              contact_number: payload.contact_number || null,
              state: payload.state || null,            // VARCHAR on users.state
              status: "active",
              role_id: 2,                              // Parent role
              password: "TemporaryPassword123!",       // backend can force reset later
              isActive: true,
              ...(email ? { email } : {}),             // include only if provided
            };

            // If we have an email, try to reuse existing user
            if (email) {
              try {
                const checkUserRes = await api.get(`/users`);
                const allUsers = Array.isArray(checkUserRes.data)
                  ? checkUserRes.data
                  : (checkUserRes.data?.data || []);
                const existingUser = allUsers.find(
                  (u) => u?.email && u.email.toLowerCase() === email.toLowerCase()
                );

                if (existingUser?.id) {
                  // Is this user already a parent?
                  try {
                    const parentCheckRes = await api.get(`/parents?user_id=${existingUser.id}`);
                    const maybeArr = Array.isArray(parentCheckRes.data)
                      ? parentCheckRes.data
                      : (parentCheckRes.data?.data || []);
                    const existingParent = Array.isArray(maybeArr) ? maybeArr[0] : maybeArr;

                    if (existingParent?.id) {
                      // Short-circuit: return existing parent
                      return {
                        data: {
                          id: existingParent.id,
                          message: "A parent with this email already exists.",
                        },
                      };
                    }
                  } catch (e) {
                    // If this check fails, continue to create the parent record
                    console.warn("Parent existence check failed, proceeding:", e);
                  }

                  // Create parent record linked to the existing user
                  try {
                    const parentRes = await api.post(`/addparent`, {
                      user_id: existingUser.id,
                      created_by: 1,
                    });

                    const newParentId =
                      parentRes?.data?.id ||
                      parentRes?.data?.parent?.id ||
                      parentRes?.data?.data?.id;

                    if (!newParentId) {
                      throw new Error("Parent was created but no ID returned.");
                    }

                    return { data: { id: newParentId } };
                  } catch (parentError) {
                    // Handle 409 Conflict - parent already exists
                    if (parentError?.response?.status === 409) {
                      const existingParent = parentError?.response?.data?.parent;
                      if (existingParent?.id) {
                        return { data: { id: existingParent.id } };
                      }
                    }
                    throw parentError;
                  }
                }
              } catch (e) {
           
              }
            }

            // Create a new user (works for no-email too)
            const userRes = await api.post(`/adduser`, userData);
            const createdUser =
              userRes?.data?.user || userRes?.data?.data || userRes?.data;

            if (!createdUser?.id) {
              throw new Error("Failed to create user account.");
            }

            // Check if parent already exists before creating
            try {
              const parentsRes = await api.get(`/parents?user_id=${createdUser.id}`);
              const parents = Array.isArray(parentsRes.data) ? parentsRes.data : (parentsRes.data?.data || []);
              const existingParent = parents.find(p => p.user_id === createdUser.id);
              
              if (existingParent?.id) {
              
                return { data: { id: existingParent.id } };
              }
            } catch (checkError) {
             
            }

            // Create the parent linked to that user
            try {
              const parentRes = await api.post(`/addparent`, {
                user_id: createdUser.id,
                created_by: 1,
              });

              const parentId =
                parentRes?.data?.id ||
                parentRes?.data?.parent?.id ||
                parentRes?.data?.data?.id;

              if (!parentId) {
                throw new Error("Failed to create parent profile.");
              }

              return { data: { id: parentId } };
            } catch (parentError) {
              // Handle 409 Conflict - parent already exists (shouldn't happen with check above)
              if (parentError?.response?.status === 409) {
             
                const existingParent = parentError?.response?.data?.parent;
                if (existingParent?.id) {
                  return { data: { id: existingParent.id } };
                }
                
                // Final fallback: search again
                try {
                  const parentsRes = await api.get(`/parents?user_id=${createdUser.id}`);
                  const parents = Array.isArray(parentsRes.data) ? parentsRes.data : (parentsRes.data?.data || []);
                  const existingParentFromSearch = parents.find(p => p.user_id === createdUser.id);
                  
                  if (existingParentFromSearch?.id) {
                    return { data: { id: existingParentFromSearch.id } };
                  }
                } catch (searchError) {
                  console.warn("Failed to search for existing parent:", searchError);
                }
              }
              throw parentError;
            }
          } catch (error) {
            console.error("Error in parent creation:", error);

            const msg =
              error?.response?.data?.message ||
              error?.message ||
              "Failed to create parent. Please try again.";

            // Friendlier duplicate email message if applicable
            if (typeof msg === "string" && msg.toLowerCase().includes("already exists")) {
              throw new Error("This email is already registered. Please use a different email address.");
            }
            throw new Error(msg);
          }
        },

        // No email required
        requiredKeys: ["first_name", "last_name"],
      }}

      fields={[
        { name: "first_name", label: "First name", rules: [{ required: true }] },
        { name: "last_name", label: "Last name", rules: [{ required: true }] },

        // OPTIONAL email
        {
          name: "email",
          label: "Email",
          rules: [{ type: "email" }],
          placeholder: "Optional",
        },

        { name: "contact_number", label: "Phone number", placeholder: "+27 82 123 4567" },

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
        const trimmedEmail = vals.email && String(vals.email).trim();
        const out = {
          first_name: vals.first_name?.trim(),
          last_name: vals.last_name?.trim(),
          ...(trimmedEmail ? { email: trimmedEmail } : {}), // omit empty email
          contact_number: vals.contact_number || null,
          state: vals.state || null,
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
