// Real API calls for task management
import api from "@/api/axios";

export async function listTasks(params = {}) {
  try {
    const response = await api.get("/api/tasks", { 
      params,
      withCredentials: true 
    });
    return response.data.tasks || [];
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return [];
  }
}

export async function getTask(id) {
  try {
    const response = await api.get(`/api/tasks/${id}`, { 
      withCredentials: true 
    });
    return response.data.task || {};
  } catch (error) {
    console.error("Failed to fetch task:", error);
    return {};
  }
}

export async function createTask(payload) {
  try {
    const response = await api.post("/api/tasks", payload, { 
      withCredentials: true 
    });
    return response.data.task;
  } catch (error) {
    console.error("Failed to create task:", error);
    throw error;
  }
}

export async function updateTask(id, payload) {
  try {
    const response = await api.put(`/api/tasks/${id}`, payload, { 
      withCredentials: true 
    });
    return response.data.task;
  } catch (error) {
    console.error("Failed to update task:", error);
    throw error;
  }
}

export async function deleteTask(id) {
  try {
    await api.delete(`/api/tasks/${id}`, { 
      withCredentials: true 
    });
    return true;
  } catch (error) {
    console.error("Failed to delete task:", error);
    throw error;
  }
}