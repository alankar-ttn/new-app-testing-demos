### Goal
Show a small “portfolio concierge” agent built with Mastra: answers questions from a local knowledge folder, uses tools to leave a message and book a mock time slot, and keeps thread memory across a page reload — with no API keys.

### MVP
- One chat UI (shadcn) for talking to the concierge about a fake portfolio (projects, skills, availability).
- Local knowledge folder (markdown/text) the agent retrieves from — no remote RAG.
- Tools: leave a contact message; book a mock calendar slot (in-memory / local file OK).
- Thread/memory that survives a browser reload (show this clearly in the UI).
- Mock or local model path so `bun install && bun run dev` needs no API keys (same spirit as `apps/pi-durable-demo/`).
- Works under Vite `base` / `DEMO_BASE_PATH=/demos/mastra-agent-demo` for hub mount; local `/` still works.
- README: how to run, what Mastra pieces are demoed.

### Tasks
1. Write this PLAN.md.
2. Scaffold Bun + Vite + React + TypeScript with a small shadcn set (button, card, input, textarea, badge as needed). Respect root `bunfig.toml` `[install] minimumReleaseAge = 259200` — do not weaken it.
3. Wire Mastra (agents, tools, memory/workflows as needed for MVP) with a mock/local model — no real provider keys required.
4. Add knowledge folder + leave-message + book-slot tools; persist thread memory across reload.
5. Register in `apps/demo-hub/demos.json` (slug `mastra-agent-demo`, name like “Mastra portfolio concierge”, short description, framework `vite` or `bun` as appropriate), run `bun run sync-vercel` from `apps/demo-hub`, commit `vercel.json`.
6. Update tracking as above (skipped → proposed).
7. Capture at least ONE screenshot AND ONE video of the running app (chat + tool use and/or memory-after-reload). Attach both to the PR body/artifacts. This is mandatory.

### Stack
- Bun, Vite, React, TypeScript, Tailwind, shadcn/ui
- Mastra (TypeScript agent framework: agents, tools, memory) — use current documented Bun-friendly setup; pin versions compatible with root install freshness
- Mock/local model; no OpenAI/Anthropic keys required to run

### Deferred
Real LLM API keys, production auth, real calendar/email, multi-user, billing, cloud vector DB.
