### Goal
Show a crash-proof Pi Durable agent: kill the worker mid-task and restart it from the last SQLite checkpoint, replaying only the tool marked safe.

### MVP
- One page where you paste a changelog and start a release-brief run.
- A checkpoint timeline that fills in from the harness as the run commits.
- Kill agent (SIGKILL the worker) and Restart, which reopens the same SQLite file and calls `harness.resume()`.
- Side-by-side tools: `scan_changelog` (`replay: "safe"`) and `stamp_release` (not replayable), with run counts and publish side effects.
- Mock model via pi-ai's faux provider, so `bun install && bun run dev` needs no API key.
- README with how to run and what the kill/resume proves.

### Tasks
1. Write this plan.
2. Scaffold a Bun + Vite + React app with a small shadcn/ui set (button, card, textarea, badge).
3. Run `@earendil-works/pi-durable` on a Bun SQLite adapter, with a worker process the page can kill and restart.
4. Build the page: start, kill, restart, timeline, tool comparison, and the release brief.
5. Test that a kill during both tools replays only the safe scan, then capture a screenshot and video.

### Stack
- Bun, Vite, React, TypeScript
- Tailwind CSS and shadcn/ui (button, card, textarea, badge)
- `@earendil-works/pi-durable`, `@earendil-works/pi-ai`, and `@earendil-works/chord` pinned to 1.0.0 (newer 1.0.x releases are inside root `minimumReleaseAge`)
- Faux provider for mock mode
- `bun:sqlite` through the portable `SqliteStorage` facade

### Deferred
Auth, multi-user sessions, real provider keys, billing, compaction controls, subagents, and remote multiplayer clients.
