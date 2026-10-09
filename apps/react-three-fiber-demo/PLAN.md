### Goal
Show a single-user logistics yard in the browser with React Three Fiber: orders travel a 3D map, and a small overlay can pause them, change speed, add one, and inspect a truck.

### MVP
- One full-viewport scene: ground and grid, four depot meshes, roads, and a few trucks looping between depots.
- OrbitControls, a directional light, and shadows.
- HTML overlay: play/pause, speed, add order, and stats. Click a truck to highlight it and show its order.
- Local `bun run dev` on port 3000 at `/`. Production uses Vite `base` `/demos/react-three-fiber-demo/`.

### Features
- Depots at fixed yard positions, with roads that bend on one axis at a time.
- Trucks animate with pure route math (polyline length, point along a path, looping progress) so the motion can be tested without WebGL.
- Click a truck (or its row in the overlay) to select it. Click empty ground to clear the selection.
- No accounts, API keys, or backend.

### Tasks
1. Write this plan.
2. Scaffold a Bun + Vite + React + TypeScript app that matches the other demos' base-path and shadcn overlay.
3. Add the yard scene, overlay controls, and route tests.
4. Register the demo, regenerate root `vercel.json`, and move the bookmark into `built`.
5. Pass test, typecheck, and build, then capture a screenshot and a short recording.

### Stack
- Bun, Vite, React 19, TypeScript
- `@react-three/fiber` 9.8.1, `@react-three/drei` 10.7.9, `three` 0.186.1
- Tailwind CSS and the existing shadcn-style button, card, and badge
- Vercel static Vite service (`framework: "vite"`, `outputDirectory: "dist"`)

The shell follows the other demos instead of a stock `create-vite` app so the mount path, port, and dependency pins stay the same. Root `bunfig.toml` keeps `[install] minimumReleaseAge = 259200`.

### File layout
```
apps/react-three-fiber-demo/
  PLAN.md
  README.md
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  components.json
  src/main.tsx
  src/mount.ts
  src/styles.css
  src/sim/routes.ts          route math
  src/sim/world.ts           depots and orders
  src/components/demo-app.tsx
  src/components/scene.tsx
  src/components/overlay.tsx
  test/routes.test.ts
  test/world.test.ts
  test/mount.test.ts
```

### How to run
```bash
cd apps/react-three-fiber-demo
bun install
bun run dev
```
Open http://127.0.0.1:3000. `bun test`, `bun run typecheck`, and `bun run build` are the checks. A Vercel build sets `VERCEL=1`, so asset URLs are prefixed with `/demos/react-three-fiber-demo/`.

### Acceptance checks
- `bun test`, `bun run typecheck`, and `bun run build` pass.
- The dev server shows a yard, moving trucks, orbit, play/pause, speed, add order, and a selection panel.
- `apps/demo-hub/demos.json` lists slug `react-three-fiber-demo` with framework `vite`.
- Root `vercel.json` matches `bun run sync-vercel`, and `apps/demo-hub` tests still pass.
- `tracking/seen-bookmarks.json` lists bookmark `2100545585342238945` under `built`.

### Deferred
Auth, saved games, a routing API, glTF models, multiplayer, and a second Vercel project.
