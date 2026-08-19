import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4174",
      "/media": "http://127.0.0.1:4174"
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
