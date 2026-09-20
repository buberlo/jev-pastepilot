# Proposed architecture

## Domain

TypeScript React/Vite web app: explicit paste input, local parsers, and a server-side decision adapter. Share / Mac Services is a thin explicit entry into the same web app (`?text=` / `?q=` or `POST /share`). It is not a clipboard watcher and does not change the decision contract.

Primary entities: `PasteEntry`, `ContentKind`, `ToolDefinition`, `ActionSuggestion`, `ActionPreview`.

## Decision flow

```text
Explicit paste or Share URL -> local parsing/redaction -> candidate tools -> semantic ranking -> action preview -> explicit user execution.
```

Semantic responsibility: Classify pasted text and choose suitable actions from an allowlisted catalogue; optional content generation uses a different component.

Deterministic responsibility: Exact URL/date parsing, permissions, tool parameters, confirmation screens and execution.

## Internal contract sketch

This is an application-level design, **not** a claim about the TypeSafe wire protocol:

```ts
type DecisionRequest = {
  requestId: string;
  stateVersion: string;
  input: string;
  context: Record<string, unknown>;
  candidates: Array<{ id: string; description: string }>;
};

type DecisionResult = {
  requestId: string;
  stateVersion: string;
  status: "select" | "clarify" | "abstain";
  actionId: string | null;
  provider: "mock" | "local" | "jev";
  confidence?: number;
};
```

At runtime validate the complete result, the selected ID against the offered IDs, and the state version against the current state. A `select` result requires a valid ID; `clarify` and `abstain` carry no action. The adapter attaches correlation metadata and never treats model output as an executable command.

## Components

- Domain core owns state, prerequisites and outcomes.
- Candidate builder minimises context and excludes prohibited options.
- Decision provider is replaceable: `mock` and `local` need no network; `jev` is a thin server-side TypeSafe adapter.
- Execution gate rechecks current-state rules immediately before any action. Confirm is required. After the gate, local adapters may run: **Open link / search** (allowlisted `http`/`https` only), **Draft email** (`mailto:` draft, never send), **Save** (append to a local inbox), **Copy**, **Download** (`.ics` / `.json` / `.log` / `.vcf` via `POST /api/export` or a browser download), and **Mac actions**. In `PastePilot.app`, Confirm posts to a WKWebView `macAction` handler; Swift runs NSWorkspace / NSAppleScript / speech / the share sheet. Web/`npm run dev` may still call `POST /api/mac` (Node `osascript` only outside the bundled app). Web/Linux fail open to labeled fallbacks. Deterministic signal steals/pre-rank surface Finder, browser, Mail, phone, Maps, JSON, code, dictionary, and calendar tools for those strong signals after any provider, including live Jev. No calendar write, no pasted shell, no unrelated network write. The UI still shows at most three suggestions from a larger allowlist.
- View/persistence layers display provenance and store only the permitted data. The inbox default is `.local/pastepilot/inbox.md` (or `PASTEPILOT_DATA_DIR`). The browser may download a file if the local save/export endpoint is unavailable.
- Mac v1 hosts the same web UI in a WKWebView and starts a localhost-only Node server (static files + `/api/decide` + `/api/save` + `/api/export` + `/api/mac` + `/share`) on launch. Confirmed Mac tools go through Swift (`webkit.messageHandlers.macAction`). Confirmed `http(s)`, `mailto:`, `dict:`, and `shortcuts:` URLs also open in the system handler. Settings (SwiftUI, `⌘,`) store `TYPESAFE_API_KEY` in the Keychain and non-secrets (including preferred browser and Shortcut name) in UserDefaults. The app injects the Keychain key, those prefs, and `PASTEPILOT_NATIVE_MAC=1` into the bundled server environment — never onto a URL. Services / `pastepilot://ingest` open the app window with `?text=` — not a browser. The web app still reads the key from the server process environment, never from the WKWebView or the ingest URL. Unsigned Mac binaries are published by `.github/workflows/mac-release.yml` (rolling `mac-latest`). Notarization is north-star.

## Failure behaviour

Show a neutral action catalogue and let the user choose a tool manually.

Transport failure, invalid responses, missing configuration and quota exhaustion are distinct operational outcomes. Do not disguise them as successful semantic decisions. Use bounded requests, cancel superseded work and avoid retrying non-idempotent operations automatically.

## Evaluation and telemetry

Keep the request ID, domain version, provider/configuration version, elapsed time and outcome category. Log content only when explicitly enabled for a synthetic evaluation. Confidence is a conservative routing gate in code, not proof of correctness and not a UI dashboard. The local fixture format in `examples/cases.json` describes end-to-end expected behaviour, including deterministic policy gates.

## Provider integration boundary

The TypeSafe adapter is server-side (`src/server/`). The browser posts a domain `DecisionRequest` to `POST /api/decide`. The adapter maps that onto one official System One request (`POST /v1/systemone`) using the pinned `@typesafe-ai/sdk` package: a Choice for the allowlisted action plus independent Noul/Score questions (suspicious, unclear, fit) against the same state. Code combines those answers and applies confidence gates (`src/domain/decisionLayer.ts`). Vendor types stay out of the UI. Validate the current request/response shape against the official SDK reference in [sources](SOURCES.md). No on-device or on-premise Jev runtime is assumed.

Retries are disabled on the live path so quota and transport failures fail-open instead of hanging. Missing `TYPESAFE_API_KEY`, HTTP 401, timeout, 429/529, and malformed bodies are operational outcomes, not semantic abstains. Confidence, unclear/ambiguous signals, and a weak Choice margin may downgrade a select; they never skip allowlist, `stateVersion`, or Confirm checks. Unclear and locally ambiguous pastes win over raw Choice confidence.
