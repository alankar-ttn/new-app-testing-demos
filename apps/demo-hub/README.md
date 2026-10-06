# Demo hub

Home page for this monorepo. It lists every demo in [`demos.json`](./demos.json) and links to `/demos/<slug>/` on the same domain.

## Run

```bash
cd apps/demo-hub
bun install
bun run dev
```

That starts the hub on http://127.0.0.1:3000 and the registered demos behind it, mounted at their `/demos/<slug>/` paths. Each demo can still be run on its own, at `/`, with `bun install && bun run dev` inside that demo's directory.

`bun run dev:only` starts the hub page without the other apps.

## Add a demo

1. Put the app in `apps/<slug>/`. Local `bun run dev` should keep serving `/`. When `VERCEL=1`, serve the app at `/demos/<slug>/` (asset base and router base). `DEMO_BASE_PATH` overrides that for local hub proxying.
2. Add one object to `apps/demo-hub/demos.json` (`slug`, `name`, `description`, `framework`).
3. From this directory, run `bun run sync-vercel` and commit the updated root `vercel.json`.

`framework` is `tanstack-start`, `bun`, or `vite`. The hub test checks that `vercel.json` still matches the registry.

## Deploy

One Vercel project. **Root Directory** is the repository root (empty / `.`), not `apps/demo-hub`. Root `vercel.json` uses [Vercel Services](https://vercel.com/docs/services) (Beta, all plans) so this hub and every registered demo ship in that same deployment. Pushing `master` deploys all of them. Do not change Root Directory per app.
