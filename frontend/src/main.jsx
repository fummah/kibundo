import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// 🔐 Auth Context
import { AuthProvider } from "./context/AuthContext";

// ✅ React Query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools"; // optional

import "react-toastify/dist/ReactToastify.css";
import "antd/dist/reset.css";
import "./index.css";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AppTheme from "./AppTheme.jsx";

// 🌍 i18n
import "./i18n"; // <-- 👈 add this line to initialize translations

// 🌙 Dark mode persistence
const theme = localStorage.getItem("theme");
if (theme === "dark") document.documentElement.classList.add("dark");
else document.documentElement.classList.remove("dark");

// 🌍 i18n language persistence
const lang = localStorage.getItem("i18nextLng") || "en";
document.documentElement.lang = lang;

// ✅ Create a single QueryClient for the app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000, // 1 minute
    },
    mutations: { retry: 0 },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <AppTheme>
              <App />
            </AppTheme>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
