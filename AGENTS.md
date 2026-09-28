# Prototype Instructions

## Approved product decisions

New planners must start empty. Do not seed sample tasks, completed work or progress into a user's plan. Preserve existing saved tasks and notes when upgrading.

The user approved the charcoal-and-amber combined visual: sidebar, outline notification bell, priorities on the left, schedule on the right, and the full-width Daily note. Preserve that structure. Provide Evening, Coffee, Botanical, Retro, Ocean, Sky, and Neon Punk themes with thoughtful bundled font pairings and independent font controls. Keep task text readable in every theme. This release is for ages 13+; only verified Gmail accounts may use the eventual cloud service. Be explicit that the unconfigured build stores data locally. Never substitute fake accounts or family progress for real integration.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
