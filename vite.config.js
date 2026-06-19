import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative base so the build works under any GitHub Pages sub-path.
  base: "./",
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
