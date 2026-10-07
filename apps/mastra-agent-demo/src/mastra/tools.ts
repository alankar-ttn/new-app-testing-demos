import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import type { Desk } from "./desk"
import { searchKnowledge } from "./knowledge"

export function createConciergeTools(options: { knowledgeDir: string; desk: Desk }) {
  const searchKnowledgeTool = createTool({
    id: "search_knowledge",
    description: "Read the local portfolio notes and return the paragraphs that match a question.",
    inputSchema: z.object({
      query: z.string().describe("Visitor question about projects, skills, or availability"),
    }),
    outputSchema: z.object({
      query: z.string(),
      matches: z.array(z.object({ file: z.string(), excerpt: z.string() })),
    }),
    execute: async ({ query }) => {
      const matches = await searchKnowledge(options.knowledgeDir, query)
      return { query, matches }
    },
  })

  const leaveMessageTool = createTool({
    id: "leave_message",
    description: "Save a visitor message in the local inbox.",
    inputSchema: z.object({
      name: z.string(),
      email: z.string(),
      note: z.string(),
    }),
    outputSchema: z.object({
      saved: z.boolean(),
      id: z.string(),
      name: z.string(),
      email: z.string(),
      note: z.string(),
    }),
    execute: async ({ name, email, note }) => {
      const saved = await options.desk.leaveMessage({ name, email, note })
      return { saved: true, id: saved.id, name: saved.name, email: saved.email, note: saved.note }
    },
  })

  const bookSlotTool = createTool({
    id: "book_slot",
    description: "Hold one mock calendar slot for a visitor. Slots live in a local file.",
    inputSchema: z.object({
      name: z.string(),
      email: z.string(),
      slot: z.string().describe("Tue 10:00, Thu 14:00, or Fri 11:30"),
    }),
    outputSchema: z.object({
      booked: z.boolean(),
      slot: z.string(),
      name: z.string(),
      email: z.string(),
      reason: z.string().optional(),
    }),
    execute: async ({ name, email, slot }) => {
      const result = await options.desk.bookSlot({ name, email, slot })
      if (result.booked) {
        return { booked: true, slot: result.booking.slot, name: result.booking.name, email: result.booking.email }
      }
      return { booked: false, slot: result.slot, name, email, reason: result.reason }
    },
  })

  return {
    search_knowledge: searchKnowledgeTool,
    leave_message: leaveMessageTool,
    book_slot: bookSlotTool,
  }
}
