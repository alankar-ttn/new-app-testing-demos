import { readFileSync } from "node:fs"
import { expect, test } from "bun:test"
import { demoEntries, demoPath, serviceName } from "../src/registry"
import { buildVercelConfig, INCLUDE_FILES_MAX_LENGTH } from "../src/vercel-config"

test("registry entries point at stable demo paths", () => {
  expect(demoEntries.length).toBeGreaterThan(0)
  for (const demo of demoEntries) {
    expect(demo.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(demo.name.length).toBeGreaterThan(0)
    expect(demo.description.length).toBeGreaterThan(0)
    expect(demoPath(demo.slug)).toBe(`/demos/${demo.slug}/`)
    expect(serviceName(demo.slug)).toMatch(/^[a-z][a-z0-9_]*[a-z0-9]$/)
  }
})

test("root vercel.json matches the registry", () => {
  const vercelPath = new URL("../../../vercel.json", import.meta.url)
  const committed = JSON.parse(readFileSync(vercelPath, "utf8")) as {
    services: Record<string, Record<string, unknown>>
    rewrites: { source: string }[]
  }
  expect(committed).toEqual(buildVercelConfig(demoEntries))
  for (const service of Object.values(committed.services)) {
    expect(service).not.toHaveProperty("bunVersion")
  }
  expect(committed.rewrites.at(-1)?.source).toBe("/(.*)")
  for (const rewrite of committed.rewrites.slice(0, -1)) {
    expect(rewrite.source.startsWith("/demos/")).toBe(true)
  }
})

test("bun services keep bunVersion on the app vercel.json", () => {
  const config = buildVercelConfig(demoEntries)
  for (const demo of demoEntries) {
    if (demo.framework !== "bun") continue
    const service = config.services[serviceName(demo.slug)]
    expect(service?.framework).toBe("bun")
    expect(service).not.toHaveProperty("bunVersion")
    const appConfig = JSON.parse(
      readFileSync(new URL(`../../../apps/${demo.slug}/vercel.json`, import.meta.url), "utf8"),
    ) as { bunVersion?: string; framework?: string }
    expect(appConfig.framework).toBe("bun")
    expect(appConfig.bunVersion).toBe("1.x")
    expect(service?.entrypoint).toBe("src/server.ts")
    const includeFiles = service?.functions?.["src/server.ts"]?.includeFiles ?? ""
    expect(includeFiles.length).toBeLessThanOrEqual(INCLUDE_FILES_MAX_LENGTH)
    expect(includeFiles.replace(/\{[^}]*\}/g, "")).not.toContain(",")
    const glob = new Bun.Glob(includeFiles)
    for (const base of ["", `apps/${demo.slug}/`]) {
      expect(glob.match(`${base}dist/index.html`)).toBe(true)
      expect(glob.match(`${base}src/server.ts`)).toBe(true)
    }
    expect(glob.match("apps/other-demo/dist/index.html")).toBe(false)
    const lruNode = `apps/${demo.slug}/node_modules/lru-cache/dist/esm/node/index.min.js`
    const lruCjsNode = `apps/${demo.slug}/node_modules/lru-cache/dist/commonjs/node/index.min.js`
    if (demo.slug === "mastra-agent-demo") {
      expect(glob.match(lruNode)).toBe(true)
      expect(glob.match(lruCjsNode)).toBe(true)
      expect(glob.match(`apps/${demo.slug}/node_modules/lru-cache/dist/esm/index.min.js`)).toBe(false)
    } else {
      expect(includeFiles).not.toContain("lru-cache")
    }
    const pkg = JSON.parse(
      readFileSync(new URL(`../../../apps/${demo.slug}/package.json`, import.meta.url), "utf8"),
    ) as { engines?: { bun?: string } }
    expect(pkg.engines?.bun).toBe("1.x")
  }
})

test("vite services serve mounted assets from the static build", () => {
  const config = buildVercelConfig(demoEntries)
  const viteDemos = demoEntries.filter((demo) => demo.framework === "vite")
  expect(viteDemos.length).toBeGreaterThan(0)
  for (const demo of viteDemos) {
    const service = config.services[serviceName(demo.slug)]
    expect(service?.framework).toBe("vite")
    expect(service?.outputDirectory).toBe("dist")
    expect(service?.functions).toBeUndefined()
    const rewrites = service?.rewrites ?? []
    const asset = rewrites.find((rewrite) => rewrite.source === `/demos/${demo.slug}/assets/:path*`)
    expect(asset?.destination).toBe("/assets/:path*")
    expect(rewrites.some((rewrite) => rewrite.destination === "/index.html")).toBe(true)
    expect(rewrites.at(-1)?.source).toBe("/(.*)")
    expect(rewrites.at(-1)?.destination).toBe("/index.html")
  }
})
