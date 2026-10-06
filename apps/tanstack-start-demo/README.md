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

This demo ships with the monorepo hub. One Vercel project uses the **repository root** as Root Directory. Root `vercel.json` routes `/demos/tanstack-start-demo/` to this app. Do not point Root Directory at this folder.

`bun run dev` in this directory still serves http://localhost:3000/. The `/demos/tanstack-start-demo/` base is applied only when `VERCEL=1` (production) or when `DEMO_BASE_PATH` is set (the hub dev proxy). Nitro `baseURL`, Vite `base`, and the router `basepath` stay in lockstep.

## Stack

Bun, TanStack Start (official `bunx @tanstack/cli create` scaffold), shadcn/ui, TypeScript.
