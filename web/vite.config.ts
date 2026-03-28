import path from "node:path";
import react from "@vitejs/plugin-react";
import { skybridge } from "skybridge/web";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), skybridge() as PluginOption, react()],
  root: __dirname,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
