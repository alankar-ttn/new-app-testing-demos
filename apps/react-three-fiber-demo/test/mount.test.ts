import { afterEach, expect, test } from "bun:test"
import { mountPrefix, mountedOutputDir, viteBase } from "../src/mount"

const previousBase = process.env.DEMO_BASE_PATH
const previousVercel = process.env.VERCEL

afterEach(() => {
  restore("DEMO_BASE_PATH", previousBase)
  restore("VERCEL", previousVercel)
})

function restore(name: "DEMO_BASE_PATH" | "VERCEL", value: string | undefined): void {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

test("local dev stays at the site root", () => {
  delete process.env.DEMO_BASE_PATH
  delete process.env.VERCEL
  expect(mountPrefix()).toBe("")
  expect(viteBase()).toBe("/")
  expect(mountedOutputDir(viteBase())).toBeNull()
})

test("an explicit base path overrides the Vercel mount", () => {
  process.env.DEMO_BASE_PATH = "/"
  process.env.VERCEL = "1"
  expect(mountPrefix()).toBe("")
  expect(viteBase()).toBe("/")
})

test("Vercel serves the demo under its stable path", () => {
  delete process.env.DEMO_BASE_PATH
  process.env.VERCEL = "1"
  expect(mountPrefix()).toBe("/demos/react-three-fiber-demo")
  expect(viteBase()).toBe("/demos/react-three-fiber-demo/")
  expect(mountedOutputDir(viteBase())).toBe("demos/react-three-fiber-demo")
})
