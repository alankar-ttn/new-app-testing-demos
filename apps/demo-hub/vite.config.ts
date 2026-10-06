import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { piPort, tanstackPort } from "./scripts/ports"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      "/demos/tanstack-start-demo": {
        target: `http://127.0.0.1:${tanstackPort}`,
        ws: true,
        changeOrigin: true,
      },
      "/demos/pi-durable-demo": {
        target: `http://127.0.0.1:${piPort}`,
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
