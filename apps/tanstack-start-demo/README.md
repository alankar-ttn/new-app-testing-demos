# TanStack Start demo

Single-user idea board. Adding a card calls a TanStack Start server function. The list is held in server memory for the demo session (no database).

## Run

From this directory:

```bash
bun install
bun run dev
```

Open http://localhost:3000.

## Scripts

- `bun run dev` — Vite dev server on port 3000
- `bun run build` — production build
- `bun run preview` — serve the production build
- `bun test` — idea-board store tests

## Deploy on Vercel

Set **Root Directory** to `apps/tanstack-start-demo`. Framework preset: **TanStack Start** (or Auto). Nitro is configured in `vite.config.ts` for the Vercel build.

## Stack

Bun, TanStack Start (official `bunx @tanstack/cli create` scaffold), shadcn/ui, TypeScript.
