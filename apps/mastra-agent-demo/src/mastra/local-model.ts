export type PromptTurn = {
  role: "system" | "user" | "assistant" | "tool"
  text: string
  toolName?: string
  output?: unknown
}

export type ModelDecision =
  | { kind: "text"; text: string }
  | { kind: "tool"; toolName: "search_knowledge" | "leave_message" | "book_slot"; input: Record<string, string> }

type ToolName = Extract<ModelDecision, { kind: "tool" }>["toolName"]

function unwrapOutput(output: unknown): unknown {
  if (!output || typeof output !== "object" || !("value" in output)) return output
  return (output as { value: unknown }).value
}

/** Read a Mastra / AI SDK prompt into ordered turns. */
export function readPrompt(prompt: unknown): PromptTurn[] {
  if (!Array.isArray(prompt)) return []
  const turns: PromptTurn[] = []

  for (const message of prompt) {
    if (!message || typeof message !== "object") continue
    const role = (message as { role?: unknown }).role
    const content = (message as { content?: unknown }).content
    if (role === "system" && typeof content === "string") {
      turns.push({ role: "system", text: content })
      continue
    }
    if ((role !== "user" && role !== "assistant" && role !== "tool") || !Array.isArray(content)) continue

    const texts: string[] = []
    const flushText = () => {
      if (!texts.length) return
      turns.push({ role, text: texts.join("\n") })
      texts.length = 0
    }

    for (const part of content) {
      if (!part || typeof part !== "object") continue
      const type = (part as { type?: unknown }).type
      if (type === "text" && typeof (part as { text?: unknown }).text === "string") {
        texts.push((part as { text: string }).text)
        continue
      }
      if (type === "tool-result") {
        flushText()
        turns.push({
          role: "tool",
          text: "",
          toolName: typeof (part as { toolName?: unknown }).toolName === "string"
            ? (part as { toolName: string }).toolName
            : undefined,
          output: unwrapOutput((part as { output?: unknown }).output ?? (part as { result?: unknown }).result),
        })
      }
    }
    flushText()
  }

  return turns
}

export function parseMessage(text: string): { name: string; email: string; note: string } | null {
  const match = text.match(/message from\s+(.+?)\s+at\s+(\S+@\S+)\s*:\s*([\s\S]+)/i)
  if (!match?.[1] || !match[2] || !match[3]) return null
  return { name: match[1].trim(), email: match[2].trim(), note: match[3].trim() }
}

export function parseBooking(text: string): { slot: string; name: string; email: string } | null {
  const match = text.match(/book\s+(.+?)\s+for\s+(.+?)\s+(\S+@\S+)/i)
  if (!match?.[1] || !match[2] || !match[3]) return null
  return { slot: match[1].trim(), name: match[2].trim(), email: match[3].replace(/[.,]$/, "") }
}

function isRecall(text: string): boolean {
  return /what did we|already cover|remind me|earlier in this thread|what do you remember/i.test(text)
}

