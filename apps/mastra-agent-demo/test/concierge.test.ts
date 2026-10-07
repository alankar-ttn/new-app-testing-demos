import { afterEach, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { openDesk } from "../src/mastra/desk"
import { searchKnowledge } from "../src/mastra/knowledge"
import { decideTurn, parseBooking, parseMessage } from "../src/mastra/local-model"
import { createConcierge } from "../src/mastra/concierge"
import { mountPrefix, stripMount, viteBase } from "../src/mount"
import { withBase } from "../src/with-base"

const knowledgeDir = fileURLToPath(new URL("../src/knowledge/", import.meta.url))
const previousBase = process.env.DEMO_BASE_PATH
const previousVercel = process.env.VERCEL
const temps: string[] = []

afterEach(async () => {
  restore("DEMO_BASE_PATH", previousBase)
  restore("VERCEL", previousVercel)
  await Promise.all(temps.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

function restore(name: "DEMO_BASE_PATH" | "VERCEL", value: string | undefined): void {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

function userPrompt(text: string, earlier: string[] = []) {
  return [
    ...earlier.flatMap((line) => [
      { role: "user", content: [{ type: "text", text: line }] },
      { role: "assistant", content: [{ type: "text", text: "Noted." }] },
    ]),
    { role: "user", content: [{ type: "text", text }] },
  ]
}

test("local dev stays at the site root", () => {
  delete process.env.DEMO_BASE_PATH
  delete process.env.VERCEL
  expect(mountPrefix()).toBe("")
  expect(viteBase()).toBe("/")
  expect(stripMount("/api/thread")).toBe("/api/thread")
})

test("Vercel serves the demo under its stable path", () => {
  delete process.env.DEMO_BASE_PATH
  process.env.VERCEL = "1"
  expect(mountPrefix()).toBe("/demos/mastra-agent-demo")
  expect(viteBase()).toBe("/demos/mastra-agent-demo/")
  expect(stripMount("/demos/mastra-agent-demo")).toBe("/")
  expect(stripMount("/demos/mastra-agent-demo/api/chat")).toBe("/api/chat")
  expect(withBase("/demos/mastra-agent-demo/", "api/thread")).toBe("/demos/mastra-agent-demo/api/thread")
})

test("search reads the local knowledge folder", async () => {
  const matches = await searchKnowledge(knowledgeDir, "What projects have you shipped?")
  expect(matches.some((match) => match.file === "projects.md" && /Harbor map/.test(match.excerpt))).toBe(true)
})

test("the local model calls tools, then answers from the tool result", () => {
  const search = decideTurn(userPrompt("What projects have you shipped?"), ["search_knowledge"])
  expect(search).toMatchObject({ kind: "tool", toolName: "search_knowledge" })

  const message = parseMessage("Leave a message from Ada Lovelace at ada@example.com: Hello there.")
  expect(message).toEqual({ name: "Ada Lovelace", email: "ada@example.com", note: "Hello there." })
  const booking = parseBooking("Book Thu 14:00 for Ada Lovelace ada@example.com")
  expect(booking?.slot).toBe("Thu 14:00")

  const answered = decideTurn([
    { role: "user", content: [{ type: "text", text: "What projects have you shipped?" }] },
    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolName: "search_knowledge",
          output: { type: "json", value: { matches: [{ file: "projects.md", excerpt: "Harbor map" }] } },
        },
      ],
    },
  ])
  expect(answered.kind).toBe("text")
  if (answered.kind === "text") expect(answered.text).toContain("Harbor map")
})

test("desk books a slot once and keeps the message", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mastra-desk-"))
  temps.push(dir)
  const desk = openDesk(dir)
  const note = await desk.leaveMessage({ name: "Ada", email: "ada@example.com", note: "Hello" })
  expect(note.name).toBe("Ada")
  const first = await desk.bookSlot({ name: "Ada", email: "ada@example.com", slot: "Thursday at 2" })
  expect(first.booked).toBe(true)
  const second = await desk.bookSlot({ name: "Grace", email: "grace@example.com", slot: "Thu 14:00" })
  expect(second.booked).toBe(false)
  const listed = await desk.list()
  expect(listed.notes).toHaveLength(1)
  expect(listed.bookings).toHaveLength(1)
})

test("the agent remembers a thread in LibSQL and uses the knowledge tool", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mastra-agent-"))
  temps.push(dir)
  const concierge = await createConcierge({ dataDir: dir, knowledgeDir })
  const threadId = "thread-demo-1"
  try {
    await concierge.ask(threadId, "What projects have you shipped?")
    const first = await concierge.snapshot(threadId)
    expect(first.messages.some((message) => message.role === "assistant" && /Harbor map/.test(message.text))).toBe(true)
    expect(first.messages.some((message) => message.tools.some((tool) => tool.name === "search_knowledge"))).toBe(true)

    await concierge.ask(threadId, "Book Thu 14:00 for Ada Lovelace ada@example.com")
    const booked = await concierge.snapshot(threadId)
    expect(booked.bookings.some((booking) => booking.slot === "Thu 14:00" && booking.name === "Ada Lovelace")).toBe(true)
    expect(booked.messages.length).toBeGreaterThan(first.messages.length)
  } finally {
    await concierge.close()
  }

  const reopened = await createConcierge({ dataDir: dir, knowledgeDir })
  try {
    const restored = await reopened.snapshot(threadId)
    expect(restored.messages.length).toBeGreaterThan(1)
    expect(restored.messages.some((message) => /Harbor map/.test(message.text))).toBe(true)
    await reopened.ask(threadId, "What did we already cover?")
    const recalled = await reopened.snapshot(threadId)
    const last = recalled.messages.at(-1)
    expect(last?.role).toBe("assistant")
    expect(last?.text ?? "").toContain("What projects have you shipped?")
  } finally {
    await reopened.close()
  }
})
