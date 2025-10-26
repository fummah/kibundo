// Temporary localStorage-based task management until backend endpoints are available
const TASKS_KEY = 'kibundo_tasks';

export async function listTasks(params = {}) {
  try {
    const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
    
    // Apply filters
    let filteredTasks = tasks;
    if (params.status) {
      filteredTasks = filteredTasks.filter(task => task.status === params.status);
    }
    if (params.priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === params.priority);
    }
    if (params.assignee_id) {
      filteredTasks = filteredTasks.filter(task => task.assignee_id === params.assignee_id);
    }
    
    return filteredTasks;
  } catch (error) {
    console.error('Error listing tasks:', error);
    return [];
  }
}

export async function getTask(id) {
  try {
    const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
    return tasks.find(task => task.id === parseInt(id));
  } catch (error) {
    console.error('Error getting task:', error);
    return null;
  }
}

export async function createTask(data) {
  try {
    const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
    const newTask = {
      id: Date.now(), // Simple ID generation
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    tasks.push(newTask);
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    return newTask;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

export async function updateTask(id, data) {
  try {
    const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
    const taskIndex = tasks.findIndex(task => task.id === parseInt(id));
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...data,
      updated_at: new Date().toISOString()
    };
    
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    return tasks[taskIndex];
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

export async function deleteTask(id) {
  try {
    const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
    const filteredTasks = tasks.filter(task => task.id !== parseInt(id));
    localStorage.setItem(TASKS_KEY, JSON.stringify(filteredTasks));
    return { message: 'Task deleted successfully' };
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}