# Sticky tech-demos monorepo

This repository is **one sticky monorepo** for small tech demo apps. Do not create a new GitHub repository per demo.

## Layout

- Demos live only under `apps/<slug>/`.
- Shared agent guidance and planning skills live at the repo root (`AGENTS.md`, `skills/`).
- Bookmark / demo tracking state lives under `tracking/`.

## Cloud agent rules

- For demo work, cloud agents must only touch `apps/<slug>/` (plus whatever the specific task explicitly allows for tracking or docs).
- Plan demos with `skills/project-planning/` before implementing.
- Every demo PR must attach at least one screenshot **and** one video of the running app.
- Never create a new GitHub repo per demo.

## Runtime

- **Bun** is the package manager and runtime.
- Each app under `apps/<slug>/` should be self-contained: `bun install && bun run dev` from that app directory.

## Demo hub and Vercel

One Vercel project serves the hub and every demo. **Root Directory stays the repository root** (empty / `.` / null). Do not set Root Directory to `apps/<slug>/` and do not create a project per demo.

- `/` is `apps/demo-hub/`.
- Each demo is served at `/demos/<slug>/` on that same domain.
- The registry is `apps/demo-hub/demos.json`. Root `vercel.json` is generated from it with Vercel Services (Beta): `cd apps/demo-hub && bun run sync-vercel`.
- Local `bun run dev` inside a demo stays at `/`. Production (`VERCEL=1`) and the hub proxy (`DEMO_BASE_PATH=/demos/<slug>`) use the mounted path. Set Vite `base`, the router base path, and any asset prefix together.
- A new demo needs `apps/<slug>/` plus one object in `demos.json` (`slug`, `name`, `description`, `framework` of `tanstack-start`, `bun`, or `vite`). Then run `sync-vercel` and commit `vercel.json`. No Root Directory change.
- Pushing `master` deploys the hub and every registered demo together.
