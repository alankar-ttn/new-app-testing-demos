import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteBase } from "./src/mount"

export default defineConfig({
  base: viteBase(),
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
})
