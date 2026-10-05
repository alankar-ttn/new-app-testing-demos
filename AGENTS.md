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
