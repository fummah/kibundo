// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_BACKEND_URL || "http://localhost:3001";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      proxy: {
        // Frontend -> /api/... will be proxied to your backend
        "/api": {
          target: backend,
          changeOrigin: true,
          secure: false,
          // If your backend does NOT have the /api prefix, uncomment:
          // rewrite: (p) => p.replace(/^\/api/, ""),
        },
      },
    },
  };
});
