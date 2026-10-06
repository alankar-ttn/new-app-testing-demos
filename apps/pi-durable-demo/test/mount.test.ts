import { afterEach, expect, test } from "bun:test"
import { mountPrefix, stripMount, viteBase } from "../src/mount"
import { withBase } from "../src/with-base"

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
  expect(stripMount("/api/state")).toBe("/api/state")
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
  expect(mountPrefix()).toBe("/demos/pi-durable-demo")
  expect(viteBase()).toBe("/demos/pi-durable-demo/")
  expect(stripMount("/demos/pi-durable-demo")).toBe("/")
  expect(stripMount("/demos/pi-durable-demo/api/start")).toBe("/api/start")
  expect(stripMount("/other")).toBe("/other")
})

test("withBase keeps api urls on the mounted path", () => {
  expect(withBase("/", "api/events")).toBe("/api/events")
  expect(withBase("/demos/pi-durable-demo/", "/api/kill")).toBe("/demos/pi-durable-demo/api/kill")
})
