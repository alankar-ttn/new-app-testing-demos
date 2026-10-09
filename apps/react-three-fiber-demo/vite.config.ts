import { cpSync, mkdirSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { mountedOutputDir, viteBase } from "./src/mount"

function mirrorMountedBase(): Plugin {
  let root = process.cwd()
  let outDir = "dist"
  let base = "/"
  return {
    name: "mirror-mounted-base",
    apply: "build",
    configResolved(config) {
      root = config.root
      outDir = config.build.outDir
      base = config.base
    },
    closeBundle() {
      const nested = mountedOutputDir(base)
      if (!nested) return
      const dist = resolve(root, outDir)
      const entries = readdirSync(dist)
      const target = resolve(dist, nested)
      mkdirSync(target, { recursive: true })
      const skip = nested.split("/")[0] ?? ""
      for (const entry of entries) {
        if (entry === skip) continue
        cpSync(resolve(dist, entry), resolve(target, entry), { recursive: true })
      }
    },
  }
}

export default defineConfig({
  base: viteBase(),
  plugins: [react(), tailwindcss(), mirrorMountedBase()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
    strictPort: true,
    host: "127.0.0.1",
  },
})
