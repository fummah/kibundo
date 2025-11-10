import api from "@/api/axios";

/**
 * Resolve the AI agent assigned to the current student based on grade/state.
 * Falls back to the global child_default_ai setting if no specific agent matches.
 *
 * @returns {Promise<{name: string, id?: number|null, grade?: string|number|null, state?: string|null, entities?: string[]}|null>}
 */
export async function resolveStudentAgent() {
  try {
    const token =
      localStorage.getItem("kibundo_token") ||
      sessionStorage.getItem("kibundo_token");

    if (!token) {
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
        validateStatus: (status) => status < 500,
        withCredentials: true,
      });

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
      console.debug(
        "resolveStudentAgent: filtered agents fetch failed",
        err?.message || err
      );
    }

    // Fallback to global default AI settings
    try {
      const resp = await api.get("/aisettings", {
        validateStatus: (status) => status < 500,
        withCredentials: true,
      });
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
      console.debug(
        "resolveStudentAgent: fallback /aisettings failed",
        err?.message || err
      );
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

