# Mastra portfolio concierge

A one-page chat with a Mastra agent. It answers from a local markdown folder, saves a visitor message, and books a mock calendar slot. Locally, thread memory is stored in LibSQL and comes back after a browser reload.

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
- `LibSQLStore` at `data/memory.db` when you run the app yourself. On Vercel, thread memory uses `InMemoryStore` for the life of that function instance.
- A local model (`provider: "local"`) so the tool loop runs without OpenAI, Anthropic, or other keys.

## What is stored

- `data/memory.db` is the Mastra thread database when LibSQL is in use.
- `data/desk.json` is the inbox and mock calendar. On Vercel that file is `/tmp/mastra-agent-demo/desk.json`.
- The browser keeps only the thread id in `localStorage`.

## Package notes

`@mastra/core` is pinned to **1.74.0**, `@mastra/memory` to **1.35.0**, and `@mastra/libsql` to **1.25.0**. Those releases are from 2026-10-01, outside the root `bunfig.toml` `minimumReleaseAge` window (259200 seconds). The app does not weaken that pin.

## Deploy on Vercel

The demo hub registers this app as a Bun service (`src/server.ts`, `engines.bun`). Production builds with `VERCEL=1`, so Vite `base` is `/demos/mastra-agent-demo/`.

Hosted thread memory does not use LibSQL. `@mastra/libsql` imports `libsql`, and that package loads a native addon with a dynamic require of `@libsql/${target}` as soon as the module evaluates. Vercel's file trace does not follow that dynamic require, so the `.node` binary is missing and the function dies with `FUNCTION_INVOCATION_FAILED` before it can return HTML. When `VERCEL=1`, the concierge uses `InMemoryStore` instead. A reload on the same instance still sees the thread. A new instance starts a fresh transcript. The inbox and mock calendar stay in `/tmp/mastra-agent-demo/desk.json`, which is also instance-local.
