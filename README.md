# PastePilot

Paste or share some text. Get at most three actions. Confirm before anything happens.

<video src="docs/demo/pastepilot-core.mp4" controls playsinline muted width="720" title="PastePilot: paste text, pick an action, confirm">
</video>

[Watch the 9-second demo](docs/demo/pastepilot-core.mp4) — paste a log line → a few buttons → preview → Confirm. Nothing runs until you say so. The clip is silent and uses the offline mock (no API key).

![After paste, PastePilot offers at most three actions](docs/demo/paste-actions.png)

![Preview, then a single Confirm](docs/demo/preview-confirm.png)

## What it is

A small launcher, **not a chatbot**.

1. You paste or Share text (a log line, a link, a meeting note, an idea).
2. PastePilot offers **at most three** allowlisted actions.
3. You pick one, read a preview, and tap **Confirm**.

Until Confirm, nothing is sent, scheduled, or written.

Routing is typed: a classifier picks from a fixed tool list. Exact dates, URLs, and emails are parsed in ordinary code and shown in the preview. They never invent a send or a schedule.

**Not** clipboard spyware, auto-email, auto-calendar, or an autonomous agent. No background watcher, no browsing, no shell.

## Quick start (web)

Needs Node.js 20+ and npm. The default **mock** router needs **no API key**.

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

`pnpm install` / `pnpm test` / `pnpm dev` also work. This repo commits `package-lock.json`.

## Download for Mac

