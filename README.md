# sticky tech-demos

One Bun monorepo for small, self-contained tech demos.

## Layout

| Path | Purpose |
|------|---------|
| `apps/<slug>/` | Per-demo apps (each runnable with `bun install && bun run dev`) |
| `apps/demo-hub/` | Home page that links to `/demos/<slug>/` |
| `apps/demo-hub/demos.json` | Registry of demos the hub and Vercel config serve |
| `vercel.json` | One Vercel project: hub at `/`, demos under `/demos/<slug>/` |
| `skills/` | Agent skills (e.g. project planning) |
| `tracking/` | Bookmark / demo tracking state |
| `AGENTS.md` | Rules for cloud agents working in this repo |
| `bunfig.toml` | Bun install defaults (`minimumReleaseAge`) |

## Conventions

- Demos only under `apps/<slug>/` — never a separate GitHub repo per demo.
- Bun is the runtime and package manager.
- Plan new demos with `skills/project-planning/`.
- Demo PRs should include a screenshot and a video of the running app.

## One Vercel project

Root Directory is the **repository root**. [`vercel.json`](./vercel.json) uses Vercel Services (Beta) so a push to `master` deploys the hub and every demo together:

| URL | App |
|-----|-----|
| `/` | `apps/demo-hub` |
| `/demos/<slug>/` | `apps/<slug>` |

Register a demo in `apps/demo-hub/demos.json`, then run `bun run sync-vercel` from `apps/demo-hub` and commit `vercel.json`. Local `bun run dev` inside a demo stays at `/`. The hub dev server (`cd apps/demo-hub && bun install && bun run dev`) proxies the mounted paths.
