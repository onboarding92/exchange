import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Vite config compatibile con ambiente CJS (niente plugin-react-swc)
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
  },
});
