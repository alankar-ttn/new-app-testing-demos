import { runHarness } from "./harness-run"

function arg(name: string): string {
  const index = process.argv.indexOf(name)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

const dataDir = arg("--data")
const mode = arg("--mode")
if (mode !== "start" && mode !== "resume") throw new Error(`Unknown mode ${mode}`)

try {
  await runHarness(dataDir, mode)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exit(1)
}