function isSearch(text: string): boolean {
  return /\b(project|projects|skill|skills|stack|typescript|availab|free|slot|slots|portfolio|harbor|lumen|field|shipped|notes)\b/i.test(text)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function formatSearch(output: unknown): string {
  const record = asRecord(output)
  const matches = Array.isArray(record?.matches) ? record.matches : []
  const lines = matches.flatMap((match) => {
    const item = asRecord(match)
    if (!item || typeof item.file !== "string" || typeof item.excerpt !== "string") return []
    return [`From ${item.file}:\n${item.excerpt}`]
  })
  if (!lines.length) return "Nothing in the local knowledge folder matched that."
  return lines.join("\n\n")
}

function formatMessage(output: unknown): string {
  const record = asRecord(output)
  const name = typeof record?.name === "string" ? record.name : "the visitor"
  const email = typeof record?.email === "string" ? record.email : ""
  const note = typeof record?.note === "string" ? record.note : ""
  return `Saved a message from ${name}${email ? ` (${email})` : ""}: “${note}”. It is in the local inbox file.`
}

function formatBooking(output: unknown): string {
  const record = asRecord(output)
  const slot = typeof record?.slot === "string" ? record.slot : "that slot"
  if (record?.booked === true) {
    const name = typeof record.name === "string" ? record.name : "the visitor"
    const email = typeof record.email === "string" ? record.email : ""
    return `Booked ${slot} for ${name}${email ? ` (${email})` : ""}. The hold is in the local calendar file.`
  }
  const reason = typeof record?.reason === "string" ? record.reason : "The slot could not be booked."
  return `Could not book ${slot}. ${reason}`
}

function formatTool(turn: PromptTurn): string {
  if (turn.toolName === "search_knowledge") return formatSearch(turn.output)
  if (turn.toolName === "leave_message") return formatMessage(turn.output)
  if (turn.toolName === "book_slot") return formatBooking(turn.output)
  return "The tool finished."
}

function recallText(turns: PromptTurn[]): string {
  const users = turns.filter((turn) => turn.role === "user")
  const earlierUsers = users.slice(0, -1)
  const answers = turns.filter((turn) => turn.role === "assistant" && turn.text.trim())
  if (!earlierUsers.length && !answers.length) {
    return "This thread has no earlier turns yet. Send a question and it will stay in Mastra memory after a reload."
  }
  const lines = [
    ...earlierUsers.map((turn) => `You asked: ${turn.text}`),
    ...answers.slice(-3).map((turn) => `I answered: ${turn.text.replace(/\s+/g, " ").slice(0, 320)}`),
  ]
  return `Pulled from this thread's Mastra memory:\n${lines.join("\n")}`
}

function helpText(): string {
  return [
    "I can answer from the local portfolio notes, save a message, or book a mock slot.",
    "Try: “What projects have you shipped?”",
    "Or: “Leave a message from Ada Lovelace at ada@example.com: The harbor map is lovely.”",
    "Or: “Book Thu 14:00 for Ada Lovelace ada@example.com”.",
  ].join(" ")
}

function hasTool(available: readonly string[], name: ToolName): boolean {
  return available.length === 0 || available.includes(name)
}

/** Deterministic local model. No provider key. */
export function decideTurn(prompt: unknown, availableTools: readonly string[] = []): ModelDecision {
  const turns = readPrompt(prompt)
  const userIndexes = turns.flatMap((turn, index) => (turn.role === "user" ? [index] : []))
  const lastUserIndex = userIndexes.at(-1) ?? -1
  const afterUser = lastUserIndex >= 0 ? turns.slice(lastUserIndex + 1) : []

  const trailingTools: PromptTurn[] = []
  for (let index = afterUser.length - 1; index >= 0; index -= 1) {
    const turn = afterUser[index]
    if (!turn) continue
    if (turn.role === "tool") {
      trailingTools.unshift(turn)
      continue
    }
    if (turn.role === "assistant" && turn.text.trim() && trailingTools.length === 0) {
      return { kind: "text", text: turn.text }
    }
    break
  }

  if (trailingTools.length > 0) {
    const earlier = turns.filter((turn) => turn.role === "user").slice(0, -1)
    const memory = earlier.length
      ? `\n\nThis thread still remembers earlier questions: ${earlier.map((turn) => `“${turn.text}”`).join("; ")}.`
      : ""
    return { kind: "text", text: `${trailingTools.map(formatTool).join("\n\n")}${memory}` }
  }

  const user = turns.filter((turn) => turn.role === "user").at(-1)?.text.trim() ?? ""
  if (!user) return { kind: "text", text: helpText() }

  const message = parseMessage(user)
  if (message && hasTool(availableTools, "leave_message")) {
    return { kind: "tool", toolName: "leave_message", input: message }
  }
  if (/\bmessage\b/i.test(user)) {
    return {
      kind: "text",
      text: "To save a note, use: Leave a message from <name> at <email>: <note>.",
    }
  }

  const booking = parseBooking(user)
  if (booking && hasTool(availableTools, "book_slot")) {
    return { kind: "tool", toolName: "book_slot", input: booking }
  }
  if (/\bbook\b/i.test(user)) {
    return {
      kind: "text",
      text: "To hold a slot, use: Book <slot> for <name> <email>. Open slots are Tue 10:00, Thu 14:00, and Fri 11:30.",
    }
  }

  if (isRecall(user)) return { kind: "text", text: recallText(turns) }

  if (isSearch(user) && hasTool(availableTools, "search_knowledge")) {
    return { kind: "tool", toolName: "search_knowledge", input: { query: user } }
  }

  return { kind: "text", text: helpText() }
}

type GenerateResult = {
  content: Array<
    | { type: "text"; text: string }
    | { type: "tool-call"; toolCallId: string; toolName: string; input: string }
  >
  finishReason: "stop" | "tool-calls"
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
  warnings: []
}

let callSeq = 0

function generate(options: { prompt: unknown; tools?: { name?: string }[] }): GenerateResult {
  const names = (options.tools ?? []).flatMap((tool) => (typeof tool.name === "string" ? [tool.name] : []))
  const decision = decideTurn(options.prompt, names)
  if (decision.kind === "tool") {
    callSeq += 1
    return {
      content: [
        {
          type: "tool-call",
          toolCallId: `local-${decision.toolName}-${callSeq}`,
          toolName: decision.toolName,
          input: JSON.stringify(decision.input),
        },
      ],
      finishReason: "tool-calls",
      usage: { inputTokens: 16, outputTokens: 8, totalTokens: 24 },
      warnings: [],
    }
  }
  return {
    content: [{ type: "text", text: decision.text }],
    finishReason: "stop",
    usage: { inputTokens: 16, outputTokens: decision.text.length, totalTokens: 16 + decision.text.length },
    warnings: [],
  }
}

function streamFrom(result: GenerateResult): ReadableStream<unknown> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue({ type: "stream-start", warnings: [] })
      for (const part of result.content) {
        if (part.type === "text") {
          controller.enqueue({ type: "text-start", id: "local-text" })
          controller.enqueue({ type: "text-delta", id: "local-text", delta: part.text })
          controller.enqueue({ type: "text-end", id: "local-text" })
        } else {
          controller.enqueue({ type: "tool-input-start", id: part.toolCallId, toolName: part.toolName })
          controller.enqueue({ type: "tool-input-delta", id: part.toolCallId, delta: part.input })
          controller.enqueue({ type: "tool-input-end", id: part.toolCallId })
          controller.enqueue(part)
        }
      }
      controller.enqueue({
        type: "finish",
        finishReason: result.finishReason,
        usage: result.usage,
      })
      controller.close()
    },
  })
}

/** Language model v2 object. Mastra runs the tool loop around it. */
export const localPortfolioModel = {
  specificationVersion: "v2" as const,
  provider: "local",
  modelId: "portfolio-concierge",
  supportedUrls: {} as Record<string, RegExp[]>,
  async doGenerate(options: { prompt: unknown; tools?: { name?: string }[] }) {
    return generate(options)
  },
  async doStream(options: { prompt: unknown; tools?: { name?: string }[] }) {
    return { stream: streamFrom(generate(options)) }
  },
}
