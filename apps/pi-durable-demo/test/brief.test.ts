import { describe, expect, test } from "bun:test"
import { composeBrief, parseChangelog } from "../src/brief"
import { decideMockTurn } from "../src/mock-model"
import { projectSnapshot } from "../src/project"

describe("changelog brief", () => {
  test("parses a version and bullets", () => {
    const scan = parseChangelog("## 2.4.0\n\n- First\n- Second\n")
    expect(scan).toEqual({ version: "2.4.0", bullets: ["First", "Second"] })
  })

  test("asks for both tools until each has a result", () => {
    expect(decideMockTurn([])).toEqual({ type: "tools" })
    expect(
      decideMockTurn([
        { role: "toolResult", toolName: "scan_changelog", content: [{ type: "text", text: "{}" }] },
      ]),
    ).toEqual({ type: "tools" })
  })

  test("writes an interrupted brief without asking to stamp again", () => {
    const decision = decideMockTurn([
      {
        role: "toolResult",
        toolName: "scan_changelog",
        isError: false,
        content: [{ type: "text", text: JSON.stringify({ version: "2.4.0", bullets: ["Keep"] }) }],
      },
      {
        role: "toolResult",
        toolName: "stamp_release",
        isError: true,
        content: [{ type: "text", text: "stamp_release was interrupted" }],
      },
    ])
    expect(decision).toEqual({
      type: "brief",
      version: "2.4.0",
      bullets: ["Keep"],
      stampInterrupted: true,
    })
    if (decision.type !== "brief") throw new Error("expected a brief")
    expect(composeBrief(decision)).toContain("was not run again")
  })
})

describe("checkpoint projection", () => {
  test("shows a replay in flight beside an interrupted publish", () => {
    const snapshot = projectSnapshot(
      {
        entries: [
          {
            id: "1",
            kind: "pi.user",
            model: [{ role: "user", content: "notes" }],
          },
          {
            id: "2",
            kind: "pi.assistant",
            model: [
              {
                role: "assistant",
                stopReason: "toolUse",
                content: [
                  { type: "toolCall", name: "scan_changelog" },
                  { type: "toolCall", name: "stamp_release" },
                ],
              },
            ],
          },
          {
            id: "3",
            kind: "pi.tool-result",
            model: [
              {
                role: "toolResult",
                toolName: "stamp_release",
                isError: true,
                content: [{ type: "text", text: "interrupted" }],
              },
            ],
          },
        ],
        docs: {
          "pi.live": {
            tools: [{ callId: "scan-2", name: "scan_changelog", status: "running", output: "Scanning 2/8" }],
          },
        },
      },
      [
        { tool: "scan_changelog", event: "execute", at: "1" },
        { tool: "scan_changelog", event: "execute", at: "2" },
        { tool: "stamp_release", event: "publish", at: "1" },
        { tool: "stamp_release", event: "execute", at: "1" },
      ],
      false,
    )
    const scan = snapshot.tools.find((tool) => tool.name === "scan_changelog")
    const stamp = snapshot.tools.find((tool) => tool.name === "stamp_release")
    expect(scan?.status).toBe("replaying")
    expect(scan?.executions).toBe(2)
    expect(stamp?.status).toBe("interrupted")
    expect(stamp?.sideEffects).toBe(1)
    expect(snapshot.hint).toContain("was not")
    expect(snapshot.checkpoints.map((item) => item.title)).toContain("Checkpoint: stamp_release interrupted")
  })
})
