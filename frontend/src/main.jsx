// src/main.jsx (or src/index.jsx)
import React from "react";
import ReactDOM from "react-dom/client";
import { unstable_HistoryRouter as HistoryRouter } from "react-router-dom";
import { createBrowserHistory } from "history";

// 🔁 Custom history for navigation outside components
export const history = createBrowserHistory();

// 🔐 Auth Context
import { AuthProvider } from "./context/AuthContext";

// ✅ React Query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools"; // optional

import "react-toastify/dist/ReactToastify.css";
import "antd/dist/reset.css";
import { App as AntdApp } from "antd";
import "./index.css";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AppTheme from "./AppTheme.jsx";

// 🌍 i18n
import "./i18n"; // initialize translations

// 🌙 Dark mode persistence
const theme = localStorage.getItem("theme");
if (theme === "dark") document.documentElement.classList.add("dark");
else document.documentElement.classList.remove("dark");

// 🌍 i18n language persistence
const lang = localStorage.getItem("i18nextLng") || "en";
document.documentElement.lang = lang;

// ✅ Single QueryClient for the app
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
      <HistoryRouter
        history={history}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <ErrorBoundary>
            <AppTheme>
              <AntdApp>
                <App />
              </AntdApp>
            </AppTheme>
          </ErrorBoundary>
        </AuthProvider>
      </HistoryRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
