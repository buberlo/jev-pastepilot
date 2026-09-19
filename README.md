# PastePilot

Paste or share some text. Get a few useful actions. Confirm before anything happens.

<video src="docs/demo/pastepilot-core.mp4" controls playsinline muted width="720" title="PastePilot: paste text, pick an action, confirm">
</video>

[Watch the 9-second demo](docs/demo/pastepilot-core.mp4) — paste a log line → a few buttons → preview → Confirm. Nothing runs until you say so. The clip is silent and uses the offline mock (no API key).

![After paste, PastePilot offers at most three actions](docs/demo/paste-actions.png)

![Preview, then a single Confirm](docs/demo/preview-confirm.png)

PastePilot is a small launcher, not a chatbot. You give it text. It suggests at most three things you might do with that text. You pick one, read a short preview, and tap Confirm. Until then, nothing is sent, scheduled, or written.

## What it is

You paste (or Share) a log line, a meeting note, a link, or an idea. PastePilot offers a short list of allowlisted actions — for example **Open link**, **Draft event**, or **Save idea**. Tap a button to see a preview. Confirm is required.

**What Confirm does now**

- **Open link** — opens the first parsed `http` or `https` URL in your browser. Other schemes (`javascript:`, `data:`, `file:`, …) and URLs with passwords are blocked.
- **Save idea / Save as task / Save note** — appends the text to a local inbox file (`.local/pastepilot/inbox.md` when you use `npm run dev`, or a download if the local server is not there). Set `PASTEPILOT_DATA_DIR` to choose another folder.
- **Everything else** (draft event, log viewer, search docs) is still a local stub.

Confirm never sends email, writes a calendar, or calls an external API. Opening the URL you confirmed is the only network step.

Routing is typed: a classifier picks from a fixed tool list. Exact dates, URLs, and emails are parsed in ordinary code and shown in the preview. They never invent a send or a schedule.

## Why it exists

Most “do something with this text” tools either chat at you or quietly act on a clipboard. PastePilot is the opposite.

- You start it. It does not watch the clipboard in the background.
- It routes to a short allowlist of tools, not a general agent.
- If it cannot decide, the text stays put and you pick a safe tool yourself.
- Confirm is a gate, not a formality.

## Where it is going

The product we want feels like a Share Sheet, a Mac Services item, or a right-click: select text, send it to PastePilot, pick one action.

The web paste page is the working prototype of that loop. A thin Mac Share / Services path already opens the same page with the text filled in.

## What it is not

- **Not clipboard spyware.** No background watcher. Paste and Share are explicit.
- **Not auto-email or auto-calendar.** Confirm never sends or schedules.
- **Not an autonomous agent.** No browsing, no shell, no silent writes.

## Quick start

Needs Node.js 20+ and npm. The default mock router needs **no API key**.

```sh
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Paste with Ctrl+V / Cmd+V or the **Paste** button.

```sh
npm test
npm run build
python3 scripts/validate_scaffold.py
```

`pnpm install` / `pnpm test` / `pnpm dev` also work if you prefer pnpm. This repo commits the npm lockfile (`package-lock.json`).

## Live Jev (optional)

Default routing is the offline mock. To try live TypeSafe Jev routing:

1. Copy [`.env.example`](.env.example) to a local `.env` (gitignored).
2. Set `TYPESAFE_API_KEY` there or in your shell. Never commit a real key. Never log it.
3. Open `http://localhost:5173/?provider=jev`, or start with `DECISION_PROVIDER=jev npm run dev`.

The browser never sees the key. It posts a routing request to local `POST /api/decide`. Selecting Jev sends the pasted text to TypeSafe for **routing only**. Confirm still uses the local adapters above.

If the key is missing or the call fails (timeout, malformed body, HTTP 429), PastePilot **fail-opens**: the text stays editable and you get the same safe manual tools. It does not crash and does not pretend a live success.

**Decision layer.** One System One call asks several independent questions against the same paste: a Choice for the allowlisted action, a Noul for injection/suspicion, a Noul for emptiness/clarity, and a Score for fit. Code combines those answers. Confidence is a gate, not proof: high (default ≥ 0.75) may keep a select; mid prefers clarify; low (default < 0.45) abstains to the manual tools. Thresholds are constants in `src/domain/decisionLayer.ts`, overridable with `JEV_*` env vars (see `.env.example`). Allowlisted IDs, `stateVersion`, and Confirm still apply. The main UI stays a short button list — no taxonomy or confidence dashboard.

