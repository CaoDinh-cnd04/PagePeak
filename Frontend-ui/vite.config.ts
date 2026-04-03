import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      ".ngrok-free.dev",
      ".ngrok-free.app",
      ".ngrok.io",
      ".loca.lt",
    ],
    // Proxy /api tới backend (port 5000) khi dev — SPA gọi API và OnePay callback/confirm.
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
