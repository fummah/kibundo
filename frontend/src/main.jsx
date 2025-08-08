import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// 🔐 Auth Context
import { AuthProvider } from "./context/AuthContext";

import "react-toastify/dist/ReactToastify.css";
import "antd/dist/reset.css"; // ✅ Ant Design reset
import "./index.css";         // ✅ Tailwind base styles

import App from "./App";      // 📦 Your main app

// 🌙 Dark mode persistence
const theme = localStorage.getItem("theme");
if (theme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

// 🌍 i18n language persistence
const lang = localStorage.getItem("i18nextLng") || "en";
document.documentElement.lang = lang;

// 🚀 App mount
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