**Model pin.** The SDK default alias is `jev-latest`. TypeSafe currently resolves that to `jev-1.13.0` (checked 2026-09-19). Set `TYPESAFE_MODEL=jev-1.13.0` if you have tuned gates against that version; the alias can move. The response `model` field reports the versioned id that answered.

Do not treat this README, a vendor claim, or a confidence score as a measured accuracy result. If you run a live call, record the SDK version and the response `model` field with your own sample.

Live E2E (skipped without a key): `TYPESAFE_API_KEY=… npm test` — see `src/test/jev.live.test.ts`. Demo flags without a key: `/?scenario=low_confidence`, `/?scenario=mid_confidence`, `/?scenario=timeout`, `/?provider=jev`.

## Share from a Mac

**Download the helper:** every push to `main` refreshes the rolling GitHub Release [`mac-latest`](https://github.com/buberlo/jev-pastepilot/releases/tag/mac-latest) (`PastePilot-mac.zip`). Optional `v*` tags publish a versioned copy of the same zip. [All releases](https://github.com/buberlo/jev-pastepilot/releases).

The CI build is **ad-hoc / not notarized** (no Developer ID secrets in this repo). After unzipping, **right-click → Open** the first time so Gatekeeper lets it run. The zip never contains `TYPESAFE_API_KEY`; save the key in Keychain via **PastePilot → Settings…**.

Install steps live in [macos/README.md](macos/README.md).

Short version: keep `npm run dev` running, then **double-click** `macos/install.command` (or copy the bundled Quick Action into `~/Library/Services`). Select text → **Services → Send to PastePilot**. The browser opens `/?text=` with the field filled and at most three actions. Confirm is still required.

On a Mac, use the Release `.app` (or build `macos/PastePilotService/build.sh`) to store `TYPESAFE_API_KEY` in the **Keychain** (never in git). Start the server with `macos/run-dev-with-keychain.sh` so the key stays in the process environment. Details: [macos/README.md](macos/README.md).

`--clipboard` on the helper script is an explicit flag. There is no passive clipboard surveillance.

Windows share / tray is not built yet. A later slice can open the same `/?text=` URL.

## Status

| Slice | Status |
| --- | --- |
| **MS1** — paste page, ≤3 actions, preview → Confirm | Done |
| **MS2** — parsers, allowlisted actions, replaceable router, failure paths | Done |
| **Share** — URL ingest + importable Mac Quick Action / Shortcuts | Done |
| **MS3** — live Jev adapter (server-side, fail-open; mock still default) | Done |
| **Confirm tools** — open allowlisted http(s); append idea/task/note locally | Done |
| **Mac Settings** — SwiftUI Settings + Keychain; unsigned CI `.app` on [Releases](https://github.com/buberlo/jev-pastepilot/releases) | Done (ad-hoc, not notarized) |
| **Next** — notarized Mac `.app`, Windows share / tray, more tools | Not started |

A slice is done when you can reproduce it with the commands above. See [docs/MVP.md](docs/MVP.md).

## Safety

- Clipboard access is explicit. No background monitoring.
- Pasted text is untrusted data. It cannot grant new permissions.
- Routing does not send, schedule, or write anything. Confirm may open one allowlisted http(s) link or append to a local file — never email or calendar.
- Exact values (dates, URLs, emails) are parsed in code, separate from “what kind of text is this?”
- Provider keys stay server-side (or in the Mac Keychain for Settings). Never commit them. Never log `TYPESAFE_API_KEY`. Never put the key on `/?text=`.

## More detail

- [MVP and acceptance](docs/MVP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Evaluation plan](docs/EVALUATION.md)
- [Synthetic examples](examples/cases.json)
- [macOS Share / Services](macos/README.md)
- [Implementation notes](prompts/IMPLEMENT.md)
- [Project constraints](AGENTS.md)
- [External references](docs/SOURCES.md)

## Local checks

| Command | What it covers |
| --- | --- |
| `npm test` | Parsers, routing, failure paths, decision-layer gates, Jev adapter fixtures, share ingest, URL allowlist, local save, UI smoke |
| `python3 scripts/validate_scaffold.py` | Fixture structure, documentation links, SDK stays server-side, Mac workflow only |
| GitHub Actions `Mac release` | Builds `macos/PastePilotService` on `macos-latest` and publishes `PastePilot-mac.zip` |

These checks do not measure live-model accuracy. They do not contact TypeSafe unless you set `TYPESAFE_API_KEY` and run the skipped live E2E.

## Licence

This project is licensed under the MIT License. See [LICENSE](LICENSE).
