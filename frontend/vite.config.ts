import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Dev server proxies API calls to the FastAPI backend so the browser sees a single origin.
// Set KX_API_URL to point at a backend on another port (default http://127.0.0.1:8000).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { "/api": env.KX_API_URL || "http://127.0.0.1:8000" },
    },
  };
});
