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

**Mac v1 is a complete PastePilot app.** The main window is the paste UI (WKWebView). A bundled local Node server starts with the app and stops on quit. You do **not** need Terminal or `npm run dev` for normal use.

Every push to `main` rebuilds the rolling release [`mac-latest`](https://github.com/buberlo/jev-pastepilot/releases/tag/mac-latest).

- **Release page:** <https://github.com/buberlo/jev-pastepilot/releases/tag/mac-latest>
- **Direct zip:** <https://github.com/buberlo/jev-pastepilot/releases/download/mac-latest/PastePilot-mac.zip>

The zip is **ad-hoc / unsigned** (not Developer ID, not notarized). After unzipping:

1. Move `PastePilot.app` to `/Applications` (or `~/Applications`).
2. **Right-click → Open** (right-click, not a regular double-click) the first time so Gatekeeper lets it run.
3. Paste in the app window. At most three actions. Preview → **Confirm**.
4. Optional: save an API key in **PastePilot → Settings…** (`⌘,`) for live Jev. The key stays in Keychain and is injected into the bundled server environment. The zip never contains `TYPESAFE_API_KEY`.
5. Select text → **Services → Send to PastePilot**. The **app window** opens with `/?text=` — not Chrome.

Optional `v*` tags publish a versioned copy of the same zip. [All releases](https://github.com/buberlo/jev-pastepilot/releases). Details: [macos/README.md](macos/README.md).

## Settings / API key

| Surface | Where the key lives |
| --- | --- |
| **Mac app** | **PastePilot → Settings…** (`⌘,`) stores `TYPESAFE_API_KEY` in the **Keychain only** |
| **Web / local server** | `.env` or the server process environment |

Never commit a real key. Never log it. Never put it on `/?text=`.

The Mac app injects the Keychain key into its bundled server. Web developers can still use [`macos/run-dev-with-keychain.sh`](macos/run-dev-with-keychain.sh) or copy [`.env.example`](.env.example) to a gitignored `.env`. The browser never sees the key.

## Confirm tools

Confirm is required. After the execution gate:

| Action | What Confirm does |
| --- | --- |
| **Open link / GitHub** | Opens the first parsed `http`/`https` URL (GitHub hosts only for **Open GitHub**). Other schemes and URLs with passwords are blocked. |
| **Search the web / docs / error / Stack Overflow / Wikipedia / maps** | Opens an `http(s)` search or maps URL (DuckDuckGo, Stack Overflow, Wikipedia, Google Maps). |
| **Draft email** | Opens a `mailto:` draft. Nothing is sent. |
| **Draft event** | Downloads an `.ics` draft (or writes it under the local data dir). Nothing is scheduled. |
| **Copy text / Draft message / Extract links** | Copies text or parsed links after Confirm. |
| **Format JSON / Open log viewer** | Saves a local `.json` or `.log` file. |
| **Save idea / task / note / markdown / code / quote / link / checklist / for later** | Appends to a local inbox (`.local/pastepilot/inbox.md` under `npm run dev`, or a download). `PASTEPILOT_DATA_DIR` overrides the folder. |
| **Open in Notes / Add reminder** | On Mac, Confirm creates an Apple Notes or Reminders draft (`osascript`). Web/Linux save a local note or task instead. |
| **Open in Calendar** | On Mac, Confirm writes an `.ics` draft and `open`s it in Calendar. Elsewhere it downloads the draft. Nothing is scheduled. |
| **Open in Safari / Chrome** | On Mac, Confirm opens the parsed http(s) link in that app. Elsewhere the default browser is used. |
| **Reveal in Finder / Open in Terminal** | On Mac, Confirm reveals a pasted path (or the inbox folder) or opens Terminal at that path. The paste is **never** a shell command. Labeled stubs elsewhere. |
| **Look up word / Spotlight search** | Dictionary via `dict://` on Mac (Wiktionary on the web). Spotlight copies the query and tries ⌘Space on Mac. |
| **Run Shortcut / Speak text / Share text** | Shortcut name comes from Settings (`PASTEPILOT_SHORTCUT_NAME`), never the API key. `say` is Mac-only. Share copies and notifies. |
| **Screen paste** | Local injection/substance summary. Nothing is sent or written. |

The allowlist is the previous two-dozen tools plus these Mac actions. The UI still shows **at most three** buttons. Confirm never sends email, writes a calendar, runs a pasted shell line, or puts `TYPESAFE_API_KEY` on a URL.

**Catalogue (Jev Choice labels):** Open link, Search the web, Search docs, Search Wikipedia, Search this error, Search Stack Overflow, Open log viewer, Open maps, Open GitHub, Draft email, Draft message, Draft event, Copy text, Extract links, Format JSON, Save for later, Save as task, Save idea, Save note, Save markdown, Save code, Save quote, Save link, Save checklist, Open in Notes, Add reminder, Open in Calendar, Reveal in Finder, Open in Safari, Open in Chrome, Look up word, Spotlight search, Open in Terminal, Run Shortcut, Speak text, Share text, Screen paste.

## Decision layer (optional live Jev)

Default routing is the offline mock. Live TypeSafe Jev is optional.

1. Put the key in Mac Settings (the app restarts its bundled server), or copy [`.env.example`](.env.example) to `.env` for `npm run dev`.
2. In the Mac app, set Provider to **jev**. For the web prototype, open `http://localhost:5173/?provider=jev`, or start with `DECISION_PROVIDER=jev`.

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

Open `PastePilot.app`, then select text → **Services → Send to PastePilot**. The app window loads `/?text=` with the field filled. Confirm is still required. There is no clipboard watcher.

**Double-click** `macos/install.command` if you want the standalone Quick Action (`pastepilot://ingest`). The Release `.app` also registers **Send to PastePilot** as a Service.

`--clipboard` on the helper script is an explicit flag.

Windows share / tray is not built yet.

Details: [macos/README.md](macos/README.md).

## Status

| Slice | Status |
| --- | --- |
| **MS1** — paste page, ≤3 actions, preview → Confirm | Done |
| **MS2** — parsers, allowlisted actions, replaceable router, failure paths | Done |
| **Share** — URL ingest + Mac Quick Action / Shortcuts | Done |
| **MS3** — live Jev adapter (server-side, fail-open; mock still default) | Done |
| **Confirm tools** — open http(s)/mailto/maps search; save locally; copy; download `.ics`/`.md`/`.json` | Done |
| **Mac Confirm tools** — Notes, Reminders, Calendar, Finder, Safari/Chrome, Dictionary, Spotlight, Terminal, Shortcuts, Speak, Share (stubs on web/Linux) | Done |
| **Mac Settings** — SwiftUI Settings + Keychain (`⌘,`); optional preferred browser + Shortcut name | Done |
| **Mac v1** — in-app UI (WKWebView) + bundled local server + Services → app window | Done (ad-hoc, not notarized) |
| **Release CI** — every `main` push rebuilds unsigned [`mac-latest`](https://github.com/buberlo/jev-pastepilot/releases/tag/mac-latest) | Done |
| **Next** — notarized / Developer ID Mac `.app`, Windows share / tray | North-star |

See [docs/MVP.md](docs/MVP.md).

## Safety

- Clipboard access is explicit. No background monitoring.
- Pasted text is untrusted data. It cannot grant new permissions.
- Routing does not send, schedule, or write anything. Confirm may open an allowlisted http(s) or mailto draft, copy text, write a local file, or (on Mac, after Confirm) open Notes/Reminders/Calendar/Finder/Terminal/`say`/Shortcuts. Never send email, schedule a calendar event, or run a pasted shell command.
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
| `npm test` | Parsers, routing, failure paths, decision-layer gates, Jev adapter fixtures, share ingest, URL allowlist, Confirm adapters, Mac actions (osascript mocked), local save/export, UI smoke |
| `python3 scripts/validate_scaffold.py` | Fixture structure, documentation links, SDK stays server-side, Mac workflow only |
| GitHub Actions `Mac release` | Bundles the Vite UI + Node server, builds `macos/PastePilotService` on `macos-latest`, publishes `PastePilot-mac.zip` |

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
