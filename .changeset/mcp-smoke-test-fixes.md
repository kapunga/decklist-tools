---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Fix three MCP server issues surfaced by smoke testing:

- `get_deck` now accepts a deck name again (case-insensitive) in addition to a UUID. The handler branches on UUID format instead of speculatively calling `Storage.getDeck`, which throws `Invalid deck ID format` on non-UUID input. Exposes a new `isValidUUID` helper from `@mtg-deckbuilder/shared`.
- `manage_interest_list`, `manage_card`, and `manage_commander` now error out on a `name` / `set_code` + `collector_number` mismatch instead of silently adding the wrong printing. Matching is case-insensitive and accepts canonical name, flavor name (e.g. Final Fantasy crossover flavor names), and any face name for DFCs/MDFCs. Pass `force: true` to override.
- `get_deck` payloads are substantially smaller. All MCP tool responses are now minified JSON (previously pretty-printed with 2-space indent) — this alone cuts `get_deck` for a 100-card commander deck from ~71 KB to ~41 KB with no shape change. `get_deck` also gains a `detail: "summary" | "full"` parameter defaulting to `summary`, which strips per-entry `id`, `addedAt`, `source`, and `pulledPrintings` — fields only useful for surgical edits or collection-pull tracking. A summary-minified commander deck is ~20 KB; `detail: "full"` preserves the previous shape.

Also tightens the MCP test suite's mock `Storage` to mirror the real class's UUID-validation contract, so future regressions in this area are visible in CI.
