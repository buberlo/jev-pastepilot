# PastePilot

Explicit paste-to-action launcher that routes text to useful tools without automatic side effects.

## Status

**Milestone 1 is implemented: an offline, locally usable paste panel.** This repository now contains a TypeScript React/Vite app with deterministic mock routing, action previews, and an explicit confirm step. There are still no live Jev calls, no TypeSafe client, and no deployment.

A milestone is complete only when its behaviour can be reproduced locally. Milestone 1 can: `npm install`, `npm run dev`, and `npm test`.

## Product

One page. A large paste field. After paste, at most three large action buttons — or a clear “nothing fitting” empty state. Tap a button to see a short preview, then a single Confirm. Nothing executes without Confirm.

Pasted text is untrusted data. Content kinds stay internal; the UI never shows a taxonomy, confidence score, or provider chrome.

### Example experience

Paste a service startup error. The interface offers a log viewer (and a docs search when that tool is allowlisted). A pasted meeting proposal offers **Draft event** only. Confirm opens a local stub. Nothing is sent or scheduled.

### Model boundary

Semantic responsibility (mock in MS1): classify pasted text and choose suitable actions from an allowlisted catalogue.

Code remains authoritative for: exact URL/date parsing, permissions, tool parameters, confirmation screens and execution.

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

The mock provider needs no API key. Do not set or commit `TYPESAFE_API_KEY`. Milestone 1 never reads `.env` for model access.

## Milestone 1 in this tree

- Explicit paste input only (keyboard paste + Paste button).
- Deterministic mock decision provider (offline, no network).
- Six internal content kinds, mapped to allowlisted tool IDs. At most three suggestions are shown.
- Preview + Confirm before a local execution stub (toast / on-page preview). No email, calendar write, or external API.
- `examples/cases.json` paths: clarify shows fewer buttons; abstain shows the empty state plus a manual list of safe tools.
- Domain tests for routing and UI smoke tests for the paste panel.

## Later milestones

- **MS2** — exact parsers as a harder contract, allowlisted action IDs, provider adapter, and the remaining failure paths (malformed output, timeout, stale state beyond the local gate).
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
| `npm test` | Domain routing, execution gate, UI smoke |
| `python3 scripts/validate_scaffold.py` | Fixture structure and local documentation links |

These checks do **not** measure live-model accuracy or contact TypeSafe.

Out of scope: passive clipboard surveillance, autonomous browsing, automatic email sending, and a general-purpose shell.

No GitHub Actions workflow, production deployment, or software licence has been configured. Do not treat the absence of a licence file as an open-source licence grant.