Every push to `main` rebuilds the rolling release [`mac-latest`](https://github.com/buberlo/jev-pastepilot/releases/tag/mac-latest).

- **Release page:** <https://github.com/buberlo/jev-pastepilot/releases/tag/mac-latest>
- **Direct zip:** <https://github.com/buberlo/jev-pastepilot/releases/download/mac-latest/PastePilot-mac.zip>

The zip is **ad-hoc / unsigned** (not Developer ID, not notarized). After unzipping:

1. Move `PastePilot.app` to `/Applications` (or `~/Applications`).
2. **Right-click → Open** the first time so Gatekeeper lets it run.
3. Save an API key in **PastePilot → Settings…** if you want live Jev. The zip never contains `TYPESAFE_API_KEY`.

Optional `v*` tags publish a versioned copy of the same zip. [All releases](https://github.com/buberlo/jev-pastepilot/releases). Install and Share steps: [macos/README.md](macos/README.md).

## Settings / API key

| Surface | Where the key lives |
| --- | --- |
| **Mac app** | **PastePilot → Settings…** (`⌘,`) stores `TYPESAFE_API_KEY` in the **Keychain only** |
| **Web / local server** | `.env` or the server process environment |

Never commit a real key. Never log it. Never put it on `/?text=`.

On a Mac, start the local server with [`macos/run-dev-with-keychain.sh`](macos/run-dev-with-keychain.sh) so the Keychain key is injected into the process environment only. The browser never sees it.

Web-only: copy [`.env.example`](.env.example) to a gitignored `.env`.

## Confirm tools

Confirm is required. After the execution gate:

| Action | What Confirm does |
| --- | --- |
| **Open link** | Opens the first parsed `http`/`https` URL. Other schemes and URLs with passwords are blocked. |
| **Save idea / Save as task / Save note** | Appends to a local inbox (`.local/pastepilot/inbox.md` under `npm run dev`, or a download). `PASTEPILOT_DATA_DIR` overrides the folder. |
| **Everything else** | Local stub (draft event, log viewer, search docs). |

Confirm never sends email, writes a calendar, or calls an external API. Opening the URL you confirmed is the only network step.

## Decision layer (optional live Jev)

Default routing is the offline mock. Live TypeSafe Jev is optional.

1. Put the key in Mac Settings, or copy [`.env.example`](.env.example) to `.env`.
2. Open `http://localhost:5173/?provider=jev`, or start with `DECISION_PROVIDER=jev`.

The browser posts a routing request to local `POST /api/decide`. Selecting Jev sends the pasted text to TypeSafe for **routing only**.

**How it decides.** One System One call asks independent questions against the same paste: a **Choice** for the allowlisted action, a **Score** for fit, and **Noul**s for injection and emptiness/clarity. Code combines those answers.

**Confidence gates** (defaults; overridable with `JEV_*` — see `.env.example`):

- High (≥ 0.75) may keep a contract-valid select.
- Mid prefers clarify / safer tools.
- Low (< 0.45) abstains to the manual list.
- **Unclear or locally ambiguous** pastes (for example “Handle this.”) **force clarify even when Choice confidence is high**. Injection and empty still abstain.

If the key is missing or the call fails, PastePilot **fail-opens**: the text stays editable and you get the safe manual tools.

Do not treat this README, a vendor claim, or a confidence score as a measured accuracy result. **Measure yourself** on a labelled set — see [docs/EVALUATION.md](docs/EVALUATION.md). If you run a live call, record the SDK version and the response `model` field.

**Model pin.** Alias `jev-latest` currently resolves to `jev-1.13.0` (checked 2026-09-19). Pin `TYPESAFE_MODEL=jev-1.13.0` if you have tuned gates against that version.

Live E2E (skipped without a key): `TYPESAFE_API_KEY=… npm test`. Demo flags without a key: `/?scenario=low_confidence`, `/?scenario=mid_confidence`, `/?scenario=timeout`, `/?provider=jev`.

## Share from a Mac

Keep the web app running, then select text → **Services → Send to PastePilot**. The browser opens `/?text=` with the field filled. Confirm is still required.

**Double-click** `macos/install.command`, or use the Release `.app`. `--clipboard` on the helper is an explicit flag — no watcher.

Windows share / tray is not built yet.

Details: [macos/README.md](macos/README.md).

## Status

| Slice | Status |
| --- | --- |
| **MS1** — paste page, ≤3 actions, preview → Confirm | Done |
| **MS2** — parsers, allowlisted actions, replaceable router, failure paths | Done |
| **Share** — URL ingest + Mac Quick Action / Shortcuts | Done |
| **MS3** — live Jev adapter (server-side, fail-open; mock still default) | Done |
| **Confirm tools** — open allowlisted http(s); save idea/task/note locally | Done |
| **Mac Settings** — SwiftUI Settings + Keychain (`⌘,`) | Done |
| **Release CI** — every `main` push rebuilds unsigned [`mac-latest`](https://github.com/buberlo/jev-pastepilot/releases/tag/mac-latest) | Done |
| **Next** — notarized Mac `.app`, Windows share / tray, more tools | North-star |

See [docs/MVP.md](docs/MVP.md).

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

## Shared decision core (`@buberlo/jev-core`)

`@buberlo/jev-core` is the harness-independent TypeSafe Jev decision core extracted from this author's DSH work ([buberlo/dsh-jev](https://github.com/buberlo/dsh-jev)). It turns state plus typed questions — Choice, Score and Noul — into typed answers and probabilities that deterministic code turns into consequences.

```sh
npm install @buberlo/jev-core@0.1.1
```

Requires Node `^22.19.0 || >=24.0.0`. `MockJevProvider` is the offline alternative: deterministic answers for tests without an API key.

**How it applies here:**

- `evaluate` with a `choice` over the allowlisted tool catalogue and a `score` for fit; `noul` flags injection suspicion and empty or unclear pastes.
- `selectTools` bounds the candidate list to that allowlist, and `assessToolCall` can hold or ask at the Confirm gate.
- Consequences stay deterministic application code: URL/date/email parsing, allowlist checks, `stateVersion`, opening the parsed http(s) link, and appending to the local inbox.

**Rules:**

- A model answer only selects or gates; it never grants permission or executes anything. Confirm still gates every open and local save.
- Provider, timeout or validation failures fall back to the manual tool list or ask — never to auto-execution.
- Modes are `off` / `shadow` / `enforce`; start with `MockJevProvider` and `shadow`.
- Thresholds are uncalibrated defaults until measured against your own data: [docs/policy.md](https://github.com/buberlo/dsh-jev/blob/main/docs/policy.md).

## Licence

This project is licensed under the MIT License. See [LICENSE](LICENSE).
