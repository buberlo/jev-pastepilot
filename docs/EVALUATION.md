# Evaluation plan

The included JSON cases are **hand-labelled synthetic acceptance examples**, not recorded model outputs or a representative benchmark.

## Layers

1. The current `scripts/validate_scaffold.py` checks example structure, local documentation links, and that the TypeSafe SDK stays out of client source.
2. Domain tests in `src/test/` enforce the deterministic acceptance criteria in [MVP](MVP.md), including the labelled cases in `examples/cases.json`. Coverage includes parsers, DecisionResult validation, routing, the path steal/pre-rank (Finder + Terminal for `/Users/…` and `~/…` even on live Jev), operational failure paths, URL/share ingest, the http(s) open allowlist, search/mailto/ICS/JSON Confirm adapters, Mac Confirm actions (native WKWebView bridge plus a mocked `osascript`/`open`/`say` fallback), local inbox append, export writes, the bundled localhost server, and Mac Settings/Keychain/WKWebView/Swift source checks. UI smoke lives in `src/test/App.test.tsx` and `src/test/shareIngest.test.tsx`.
3. Provider tests compare held-out inputs with expected semantic results for the offline mock/local adapters. The Jev adapter is tested with recorded/mocked HTTP fixtures that match the official System One shape, including parallel Choice/Noul/Score answers (`src/test/jevAdapter.test.ts`, `src/test/decisionLayer.test.ts`, `src/test/fixtures/`).
4. End-to-end tests cover timeout, malformed output, quota, stale versions, missing key, ineligible candidates and the manual/offline path.
5. **Live E2E (requires local key):** `src/test/jev.live.test.ts` is skipped unless `TYPESAFE_API_KEY` is set. It is not a vendor accuracy claim.

## Measurements

Measure correct selections, incorrect actions, abstentions and clarifications separately. Report sample counts and class balance; include precision/recall where meaningful. Distinguish model classification errors from execution-gate rejection. A correct abstention on a forbidden action is not a failed positive prediction.

Collect p50 and p95 wall-clock latency at the application boundary, request/token totals where exposed and failures by category. Report actual observed usage rather than assumed token cost. Compare the semantic provider with the deterministic baseline on the same inputs.

Live Jev accuracy **must be measured** on a labelled set (measure yourself; this repository does not publish an accuracy number). Do not substitute a TypeSafe or Jev marketing claim for that measurement. Vendor `confidence` is a conservative routing gate in code (high → allow select, mid → clarify, low → abstain). An unclear Noul, a locally ambiguous paste, or a flat Choice margin can still force clarify after a high Choice score. That is local policy, not a vendor accuracy result. It is not shown as a dashboard, and it is not treated as proof of correctness. Thresholds live in `DEFAULT_GATE_THRESHOLDS` and optional `JEV_*` env vars.

## Release gate

- Pasting or sharing alone never executes a tool or transmits data to an unrelated service.
- Date, URL and parameter values come from parsers or explicit confirmation.
- Commands embedded in pasted content cannot expand permissions.
- Provider errors leave the text editable and allow manual tool selection.
- No clipboard content is retained in logs by default.

Choose quantitative thresholds after a labelled pilot rather than inventing a universal confidence cutoff. Do not claim production readiness from the seed cases. Milestone 3 records adapter + fail-open fixture coverage; no live-provider accuracy is claimed in this repository.
