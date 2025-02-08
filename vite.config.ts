import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: path.resolve(__dirname, "./ui"),
  envDir: path.resolve(__dirname, "./"),
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(__dirname, "./"),
      },
    ],
  },
});
