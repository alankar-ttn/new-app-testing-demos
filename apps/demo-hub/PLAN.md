### Goal
Show every sticky demo from one page on one Vercel project, with each app still runnable on its own.

### MVP
- Home page that lists each registered demo and links to `/demos/<slug>/`.
- Root Vercel Services config generated from that registry.
- TanStack Start and Pi Durable keep `bun run dev` at `/`, and use `/demos/<slug>/` when mounted.

### Tasks
1. Write this plan.
2. Scaffold a Bun + Vite + React hub with the same shadcn-style card shell as the other demos.
3. Add `demos.json` and generate root `vercel.json` services and rewrites from it.
4. Teach the two existing demos a production base path without changing their local root URL.
5. Run the hub, open a demo, and capture a screenshot and video.

### Stack
- Bun, Vite, React, TypeScript
- Tailwind CSS and the existing shadcn-style button, card, and badge
- Vercel Services (Beta) in root `vercel.json`, Root Directory = repository root

### Deferred
Auth, a shared design system package, per-demo Vercel projects, and Cloudflare.
