### Goal
Show TanStack Start as a type-safe full-stack React app: server functions + a polished single-page demo someone can click through in under a minute.

### MVP
- Scaffold TanStack Start (official create path via bunx) under apps/tanstack-start-demo/
- Minimalist shadcn/ui shell
- One interactive core: a small “idea board” — add/list cards via a TanStack Start server function (in-memory or file-local OK for demo; no real DB)
- Clear README with bun install / bun run dev

### Tasks
1. Scaffold TanStack Start with bunx into apps/tanstack-start-demo/
2. Ensure bunfig/install works under that app; add shadcn minimalist components as needed
3. Build the idea-board UI + server function
4. Run the app, capture screenshot + short video, attach to PR
5. Write PLAN.md + short app README

### Stack
- Bun
- TanStack Start (official scaffold)
- shadcn/ui (minimal)
- TypeScript

### Deferred
Auth, persistence/DB, multiplayer, Cloudflare deploy wiring (handled separately), multi-page marketing site.
