// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { unstable_HistoryRouter as HistoryRouter } from "react-router-dom";
import { createBrowserHistory } from "history";
export const history = createBrowserHistory();

import { AuthProvider } from "./context/AuthContext";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import "react-toastify/dist/ReactToastify.css";
import "antd/dist/reset.css";
import { App as AntdApp } from "antd";
import "./index.css";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AppTheme from "./AppTheme.jsx";

import "./i18n";

// Dark mode persistence
const theme = localStorage.getItem("theme");
if (theme === "dark") document.documentElement.classList.add("dark");
else document.documentElement.classList.remove("dark");

// i18n language persistence
const lang = localStorage.getItem("i18nextLng") || "de";
document.documentElement.lang = lang;

// Single QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60_000 },
    mutations: { retry: 0 },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HistoryRouter
        history={history}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
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
