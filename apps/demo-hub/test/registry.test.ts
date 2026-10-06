import { readFileSync } from "node:fs"
import { expect, test } from "bun:test"
import { demoEntries, demoPath, serviceName } from "../src/registry"
import { buildVercelConfig } from "../src/vercel-config"

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
  }
  expect(committed).toEqual(buildVercelConfig(demoEntries))
  for (const service of Object.values(committed.services)) {
    expect(service).not.toHaveProperty("bunVersion")
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
  }
})
