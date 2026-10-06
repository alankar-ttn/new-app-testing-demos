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
  const committed = JSON.parse(readFileSync(vercelPath, "utf8")) as unknown
  expect(committed).toEqual(buildVercelConfig(demoEntries))
})
