# React Three Fiber yard

A one-page logistics yard. Trucks carry orders between four depots on a 3D map. Pause the yard, change the playback speed, add an order, and click a truck to read its route.

The scene is React Three Fiber (`@react-three/fiber` and `@react-three/drei`) on Vite. Nothing here calls an API or needs a key.

## Run

```bash
cd apps/react-three-fiber-demo
bun install
bun run dev
```

Open http://127.0.0.1:3000.

`bun run dev` serves the app at `/`. The demo hub and Vercel serve it at `/demos/react-three-fiber-demo/`. Set `DEMO_BASE_PATH` only when you want that prefix locally.

1. Drag to orbit the yard. Trucks loop the colored roads.
2. Press **Pause**, then move the speed slider and press **Play**.
3. Press **Add order** to put another truck on a route.
4. Click a truck. The panel shows its order, depots, and progress. Click the ground to clear it.

## Checks

```bash
bun test
bun run typecheck
bun run build
```

`bun test` covers the route math: length, position along a path, looping progress, and the orders the yard starts with.

## Deploy on Vercel

This demo is a static Vite service. The hub registry lists `framework: "vite"`. A production build has `VERCEL=1`, so Vite `base` is `/demos/react-three-fiber-demo/` and the build also copies `dist/` to `dist/demos/react-three-fiber-demo/` so those asset URLs resolve. The service rewrites `/demos/react-three-fiber-demo/assets/:path*` to `/assets/:path*` as a second way to find the same files.
