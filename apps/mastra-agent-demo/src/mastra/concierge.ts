import { mkdir } from "node:fs/promises"
import { Agent } from "@mastra/core/agent"
import { Mastra } from "@mastra/core"
import type { MastraModelConfig } from "@mastra/core/llm"
import { LibSQLStore } from "@mastra/libsql"
import { Memory } from "@mastra/memory"
import type { Booking, ContactNote } from "./desk"
import { openDesk } from "./desk"
import { localPortfolioModel } from "./local-model"
import { createConciergeTools } from "./tools"

export const RESOURCE_ID = "visitor"
export const AGENT_ID = "portfolio-concierge"

export type ToolChip = {
  name: string
  summary: string
}

export type PublicMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  tools: ToolChip[]
}

export type ThreadSnapshot = {
  threadId: string
  messages: PublicMessage[]
  inbox: ContactNote[]
  bookings: Booking[]
}

type StoredMessage = {
  id?: string
  role?: string
  createdAt?: Date | string
  content?: { parts?: unknown[] }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function summarizeTool(name: string, payload: unknown): string {
  const record = asRecord(payload)
  if (name === "search_knowledge") {
    const matches = Array.isArray(record?.matches) ? record.matches : []
    const files = [...new Set(matches.flatMap((match) => {
      const file = asRecord(match)?.file
      return typeof file === "string" ? [file] : []
    }))]
    return files.length ? files.join(", ") : "local notes"
  }
  if (name === "leave_message") {
    return typeof record?.name === "string" ? record.name : "inbox"
  }
  if (name === "book_slot") {
    const slot = typeof record?.slot === "string" ? record.slot : "slot"
    return record?.booked === false ? `${slot} declined` : slot
  }
  return name
}

function chipsFromPart(part: Record<string, unknown>): ToolChip[] {
  if (part.type === "tool-invocation") {
    const invocation = asRecord(part.toolInvocation)
    const name = typeof invocation?.toolName === "string" ? invocation.toolName : ""
    if (!name) return []
    return [{ name, summary: summarizeTool(name, invocation?.result ?? invocation?.args) }]
  }
  if (typeof part.type === "string" && part.type.startsWith("tool-") && part.type !== "tool-result") {
    const name = typeof part.toolName === "string" ? part.toolName : part.type.slice("tool-".length)
    if (!name || name === "call") return []
    return [{ name, summary: summarizeTool(name, part.output ?? part.result ?? part.input) }]
  }
  return []
}

export function toPublicMessage(message: StoredMessage): PublicMessage | null {
  if (message.role !== "user" && message.role !== "assistant") return null
  const parts = Array.isArray(message.content?.parts) ? message.content.parts : []
  const texts: string[] = []
  const tools: ToolChip[] = []
  for (const part of parts) {
    const record = asRecord(part)
    if (!record) continue
    if (record.type === "text" && typeof record.text === "string") texts.push(record.text)
    if (message.role === "assistant") tools.push(...chipsFromPart(record))
  }
  const text = texts.join("\n").trim()
  if (!text && tools.length === 0) return null
  return {
    id: message.id ?? crypto.randomUUID(),
    role: message.role,
    text,
    tools,
  }
}

export type Concierge = {
  ask(threadId: string, text: string): Promise<void>
  snapshot(threadId: string): Promise<ThreadSnapshot>
  close(): Promise<void>
}

export async function createConcierge(options: { dataDir: string; knowledgeDir: string }): Promise<Concierge> {
  await mkdir(options.dataDir, { recursive: true })
  const desk = openDesk(options.dataDir)
  const storage = new LibSQLStore({
    id: "mastra-agent-demo",
    url: `file:${options.dataDir}/memory.db`,
  })
  const agent = new Agent({
    id: AGENT_ID,
    name: "Portfolio concierge",
    description: "Answers from local portfolio notes, saves messages, and books mock slots.",
    instructions: [
      "You are the portfolio concierge for a fictional practice.",
      "Use search_knowledge before answering questions about projects, skills, or availability.",
      "Use leave_message when a visitor asks to leave a note.",
      "Use book_slot when a visitor asks to reserve a mock time slot.",
      "Keep replies short and quote the local notes.",
    ].join(" "),
    model: localPortfolioModel as unknown as MastraModelConfig,
    tools: createConciergeTools({ knowledgeDir: options.knowledgeDir, desk }),
    memory: new Memory({
      storage,
      options: {
        lastMessages: 20,
        generateTitle: false,
      },
    }),
  })

  const mastra = new Mastra({
    agents: { portfolioConcierge: agent },
    storage,
  })
  const registered = mastra.getAgentById(AGENT_ID)

  return {
    async ask(threadId, text) {
      const result = await registered.generate(text, {
        maxSteps: 4,
        memory: { thread: threadId, resource: RESOURCE_ID },
      })
      await result.text
    },
    async snapshot(threadId) {
      const memory = await registered.getMemory()
      if (!memory) throw new Error("Mastra memory is not configured")
      let stored: StoredMessage[] = []
      try {
        const recalled = await memory.recall({
          threadId,
          resourceId: RESOURCE_ID,
          perPage: 100,
          orderBy: { field: "createdAt", direction: "ASC" },
        })
        stored = recalled.messages as StoredMessage[]
      } catch {
        stored = []
      }
      const deskFile = await desk.list()
      return {
        threadId,
        messages: stored.flatMap((message) => {
          const publicMessage = toPublicMessage(message)
          return publicMessage ? [publicMessage] : []
        }),
        inbox: deskFile.notes,
        bookings: deskFile.bookings,
      }
    },
    async close() {
      const memory = await registered.getMemory()
      await memory?.settled()
      await storage.close()
    },
  }
}
