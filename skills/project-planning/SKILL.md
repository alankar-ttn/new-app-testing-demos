---
name: project-planning
description: Opinionated Bun + shadcn MVP planning for sticky tech demos. Use when scaffolding or scoping a new demo under apps/<slug>/.
---

# Project planning (Bun / shadcn MVP)

Plan a **single-user MVP** demo. Prefer boring, documented defaults. Output a short plan, then stop — do not implement until the plan is accepted (or the task says to proceed).

## Principles

1. **Single-user MVP** — no multi-tenant auth, teams, or billing unless explicitly required.
2. **Scaffold with Bun** — prefer `bunx create-*` (or the current Bun-recommended create command) over hand-rolling project boilerplate.
3. **Pin install freshness** — ensure root `bunfig.toml` has `[install] minimumReleaseAge = 259200` before running installs. Do not weaken or remove it.
4. **shadcn/ui, minimalist** — use shadcn/ui with a small component set; avoid design-system sprawl.
5. **Prefer prebuilt** — reuse templates, UI primitives, and existing patterns before custom infrastructure.
6. **Outcome-oriented tasks** — each task should produce a visible or testable result, not busywork.

## Plan output shape

Keep the plan short. Use exactly these sections:

### Goal
One or two sentences: what the demo proves or shows.

### MVP
Bullet list of the smallest shippable surface (screens / flows). Exclude nice-to-haves.

### Tasks
Ordered, outcome-oriented checklist (scaffold → UI shell → core interaction → polish/demo evidence).

### Stack
Concrete choices (Bun, framework, shadcn, any must-have libs). Prefer defaults from the chosen `create-*` scaffold.

### Deferred
Explicit non-goals for this PR (auth, persistence, multiplayer, etc.).
