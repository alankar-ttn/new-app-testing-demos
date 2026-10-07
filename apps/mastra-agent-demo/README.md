# Mastra portfolio concierge

A one-page chat with a Mastra agent. It answers from a local markdown folder, saves a visitor message, and books a mock calendar slot. Thread memory is stored in LibSQL and comes back after a browser reload.

The model is a local LanguageModel v2 object. `bun install && bun run dev` does not need an API key.

## Run

```bash
cd apps/mastra-agent-demo
bun install
bun run dev
```

Open http://127.0.0.1:3000.

`bun run dev` serves the app at `/`. The demo hub and Vercel serve it at `/demos/mastra-agent-demo/`. Set `DEMO_BASE_PATH` only when you want that prefix locally.

1. Ask about projects, skills, or availability. The agent calls `search_knowledge` and quotes `src/knowledge/`.
2. Leave a message. `leave_message` appends it to the inbox card.
3. Book `Thu 14:00`. `book_slot` holds that mock slot in a local file.
4. Press **Reload page**. The same thread id is read from the browser and the transcript is loaded from Mastra memory.

## What Mastra is doing

- `Agent` (`portfolio-concierge`) with instructions, tools, and memory.
- `createTool` for `search_knowledge`, `leave_message`, and `book_slot`.
- `Memory` with `lastMessages: 20`, keyed by a thread id and the resource `visitor`.
- `LibSQLStore` at `data/memory.db` (or `/tmp/mastra-agent-demo` on Vercel).
- A local model (`provider: "local"`) so the tool loop runs without OpenAI, Anthropic, or other keys.

## What is stored

- `data/memory.db` is the Mastra thread database.
- `data/desk.json` is the inbox and mock calendar.
- The browser keeps only the thread id in `localStorage`.

## Package notes

`@mastra/core` is pinned to **1.74.0**, `@mastra/memory` to **1.35.0**, and `@mastra/libsql` to **1.25.0**. Those releases are from 2026-10-01, outside the root `bunfig.toml` `minimumReleaseAge` window (259200 seconds). The app does not weaken that pin.

## Deploy on Vercel

The demo hub registers this app as a Bun service (`src/server.ts`, `engines.bun`). Production builds with `VERCEL=1`, so Vite `base` is `/demos/mastra-agent-demo/`.
