import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context"
import { createModels, fauxProvider } from "@earendil-works/pi-ai"
import { createRegistry, Harness } from "@earendil-works/pi-durable"
import { readEffects } from "./effects"
import { nextMockMessage } from "./mock-model"
import { projectSnapshot, type ProjectView } from "./project"
import { writeSnapshotFile } from "./snapshot-file"
import { openBunSqliteStorage } from "./sqlite"
import { createReleaseExtension } from "./tools"
import type { WorkerSnapshot } from "./types"
import { writeSync } from "node:fs"
import { join } from "node:path"

const REQUEST_ID = "release-brief"

export async function runHarness(dataDir: string, mode: "start" | "resume"): Promise<void> {
  const context = BACKGROUND_CONTEXT
  const faux = fauxProvider()
  const factory = (transcript: { messages: readonly { role?: string }[] }) =>
    nextMockMessage(transcript.messages)
  faux.setResponses(Array.from({ length: 16 }, () => factory))

  const models = createModels()
  models.setProvider(faux.provider)
  const registry = createRegistry()

  let latestView: ProjectView | null = null
  let settled = false

  const publish = () => {
    if (!latestView) return
    const snapshot: WorkerSnapshot = projectSnapshot(latestView, readEffects(dataDir), settled)
    writeSnapshotFile(dataDir, snapshot)
    writeSync(1, `${JSON.stringify({ type: "snapshot", snapshot })}\n`)
  }

  registry.install(createReleaseExtension(dataDir, publish))

  const storage = await openBunSqliteStorage(join(dataDir, "session.sqlite"))
  const harness = await Harness.open(
    storage,
    {
      models,
      registry,
      settings: { toolExecution: "parallel" },
    },
    context,
  )

  try {
    const root = await harness.root(context, {
      agent: {
        model: { provider: "faux", modelId: "faux-1" },
        instructions:
          "Turn the pasted changelog into a release brief. Scan it, stamp the release note, then write the brief.",
      },
    })
    const view = await root.viewState(context)
    latestView = view.value as unknown as ProjectView
    publish()
    view.subscribe((value) => {
      latestView = value as unknown as ProjectView
      publish()
    })

    harness.resume()
    const changelog = await Bun.file(join(dataDir, "changelog.txt")).text()
    const submission = await root.submit(
      {
        type: "input",
        requestId: REQUEST_ID,
        content: `Turn this changelog into a release brief.\n\n${changelog}`,
      },
      context,
    )
    if (mode === "resume") harness.resume()
    const result = await submission.wait(context)
    if (result.status !== "done") {
      const reason = "reason" in result ? String(result.reason) : ""
      throw new Error(`Submission ${result.status}${reason ? `: ${reason}` : ""}`)
    }
    settled = true
    publish()
  } finally {
    await harness.close(context)
  }
}
