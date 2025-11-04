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

// Suppress hCaptcha errors from external sources (browser extensions, third-party services)
if (typeof window !== "undefined") {
  // Suppress console errors
  const originalError = console.error;
  console.error = function (...args) {
    const message = args.join(" ");
    // Suppress hCaptcha errors
    if (message.includes("hcaptcha") || message.includes("api.hcaptcha.com") || message.includes("hcaptcha.html")) {
      return;
    }
    // Suppress Stripe checkout iframe errors (they're from Stripe's code, not ours)
    if (message.includes("Cannot find module './en'") || 
        message.includes("cs_test_") || 
        message.includes("stripe.com") ||
        message.includes("checkout.stripe.com")) {
      return;
    }
    originalError.apply(console, args);
  };

  // Suppress console warnings
  const originalWarn = console.warn;
  console.warn = function (...args) {
    const message = args.join(" ");
    if (message.includes("hcaptcha") || message.includes("api.hcaptcha.com") || message.includes("hcaptcha.html")) {
      return;
    }
    // Suppress Stripe checkout warnings
    if (message.includes("stripe.com") || message.includes("checkout.stripe.com") || message.includes("cs_test_")) {
      return;
    }
    originalWarn.apply(console, args);
  };

  // Suppress global error events
  window.addEventListener("error", (event) => {
    const message = event.message || "";
    const filename = event.filename || "";
    const src = event.target?.src || "";
    
    // Suppress hCaptcha errors
    if (
      message.includes("hcaptcha") ||
      filename.includes("hcaptcha") ||
      src.includes("api.hcaptcha.com") ||
      filename.includes("hcaptcha.html")
    ) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
    
    // Suppress Stripe checkout iframe errors
    if (
      message.includes("Cannot find module") ||
      message.includes("cs_test_") ||
      filename.includes("stripe.com") ||
      filename.includes("checkout.stripe.com") ||
      src.includes("stripe.com") ||
      src.includes("checkout.stripe.com")
    ) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);

  // Suppress unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason?.message || event.reason?.toString() || "";
    // Suppress hCaptcha errors
    if (reason.includes("hcaptcha") || reason.includes("api.hcaptcha.com")) {
      event.preventDefault();
      return false;
    }
    // Suppress Stripe checkout errors
    if (reason.includes("Cannot find module") || reason.includes("cs_test_") || reason.includes("stripe.com")) {
      event.preventDefault();
      return false;
    }
  });

  // Intercept fetch requests to hCaptcha (if they're going through fetch)
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = args[0]?.toString() || "";
    if (url.includes("api.hcaptcha.com") || url.includes("hcaptcha")) {
      // Return a rejected promise silently
      return Promise.reject(new Error("hCaptcha request blocked"));
    }
    return originalFetch.apply(this, args);
  };

  // Intercept XMLHttpRequest (if they're using XHR)
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (typeof url === "string" && (url.includes("api.hcaptcha.com") || url.includes("hcaptcha"))) {
      // Cancel the request by overriding send
      this.send = function () {};
      return;
    }
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };
}

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
