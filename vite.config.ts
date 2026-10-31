import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://<user>.github.io/biblical-kingdoms-map/ on GitHub Pages.
export default defineConfig({
  base: "/biblical-kingdoms-map/",
  plugins: [react()],
  build: { chunkSizeWarningLimit: 2000 },
});
