# PastePilot

Explicit paste-to-action launcher that routes text to useful tools without automatic side effects.

## Status

**Milestone 3 is implemented:** a server-side TypeSafe Jev adapter behind the existing `mock` | `local` | `jev` boundary, with fail-open behaviour and recorded HTTP fixture tests. The Share-slice (URL ingest + thin Mac wrapper) and the MS2 decision contract stay in place.

The UI is still one paste page: ≤3 action buttons, preview → Confirm. No taxonomy, confidence, or provider chrome.

A milestone is complete only when its behaviour can be reproduced locally. This tree can: `npm install`, `npm run dev`, `npm test`, and `npm run build`.

Live accuracy is **not** claimed here. This environment had no `TYPESAFE_API_KEY`, so no live TypeSafe call was made. Adapter tests use mocked HTTP fixtures. A live E2E test exists and is skipped without a local key.

## Product

One page. A large paste field. After paste **or Share**, at most three large action buttons — or a clear “nothing fitting” / “couldn’t decide” empty state. Tap a button to see a short preview, then a single Confirm. Nothing executes without Confirm.

Pasted or shared text is untrusted data. Content kinds stay internal; the UI never shows a taxonomy, confidence score, or provider chrome.

### Example experience

Paste or Share a service startup error. The interface offers a log viewer (and a docs search when that tool is allowlisted). A meeting proposal offers **Draft event** only. Confirm opens a local stub. Nothing is sent or scheduled.

### Model boundary

Semantic responsibility: classify pasted text and choose one allowlisted action (`mock`, `local`, or live `jev`).

Code remains authoritative for: exact URL/date/time/parameter parsing, the DecisionResult contract, permissions, confirmation, and execution. Parsed values feed the preview; they never invent a send or schedule.

## Run locally (web)

Requires Node.js 20+ and npm. From the repository root:

```sh
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). Paste with Ctrl+V / Cmd+V or the Paste button. There is no background clipboard watcher.

Default provider is **mock**. No API key is required.

```sh
npm test
npm run build
python3 scripts/validate_scaffold.py
```

`pnpm install` / `pnpm test` / `pnpm dev` also work if you prefer pnpm; this repo commits the npm lockfile (`package-lock.json`).

### Enable live Jev

1. Copy [`.env.example`](.env.example) to a local `.env` (gitignored). Never commit a real key.
2. Set the server credential only:

```sh
export TYPESAFE_API_KEY=…   # do not commit, do not log
```

3. Switch the provider (query wins; env is the default when the query is omitted):

```sh
# one-off in the URL
http://localhost:5173/?provider=jev

# or start with an env default (still no UI chrome)
DECISION_PROVIDER=jev TYPESAFE_API_KEY=… npm run dev
```

The browser never sees the key. It posts a domain `DecisionRequest` to local `POST /api/decide`. The Vite server adapter uses pinned `@typesafe-ai/sdk@0.6.0` and `TypeSafeClient.systemOne` (`choice` question). Documented default model: `jev-latest` (currently `jev-1.13.0`). Override with `TYPESAFE_MODEL` if you pin a version.

Selecting `jev` sends the pasted text to TypeSafe for routing only. Confirm still stays on the local stub: no email, calendar, or other external write.

**Measure live accuracy yourself.** Do not treat a vendor claim, confidence score, or this README as a measured result. If you run a live call, record the SDK version (`0.6.0`) and the response `model` field with the sample.

Live E2E (skipped without a key):

```sh
TYPESAFE_API_KEY=… npm test
```

See `src/test/jev.live.test.ts` — marked **requires local key**.

### Switch provider

| How | Result |
| --- | --- |
| *(default)* | `mock` — offline heuristic, no key, no network |
| `?provider=local` or `DECISION_PROVIDER=local` | Same offline heuristic, labelled `local` (optional SemIf stand-in; no GPU) |
| `?provider=jev` or `DECISION_PROVIDER=jev` | Live adapter via `/api/decide` |

Without a key, `jev` fail-opens: the field stays editable and the page offers the safe manual tools. It does not crash and does not pretend a live success.

### Failure-path demos

The page stays one paste field. These query flags wrap the adapter for local checks. They combine with share ingest:

```
http://localhost:5173/?scenario=timeout
http://localhost:5173/?scenario=malformed
http://localhost:5173/?scenario=quota
http://localhost:5173/?scenario=stale
http://localhost:5173/?provider=local
http://localhost:5173/?provider=jev
http://localhost:5173/?scenario=timeout&text=Service%20failed
```

On timeout, malformed output, quota, stale `stateVersion`, missing key, or an invalid contract, the text stays editable and the page offers the same safe manual tools.

Share ingest (same routing, still preview → Confirm):

```
http://localhost:5173/?text=Service%20failed%3A%20connection%20refused%20on%20the%20database%20socket.
http://localhost:5173/?q=Lass%20uns%20morgen%20%C3%BCber%20das%20Projekt%20sprechen.
```

```sh
curl -sS -D - -o /dev/null -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "text=An app that lets me assemble virtual model kits." \
  http://localhost:5173/share
