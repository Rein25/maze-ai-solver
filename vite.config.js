import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/hva/maze-ai-solver/",
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
});
