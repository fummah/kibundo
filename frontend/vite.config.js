import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_BACKEND_URL || "http://localhost:8080";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
      // Ensure extension-less imports like "@/components/X" resolve to .jsx/.tsx too
      extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
    },
    define: {
      // Make VITE_* envs available at build time if you need them in code
      "import.meta.env.VITE_BACKEND_URL": JSON.stringify(env.VITE_BACKEND_URL || ""),
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
        // Frontend -> /uploads/... will be proxied to your backend
        "/uploads": {
          target: backend,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      target: "esnext", // ✅ allows top-level await
      minify: "esbuild", // safe minifier
      sourcemap: false,  // optional: disable source maps in production
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "esnext", // ✅ ensures dependencies allow top-level await
      },
    },
  };
});