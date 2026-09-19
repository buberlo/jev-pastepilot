# PastePilot

Explicit paste-to-action launcher that routes text to useful tools without automatic side effects.

## Status

**Share-slice is implemented:** the MS2 offline app accepts shared text via `?text=` / `?q=` (and a local `POST /share` target) and a thin macOS Services / Shortcuts wrapper opens that URL. Milestone 2’s decision contract, parsers, and adapters are unchanged.

There are still no live Jev calls, no TypeSafe client, and no deployment. Milestone 3 (live provider) is not done.

A milestone is complete only when its behaviour can be reproduced locally. This slice can: `npm install`, `npm run dev`, `npm test`, and `npm run build`.

## Product

One page. A large paste field. After paste **or Share**, at most three large action buttons — or a clear “nothing fitting” / “couldn’t decide” empty state. Tap a button to see a short preview, then a single Confirm. Nothing executes without Confirm.

Pasted or shared text is untrusted data. Content kinds stay internal; the UI never shows a taxonomy, confidence score, or provider chrome.

End-state is a context menu / Share surface (Phone Share Sheet + Mac Services). Web paste stays the prototype core. This slice makes select/copy → ≤3 actions feel native on Mac without rebuilding the decision engine.

### Example experience

Paste or Share a service startup error. The interface offers a log viewer (and a docs search when that tool is allowlisted). A meeting proposal offers **Draft event** only. Confirm opens a local stub. Nothing is sent or scheduled.

### Model boundary

Semantic responsibility (mock or local in MS2): classify pasted text and choose one allowlisted action.

Code remains authoritative for: exact URL/date/time/parameter parsing, the DecisionResult contract, permissions, confirmation, and execution. Parsed values feed the preview; they never invent a send or schedule.

## Run locally (web)

Requires Node.js 20+ and npm. From the repository root:

```sh
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). Paste with Ctrl+V / Cmd+V or the Paste button. There is no background clipboard watcher.

Share ingest (same mock routing, still preview → Confirm):

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

```sh
npm test
npm run build
python3 scripts/validate_scaffold.py
```

`pnpm install` / `pnpm test` / `pnpm dev` also work if you prefer pnpm; this repo commits the npm lockfile (`package-lock.json`).

The mock and local providers need no API key. Do not set or commit `TYPESAFE_API_KEY`. The app never reads that value and never logs it.

### Failure-path demos

The page stays one paste field. These query flags only wrap the offline adapter for local checks. They combine with share ingest:

```
http://localhost:5173/?scenario=timeout
http://localhost:5173/?scenario=malformed
http://localhost:5173/?scenario=stale
http://localhost:5173/?provider=local
http://localhost:5173/?scenario=timeout&text=Service%20failed
```

On timeout, malformed output, stale `stateVersion`, or an invalid contract, the text stays editable and the page offers the same safe manual tools.

## macOS Share / Services

Exact install steps: [macos/README.md](macos/README.md).

Short version:

1. Keep `npm run dev` running.
2. `./macos/share-to-pastepilot.sh --print-url "your text"` proves the URL.
3. On a Mac, install the Automator Quick Action from [`macos/PastePilot.applescript`](macos/PastePilot.applescript), or a Shortcut that runs [`macos/share-to-pastepilot.sh`](macos/share-to-pastepilot.sh).
4. Optional: build the Swift Service on a Mac with [`macos/PastePilotService/build.sh`](macos/PastePilotService/build.sh). This cloud/Linux environment cannot produce the `.app`.

Select text → Services / Shortcut → browser opens with the field filled and ≤3 actions. Confirm is still required.

`--clipboard` on the shell script is an explicit flag only. No passive clipboard surveillance.

## Windows

Later: a tray app or Share target can open the same `/?text=` URL. **Not built in this slice.**

## What is done vs next

| Slice | Status |
| --- | --- |
| **MS1** — offline paste panel, ≤3 actions, preview → Confirm | Done |
| **MS2** — parsers, DecisionResult contract, replaceable adapter, failure paths | Done (unchanged) |
| **Share-slice** — URL / `POST /share` ingest + thin Mac Services / Shortcuts wrapper | Done |
| **MS3** — live Jev adapter, measured comparison, local provider still selectable | Not started |

See [docs/MVP.md](docs/MVP.md).

## Milestone 2 contract (still in this tree)

- Exact local parsers for URLs, dates/times, and emails, separate from classification.
- Hard allowlisted action IDs. `DecisionResult` is validated in full: matching `requestId` / `stateVersion`, select requires an offered allowlisted ID, clarify/abstain carry no action.
- Replaceable adapter: `mock` (default), `local` (same offline heuristic), and a `jev` stub that is not configured. No live TypeSafe/Jev/SemIf calls.
- Fixture paths in `examples/cases.json` for select, clarify, abstain, empty, injection, timeout, malformed, and stale state.
- Provider failures leave the field editable and show a manual safe-tool list. They are not reported as semantic abstains.
- Execution gate rechecks state immediately before the local stub. Confirm is still required. The stub does not email, write a calendar, or call an external API.

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
| `npm test` | Parsers, contract, routing, failure paths, URL/share ingest, Mac wrapper URL, UI smoke |
| `python3 scripts/validate_scaffold.py` | Fixture structure and local documentation links |

These checks do **not** measure live-model accuracy or contact TypeSafe.

Out of scope: passive clipboard surveillance, autonomous browsing, automatic email sending, and a general-purpose shell.

No GitHub Actions workflow, production deployment, or software licence has been configured. Do not treat the absence of a licence file as an open-source licence grant.
