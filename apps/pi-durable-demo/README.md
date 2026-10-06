# Pi Durable demo

A one-page crash-proof agent. Paste a changelog, watch checkpoints land, kill the worker, and restart from the last SQLite checkpoint.

The model is Pi's faux provider. `bun install && bun run dev` does not need an API key.

## Run

```bash
cd apps/pi-durable-demo
bun install
bun run dev
```

Open http://127.0.0.1:3000.

1. Start run. The mock model calls two tools at once.
2. `scan_changelog` is marked `replay: "safe"`. `stamp_release` is not replayable and records a publish as soon as it starts.
3. While both are in flight, press **Kill agent**. That sends SIGKILL to the worker.
4. Press **Restart**. A new process opens the same `data/session.sqlite` and calls `harness.resume()`.
5. The scan runs again. The publish does not. The brief says the stamp was interrupted and was not run again.

## What is stored

- `data/session.sqlite` is the Pi Durable database (WAL). One worker owns it at a time.
- `data/effects.jsonl` counts `execute()` calls and publishes so a replay is visible after the process is gone.
- `data/snapshot.json` is the last timeline the UI rendered.

## Package notes

`@earendil-works/pi-durable`, `@earendil-works/pi-ai`, and `@earendil-works/chord` are pinned to **1.0.0**. Newer 1.0.x releases were published inside the root `bunfig.toml` `minimumReleaseAge` window (259200 seconds), so this app does not depend on them.

Storage uses the portable `SqliteStorage` facade with a `bun:sqlite` adapter. The published `openNodeSqliteStorage` helper imports `node:sqlite`, which the package docs call out as the Node-only path. The Bun adapter follows that portable contract: promise-based `exec` / `run` / `get` / `all` / `transaction` / `close`, WAL, and `synchronous = NORMAL`.

The public API used here matches the 1.0.0 README: `Harness.open`, `harness.resume()`, `root.submit` with a stable `requestId`, `defineTool({ replay: "safe" })`, and `viewState()` (`pi.live` plus transcript entries). Tool calls in one round run in parallel so a single kill can show both recovery rules.
