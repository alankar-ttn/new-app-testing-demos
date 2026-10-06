import {
  fauxAssistantMessage,
  fauxText,
  fauxToolCall,
  type AssistantMessage,
} from "@earendil-works/pi-ai"
import { composeBrief, parseChangelog } from "./brief"

export const SCAN_TOOL = "scan_changelog"
export const STAMP_TOOL = "stamp_release"

type LooseMessage = {
  role?: string
  toolName?: string
  isError?: boolean
  content?: unknown
  stopReason?: string
}

export type MockDecision =
  | { type: "tools" }
  | {
      type: "brief"
      version: string
      bullets: string[]
      stampInterrupted: boolean
    }

export function messageText(content: unknown): string {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content
    .map((part) => {
      if (!part || typeof part !== "object") return ""
      const block = part as { type?: string; text?: string }
      return typeof block.text === "string" ? block.text : ""
    })
    .filter((text) => text.length > 0)
    .join("\n")
}

export function toolCallNames(content: unknown): string[] {
  if (!Array.isArray(content)) return []
  return content.flatMap((part) => {
    if (!part || typeof part !== "object") return []
    const block = part as { type?: string; name?: string }
    if (block.type === "toolCall" && block.name) return [block.name]
    return []
  })
}

function toolResult(
  messages: readonly LooseMessage[],
  name: string,
): LooseMessage | undefined {
  return messages.find(
    (message) => message.role === "toolResult" && message.toolName === name,
  )
}

export function decideMockTurn(messages: readonly LooseMessage[]): MockDecision {
  const scan = toolResult(messages, SCAN_TOOL)
  const stamp = toolResult(messages, STAMP_TOOL)
  if (!scan || !stamp) return { type: "tools" }
  const parsed = parseChangelog(messageText(scan.content))
  const scanJson = readScanPayload(messageText(scan.content))
  return {
    type: "brief",
    version: scanJson?.version ?? parsed.version,
    bullets: scanJson?.bullets ?? parsed.bullets,
    stampInterrupted: stamp.isError === true,
  }
}

function readScanPayload(
  text: string,
): { version: string; bullets: string[] } | null {
  try {
    const value = JSON.parse(text) as { version?: unknown; bullets?: unknown }
    if (typeof value.version !== "string" || !Array.isArray(value.bullets)) return null
    const bullets = value.bullets.filter((item): item is string => typeof item === "string")
    return { version: value.version, bullets }
  } catch {
    return null
  }
}

export function nextMockMessage(messages: readonly LooseMessage[]): AssistantMessage {
  const decision = decideMockTurn(messages)
  if (decision.type === "tools") {
    return fauxAssistantMessage(
      [
        fauxToolCall(SCAN_TOOL, { source: "pasted" }),
        fauxToolCall(STAMP_TOOL, { version: "from-changelog" }),
      ],
      { stopReason: "toolUse" },
    )
  }
  return fauxAssistantMessage([fauxText(composeBrief(decision))], { stopReason: "stop" })
}
