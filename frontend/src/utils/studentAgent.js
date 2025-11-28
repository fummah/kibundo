import api from "@/api/axios";

/**
 * Resolve the AI agent assigned to the current student based on grade/state.
 * Falls back to the global child_default_ai setting if no specific agent matches.
 *
 * @returns {Promise<{name: string, id?: number|null, grade?: string|number|null, state?: string|null, entities?: string[]}|null>}
 */
export async function resolveStudentAgent() {
  try {
    // Check for tokens in both admin (localStorage) and portal (sessionStorage) locations
    const adminToken = localStorage.getItem("kibundo_token") || localStorage.getItem("token");
    const portalToken = sessionStorage.getItem("portal.token");
    const token = adminToken || portalToken;

    // If no token found, return default immediately (no API call needed)
    if (!token) {
      return {
        name: "Kibundo",
        id: null,
        grade: null,
        state: null,
        entities: [],
      };
    }

    // Check if we're on a student route - if not, don't make API calls
    const currentPath = window?.location?.pathname || "";
    const isStudentRoute = /^\/(student|parent)\b/i.test(currentPath);
    
    // If not on a student/parent route, return default without API call
    if (!isStudentRoute) {
      return {
        name: "Kibundo",
        id: null,
        grade: null,
        state: null,
        entities: [],
      };
    }

    // Attempt to fetch grade/state filtered agents
    try {
      const resp = await api.get("/student/agents", {
        validateStatus: (status) => status < 500, // Allow 401, 403, 404, etc. but not 500+
        withCredentials: true,
        meta: {
          redirectOn401: false, // Don't redirect on 401, just return default
          toastNetwork: false, // Don't show toast for network errors
        },
      });

      // Handle 401 gracefully - user might not be authenticated yet
      if (resp?.status === 401 || resp?.status === 403) {
        // Silently return default - this is expected when not authenticated
        return {
          name: "Kibundo",
          id: null,
          grade: null,
          state: null,
          entities: [],
        };
      }

      if (Array.isArray(resp?.data) && resp.data.length > 0) {
        const agent = resp.data[0];
        const name =
          agent?.name || agent?.agent_name || agent?.agentName || null;
        if (name) {
          return {
            id: agent?.id ?? null,
            name,
            grade: agent?.grade ?? null,
            state: agent?.state ?? null,
            entities:
              Array.isArray(agent?.entities)
                ? agent.entities
                : Array.isArray(agent?.prompts?.entities)
                ? agent.prompts.entities
                : [],
          };
        }
      }
    } catch (err) {
      // Silently handle 401/403 errors - they're expected when not authenticated
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // Return default silently
        return {
          name: "Kibundo",
          id: null,
          grade: null,
          state: null,
          entities: [],
        };
      }
      // Only log unexpected errors
      if (status && status >= 500) {
        console.debug(
          "resolveStudentAgent: filtered agents fetch failed",
          err?.message || err
        );
      }
    }

    // Fallback to global default AI settings
    try {
      const resp = await api.get("/aisettings", {
        validateStatus: (status) => status < 500, // Allow 401, 403, 404, etc. but not 500+
        withCredentials: true,
        meta: {
          redirectOn401: false, // Don't redirect on 401, just return default
          toastNetwork: false, // Don't show toast for network errors
        },
      });

      // Handle 401/403 gracefully
      if (resp?.status === 401 || resp?.status === 403) {
        // Silently return default - this is expected when not authenticated
        return {
          name: "Kibundo",
          id: null,
          grade: null,
          state: null,
          entities: [],
        };
      }

      if (resp?.data?.child_default_ai) {
        if (resp.data.child_default_ai) {
          return {
            name: resp.data.child_default_ai,
            id: null,
            grade: null,
            state: null,
            entities: [],
          };
        }
      }
    } catch (err) {
      // Silently handle 401/403 errors - they're expected when not authenticated
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // Return default silently
        return {
          name: "Kibundo",
          id: null,
          grade: null,
          state: null,
          entities: [],
        };
      }
      // Only log unexpected errors
      if (status && status >= 500) {
        console.debug(
          "resolveStudentAgent: fallback /aisettings failed",
          err?.message || err
        );
      }
    }
  } catch (outerErr) {
    console.debug(
      "resolveStudentAgent: token lookup failed",
      outerErr?.message || outerErr
    );
  }
  return {
    name: "Kibundo",
    id: null,
    grade: null,
    state: null,
    entities: [],
  };
}

