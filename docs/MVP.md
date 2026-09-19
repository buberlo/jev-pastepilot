# MVP: PastePilot

## Milestone 1 — Offline vertical slice

**Done in this repository.** The paste panel and six internal content kinds use deterministic mock routing and visible action previews. Domain tests and UI smoke tests cover the labelled cases in `examples/cases.json`. Local run commands are in the README.

MS1 is the offline mock. Live Jev is Milestone 3.

Implemented behaviour:

- Explicit paste only (Ctrl/Cmd+V and a Paste button). No native clipboard watcher.
- Offline mock provider with no API key.
- At most three action buttons, or a “nothing fitting” empty state with a manual fallback list.
- Preview and a single Confirm before a local execution stub. Confirm never sends email, writes a calendar, or calls an external API.

## Milestone 2 — Decision contract and failure paths

**Done in this repository.** Exact parsers, allowlisted action IDs, and a replaceable provider adapter are in the domain core. Pasted content is treated as data, not application instructions.

Implemented behaviour:

- Exact URL, date/time, and email parsers feed previews and Confirm. They do not invent send or schedule actions.
- `DecisionResult` is validated in full against the current request: `requestId` and `stateVersion` must match, a `select` needs an offered allowlisted ID, and `clarify` / `abstain` carry no action.
- Adapter interface: `mock` | `local` | `jev`. The mock stays the default.
- Deterministic fixtures for select, clarify, abstain, empty, injection, timeout, malformed output, quota, and stale `stateVersion`.
- Provider failures leave the text editable and offer the manual safe-tool list. Those outcomes are operational, not semantic abstains.
- The execution gate rechecks state immediately before the local stub. Confirm is still required.

## Share-slice — Mac Services / URL ingest

**Done in this repository.** A thin Share path into the web app. The decision engine is not rebuilt. Web paste stays the prototype core.

Implemented behaviour:

- The Vite/React app accepts shared text via `?text=` / `?q=` and pre-fills the paste field, then auto-runs the same routing.
- A local `POST /share` (form, JSON, or plain text) redirects to the same ingest URL. Share Target–style fields: `text`, `q`, or `url`.
- Nothing auto-executes. Preview → Confirm is unchanged.
- `macos/` ships a shell wrapper, an Automator/Services AppleScript, Shortcuts install steps, and optional Swift Service source. A signed production `.app` is not part of this slice; URL ingest proves the loop.
- Clipboard is read only on explicit invoke (`--clipboard` or the current Services selection). No watcher.
- Windows tray / Share is documented as later work and is not built.

Install and run: [README](../README.md) and [macos/README.md](../macos/README.md).

Useful local URLs (web paste stays one page; query flags only wrap the adapter):

```
http://localhost:5173/?text=Service%20failed%3A%20connection%20refused%20on%20the%20database%20socket.
http://localhost:5173/?provider=local
http://localhost:5173/?provider=jev
http://localhost:5173/?scenario=timeout
http://localhost:5173/?scenario=malformed
http://localhost:5173/?scenario=quota
```

## Milestone 3 — Live adapter and measured comparison

**Done in this repository (adapter + fail-open + fixture tests).** A server-side TypeSafe Jev adapter sits behind the existing `mock` | `local` | `jev` boundary. The UI is unchanged: one paste page, ≤3 buttons, preview → Confirm. No taxonomy, confidence, or provider chrome.

Implemented behaviour:

- `@typesafe-ai/sdk` is pinned at **0.6.0**. The adapter calls `TypeSafeClient.systemOne` with a documented `choice()` question. Vendor types do not leak into the UI.
- Credentials are read only from the server environment (`TYPESAFE_API_KEY`). The browser posts `DecisionRequest` to local `POST /api/decide`. The key is never committed and never logged. Paste contents are not logged by default.
- Fail-open: missing key, timeout, quota/rate-limit, or a malformed System One body leaves the text editable and shows the safe manual-tool list. The app does not crash and does not pretend a live success.
- `local` remains the optional SemIf/offline heuristic. No 4B GPU is required. Default for demos without a key: `mock`.
- Live accuracy is **not** claimed. Recorded HTTP fixtures cover adapter validation. A live E2E test exists and is skipped unless `TYPESAFE_API_KEY` is set locally (`src/test/jev.live.test.ts`).
- Confirm is still required. The stub still does not email, write a calendar, or call an external API. Pasted content remains untrusted data.

Live accuracy is not claimed in this repository. Documented model alias: `jev-latest` → `jev-1.13.0` per official TypeSafe docs (checked 2026-09-19). Measure routing on your own labelled set; do not substitute a vendor claim.

### Remaining north-star (not MS3)

- A real signed Mac `.app` / production Services build (the Share-slice is a thin wrapper + URL ingest).
- A Windows tray / Share target that opens the same `/?text=` URL.
- More tool integrations, each with its own permission and confirmation flow.

## Acceptance criteria

- Pasting or sharing alone never executes a tool or transmits data to an unrelated service. Selecting `jev` sends the paste to TypeSafe for routing only, via the local server adapter.
- Date, URL and parameter values come from parsers or explicit confirmation.
- Commands embedded in pasted content cannot expand permissions.
- Provider errors leave the text editable and allow manual tool selection.
- No clipboard content is retained in logs by default.

## Explicit exclusions

Passive clipboard surveillance, autonomous browsing, automatic email sending and a general-purpose shell.

## Delivery boundary

Milestones 1–3 and the Share-slice are implemented and can be reproduced with the README commands. Remaining north-star surfaces are not part of this milestone.
