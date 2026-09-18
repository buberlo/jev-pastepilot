# PastePilot

Explicit paste-to-action launcher that routes text to useful tools without automatic side effects.

## Status

**Milestone 2 is implemented: decision contract, exact parsers, a replaceable provider adapter, and deterministic failure paths.** Milestone 1’s offline paste panel is still the whole UI. There are still no live Jev calls, no TypeSafe client, and no deployment.

A milestone is complete only when its behaviour can be reproduced locally. Milestone 2 can: `npm install`, `npm run dev`, `npm test`, and `npm run build`.

## Product

One page. A large paste field. After paste, at most three large action buttons — or a clear “nothing fitting” / “couldn’t decide” empty state. Tap a button to see a short preview, then a single Confirm. Nothing executes without Confirm.

Pasted text is untrusted data. Content kinds stay internal; the UI never shows a taxonomy, confidence score, or provider chrome.

### Example experience

Paste a service startup error. The interface offers a log viewer (and a docs search when that tool is allowlisted). A pasted meeting proposal offers **Draft event** only. Confirm opens a local stub. Nothing is sent or scheduled.

### Model boundary

Semantic responsibility (mock or local in MS2): classify pasted text and choose one allowlisted action.

Code remains authoritative for: exact URL/date/time/parameter parsing, the DecisionResult contract, permissions, confirmation, and execution. Parsed values feed the preview; they never invent a send or schedule.

## Run locally

Requires Node.js 20+ and npm. From the repository root:

```sh
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). Paste with Ctrl+V / Cmd+V or the Paste button. There is no background clipboard watcher.

```sh
npm test
npm run build
python3 scripts/validate_scaffold.py
```

`pnpm install` / `pnpm test` / `pnpm dev` also work if you prefer pnpm; this repo commits the npm lockfile (`package-lock.json`).

The mock and local providers need no API key. Do not set or commit `TYPESAFE_API_KEY`. Milestone 2 never reads that value and never logs it.

### Failure-path demos

The page stays one paste field. These query flags only wrap the offline adapter for local checks:

```
http://localhost:5173/?scenario=timeout
http://localhost:5173/?scenario=malformed
http://localhost:5173/?scenario=stale
http://localhost:5173/?provider=local
```

On timeout, malformed output, stale `stateVersion`, or an invalid contract, the text stays editable and the page offers the same safe manual tools.

## Milestone 2 in this tree

- Exact local parsers for URLs, dates/times, and emails, separate from classification.
- Hard allowlisted action IDs. `DecisionResult` is validated in full: matching `requestId` / `stateVersion`, select requires an offered allowlisted ID, clarify/abstain carry no action.
- Replaceable adapter: `mock` (default), `local` (same offline heuristic), and a `jev` stub that is not configured. No live TypeSafe/Jev/SemIf calls.
- Fixture paths in `examples/cases.json` for select, clarify, abstain, empty, injection, timeout, malformed, and stale state.
- Provider failures leave the field editable and show a manual safe-tool list. They are not reported as semantic abstains.
- Execution gate rechecks state immediately before the local stub. Confirm is still required. The stub does not email, write a calendar, or call an external API.

## Later milestones

- **MS3** — optional live Jev adapter behind a server-side boundary, measured comparison, local provider still selectable.

See [docs/MVP.md](docs/MVP.md).

## Next (not in this milestone)

Web paste is the prototype. Later desktop surfaces — a Share Sheet, Mac Services, or a Windows tray — are the product north-star. They are **not** implemented here and must stay explicit, user-initiated entry points. No passive clipboard surveillance.

## Repository map

- [MVP and acceptance criteria](docs/MVP.md)
- [Proposed architecture](docs/ARCHITECTURE.md)
- [Evaluation plan](docs/EVALUATION.md)
- [Synthetic acceptance examples](examples/cases.json)
- [Implementation handoff](prompts/IMPLEMENT.md)
- [Project constraints](AGENTS.md)
- [External references](docs/SOURCES.md)

## Checks

| Command | What it covers |
| --- | --- |
| `npm test` | Parsers, contract validation, routing, failure paths, execution gate, UI smoke |
| `python3 scripts/validate_scaffold.py` | Fixture structure and local documentation links |

These checks do **not** measure live-model accuracy or contact TypeSafe.

Out of scope: passive clipboard surveillance, autonomous browsing, automatic email sending, and a general-purpose shell.

No GitHub Actions workflow, production deployment, or software licence has been configured. Do not treat the absence of a licence file as an open-source licence grant.
