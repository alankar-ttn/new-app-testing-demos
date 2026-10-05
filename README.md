# sticky tech-demos

One Bun monorepo for small, self-contained tech demos.

## Layout

| Path | Purpose |
|------|---------|
| `apps/<slug>/` | Per-demo apps (each runnable with `bun install && bun run dev`) |
| `skills/` | Agent skills (e.g. project planning) |
| `tracking/` | Bookmark / demo tracking state |
| `AGENTS.md` | Rules for cloud agents working in this repo |
| `bunfig.toml` | Bun install defaults (`minimumReleaseAge`) |

## Conventions

- Demos only under `apps/<slug>/` — never a separate GitHub repo per demo.
- Bun is the runtime and package manager.
- Plan new demos with `skills/project-planning/`.
- Demo PRs should include a screenshot and a video of the running app.