```

## macOS Share / Services

Exact install steps: [macos/README.md](macos/README.md).

Short version:

1. Keep `npm run dev` running.
2. `./macos/share-to-pastepilot.sh --print-url "your text"` proves the URL.
3. On a Mac, install the Automator Quick Action from [`macos/PastePilot.applescript`](macos/PastePilot.applescript), or a Shortcut that runs [`macos/share-to-pastepilot.sh`](macos/share-to-pastepilot.sh).
4. Optional: build the Swift Service on a Mac with [`macos/PastePilotService/build.sh`](macos/PastePilotService/build.sh). This cloud/Linux environment cannot produce the `.app`.

Select text → Services / Shortcut → browser opens with the field filled and ≤3 actions. Confirm is still required.

`--clipboard` on the shell script is an explicit flag only. No passive clipboard surveillance.

## What is done vs next

| Slice | Status |
| --- | --- |
| **MS1** — offline paste page, ≤3 actions, preview → Confirm | Done |
| **MS2** — parsers, DecisionResult contract, replaceable adapter, failure paths | Done |
| **Share-slice** — URL / `POST /share` ingest + thin Mac Services / Shortcuts wrapper | Done |
| **MS3** — server-side Jev adapter, fail-open, fixture tests, local provider still selectable | Done |
| **North-star** — real signed Mac `.app`, Windows tray / Share target, more tool integrations | Not started |

See [docs/MVP.md](docs/MVP.md).

## Milestone 3 in this tree

- Server-side TypeSafe adapter (`src/server/`) behind `createProvider("jev")`. The UI imports no `@typesafe-ai/sdk` types.
- Credentials from `TYPESAFE_API_KEY` only. Never committed. Never logged. Paste contents are not logged by default (`logLevel: "off"` on the SDK client).
- Fail-open on missing key, timeout, quota, and malformed System One responses.
- `local` remains selectable; no GPU required. Default without a key: `mock`.
- Pinned SDK `@typesafe-ai/sdk@0.6.0`. Documented model `jev-latest` / `jev-1.13.0`. No live call was made in the agent environment.
- Confirm is still required. The stub does not email, write a calendar, or call an external API.

## Repository map

- [MVP and acceptance criteria](docs/MVP.md)
- [Proposed architecture](docs/ARCHITECTURE.md)
- [Evaluation plan](docs/EVALUATION.md)
- [Synthetic acceptance examples](examples/cases.json)
- [macOS Share / Services](macos/README.md)
- [Implementation handoff](prompts/IMPLEMENT.md)
- [Project constraints](AGENTS.md)
- [External references](docs/SOURCES.md)

## Checks

| Command | What it covers |
| --- | --- |
| `npm test` | Parsers, contract, routing, failure paths, Jev adapter fixtures, URL/share ingest, Mac wrapper URL, UI smoke |
| `python3 scripts/validate_scaffold.py` | Fixture structure, local documentation links, SDK stays server-side |

These checks do **not** measure live-model accuracy. They do not contact TypeSafe unless you set `TYPESAFE_API_KEY` and run the skipped live E2E.

Out of scope: passive clipboard surveillance, autonomous browsing, automatic email sending, and a general-purpose shell.

No GitHub Actions workflow, production deployment, or software licence has been configured. Do not treat the absence of a licence file as an open-source licence grant.
