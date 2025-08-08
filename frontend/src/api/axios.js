import axios from "axios";
import { message } from "antd"; // Or use react-hot-toast if preferred

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // e.g., http://localhost:5000/api
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Request Interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Response Interceptor: handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // ❌ Unauthorized (token expired or invalid)
      message.error("Session expired. Please log in again.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setTimeout(() => {
        window.location.href = "/signin";
      }, 1000);
    }

    return Promise.reject(error);
  }
);

export default api;
