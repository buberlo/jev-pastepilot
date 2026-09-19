# MVP: PastePilot

## Milestone 1 — Offline vertical slice

**Done in this repository.** The paste panel and six internal content kinds use deterministic mock routing and visible action previews. Domain tests and UI smoke tests cover the labelled cases in `examples/cases.json`. Local run commands are in the README.

MS1 is the offline mock. Live Jev is Milestone 3.

Implemented behaviour:

- Explicit paste only (Ctrl/Cmd+V and a Paste button). No native clipboard watcher.
- Offline mock provider with no API key.
- At most three action buttons, or a “nothing fitting” empty state with a manual fallback list.
- Preview and a single Confirm. MS1 Confirm was a local stub. Later slices wire Open link and local save; see [Local Confirm adapters](#local-confirm-adapters). Confirm never sends email, writes a calendar, or calls an external API.

## Milestone 2 — Decision contract and failure paths

**Done in this repository.** Exact parsers, allowlisted action IDs, and a replaceable provider adapter are in the domain core. Pasted content is treated as data, not application instructions.

Implemented behaviour:

- Exact URL, date/time, and email parsers feed previews and Confirm. They do not invent send or schedule actions.
- `DecisionResult` is validated in full against the current request: `requestId` and `stateVersion` must match, a `select` needs an offered allowlisted ID, and `clarify` / `abstain` carry no action.
- Adapter interface: `mock` | `local` | `jev`. The mock stays the default.
- Deterministic fixtures for select, clarify, abstain, empty, injection, timeout, malformed output, quota, and stale `stateVersion`.
- Provider failures leave the text editable and offer the manual safe-tool list. Those outcomes are operational, not semantic abstains.
- The execution gate rechecks state immediately before Confirm runs. Confirm is still required.

## Share-slice — Mac Services / URL ingest

**Done in this repository.** A thin Share path into the web app. The decision engine is not rebuilt. Web paste stays the prototype core.

Implemented behaviour:

- The Vite/React app accepts shared text via `?text=` / `?q=` and pre-fills the paste field, then auto-runs the same routing.
- A local `POST /share` (form, JSON, or plain text) redirects to the same ingest URL. Share Target–style fields: `text`, `q`, or `url`.
- Nothing auto-executes. Preview → Confirm is unchanged.
- `macos/` ships a shell wrapper, an importable Quick Action, Shortcuts install steps, and the Mac v1 app source. An **unsigned** CI `.app` is published on GitHub Releases (`mac-latest`). A notarized production `.app` is not part of this slice.
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
http://localhost:5173/?scenario=low_confidence
http://localhost:5173/?scenario=mid_confidence
```

## Milestone 3 — Live adapter and measured comparison

**Done in this repository (adapter + fail-open + fixture tests).** A server-side TypeSafe Jev adapter sits behind the existing `mock` | `local` | `jev` boundary. The UI is unchanged: one paste page, ≤3 buttons, preview → Confirm. No taxonomy, confidence dashboard, or provider chrome.

Implemented behaviour:

- `@typesafe-ai/sdk` is pinned at **0.6.0**. The adapter calls `TypeSafeClient.systemOne` with independent questions against the same paste state: a `choice()` for the allowlisted action, a `noul()` for injection/suspicion, a `noul()` for emptiness/clarity, and a `score()` for fit. Vendor types do not leak into the UI.
- Answers are combined in **code**, not in one mega-prompt. Parallel signals can only downgrade a select (never invent or upgrade an action).
- Confidence gates in code: high (≥ `JEV_CONFIDENCE_HIGH`, default 0.75) may keep a contract-valid select; mid prefers clarify / safer tools; low (< `JEV_CONFIDENCE_LOW`, default 0.45) abstains to the manual list. Unclear Noul (`JEV_UNCLEAR_YES`, default 0.7), a locally ambiguous paste, or a flat Choice margin (`JEV_CHOICE_MARGIN`, default 0.15) can still force clarify after a high Choice score. Injection and empty still abstain. Thresholds are constants, overridable via env, and covered by tests. Confidence is not proof of correctness — allowlisted IDs, `stateVersion`, and Confirm still apply. This is local policy on top of System One answers, not a vendor accuracy claim.
- Credentials are read only from the server environment (`TYPESAFE_API_KEY`). On a Mac, Settings (`⌘,`) stores that key in Keychain; the bundled app server (and `macos/run-dev-with-keychain.sh` for Vite) loads it into the process. The browser posts `DecisionRequest` to local `POST /api/decide`. The key is never committed and never logged. Paste contents are not logged by default.
- Fail-open: missing key, timeout, quota/rate-limit, or a malformed System One body leaves the text editable and shows the safe manual-tool list. The app does not crash and does not pretend a live success.
- `local` remains the optional SemIf/offline heuristic. No 4B GPU is required. Default for demos without a key: `mock`.
- Live accuracy is **not** claimed. Recorded HTTP fixtures cover adapter validation, parallel combining, and gates. A live E2E test exists and is skipped unless `TYPESAFE_API_KEY` is set locally (`src/test/jev.live.test.ts`).
- Confirm is still required. Pasted content remains untrusted data.

## Local Confirm adapters

**Done in this repository.** Confirm still never auto-runs. After the execution gate and `stateVersion` check, local adapters are wired:

- **Open link / search / maps / GitHub** — Confirm opens an allowlisted `http`/`https` URL (parsed link, DuckDuckGo, Stack Overflow, Wikipedia, Google Maps, or GitHub). `javascript:`, `data:`, `file:`, credentials, and other schemes are rejected.
- **Draft email** — Confirm opens a `mailto:` draft. Nothing is sent.
- **Save idea / task / note / markdown / code / quote / link / checklist / for later** — Confirm appends a markdown block to a local inbox (dev server: `POST /api/save` → `.local/pastepilot/inbox.md` or `PASTEPILOT_DATA_DIR`). If the server is unavailable, the browser downloads a markdown snippet.
- **Copy / draft message / extract links** — Confirm copies text or parsed URLs.
- **Draft event / format JSON / open log viewer** — Confirm writes a local `.ics`, `.json`, or `.log` file (`POST /api/export`, or a browser download).

No email send, calendar write, or other network write. The catalogue is ~24 allowlisted tools; the UI still shows at most three buttons. Share ingest is unchanged: fill the field, route, preview, Confirm.

Live accuracy is not claimed in this repository. Documented model alias: `jev-latest` → `jev-1.13.0` per official TypeSafe docs (checked 2026-09-19). Pin `TYPESAFE_MODEL=jev-1.13.0` if you have tuned gates against that version; the alias can move. The response `model` field reports the versioned id. Measure routing on your own labelled set; do not substitute a vendor claim.

## Mac Settings (Keychain)

**Done in this repository.** The SwiftUI Settings window (`PastePilot → Settings…`, `⌘,`) stores `TYPESAFE_API_KEY` in the macOS Keychain only (service `local.pastepilot.typesafe`). Model, provider, and server URL go to UserDefaults. The key is never on `/?text=`, never in git, never in the release zip, and never logged. The Mac v1 app injects the key into its bundled server. `macos/run-dev-with-keychain.sh` still loads the key for the Vite prototype. The web app still uses `.env` or server env.

## Mac v1 — in-app UI + bundled server

**Done in this repository.** `PastePilot.app` is no longer Settings-only. The main window is a WKWebView that loads the same PastePilot UI from a localhost-only Node server bundled in the app (production Vite build + `server.mjs` + official Node binary). The server starts on launch and stops on quit. Services and `pastepilot://ingest` open or focus that window with `?text=`; they do not open a browser. Confirm is still required. A Linux VM cannot run the `.app`; `macos-latest` CI produces the zip.

## Unsigned Mac release CI

**Done in this repository.** [`.github/workflows/mac-release.yml`](../.github/workflows/mac-release.yml) runs on `macos-latest`, bundles the web UI and Node runtime, and publishes `PastePilot-mac.zip`. Every push to `main` replaces the rolling tag [`mac-latest`](https://github.com/buberlo/jev-pastepilot/releases/tag/mac-latest). The build is ad-hoc / not notarized. First launch: Gatekeeper **right-click → Open**. The workflow does not read `TYPESAFE_API_KEY` and the zip must not contain a key assignment.

### Remaining north-star

- A notarized / Developer ID–signed Mac `.app` (the unsigned Mac v1 zip is already published).
- A Windows tray / Share target that opens the same `/?text=` URL.
- More tool integrations beyond the expanded local catalogue, each with its own permission and confirmation flow.
- Live TypeSafe measurement on a labelled set (not claimed in this repository).

## Acceptance criteria

- Pasting or sharing alone never executes a tool or transmits data to an unrelated service. Selecting `jev` sends the paste to TypeSafe for routing only, via the local server adapter.
- Date, URL and parameter values come from parsers or explicit confirmation.
- Commands embedded in pasted content cannot expand permissions.
- Provider errors leave the text editable and allow manual tool selection.
- No clipboard content is retained in logs by default.

## Explicit exclusions

Passive clipboard surveillance, autonomous browsing, automatic email sending and a general-purpose shell.

## Delivery boundary

Milestones 1–3, the Share-slice, local Confirm adapters, Mac Settings, Mac v1 (in-app UI + bundled server), and unsigned release CI are implemented and can be reproduced with the README commands. Remaining north-star surfaces (notarization, Windows, more tools) are not part of this milestone.
