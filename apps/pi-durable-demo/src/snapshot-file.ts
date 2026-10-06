import { closeSync, fsyncSync, openSync, readFileSync, writeSync } from "node:fs"
import { join } from "node:path"
import type { WorkerSnapshot } from "./types"

export function snapshotPath(dataDir: string): string {
  return join(dataDir, "snapshot.json")
}

export function writeSnapshotFile(dataDir: string, snapshot: WorkerSnapshot): void {
  const fd = openSync(snapshotPath(dataDir), "w")
  try {
    writeSync(fd, JSON.stringify(snapshot))
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
}

export function readSnapshotFile(dataDir: string): WorkerSnapshot | null {
  try {
    return JSON.parse(readFileSync(snapshotPath(dataDir), "utf8")) as WorkerSnapshot
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}
