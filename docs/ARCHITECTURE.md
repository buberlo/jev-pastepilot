# Proposed architecture

## Domain

Proposed: TypeScript React/Vite web app, explicit paste input, local parsers and a server-side decision adapter. Share / Mac Services is a thin explicit entry into the same web app (`?text=` / `?q=` or `POST /share`). It is not a clipboard watcher and does not change the decision contract.

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
- Decision provider is replaceable; the mock provider requires no network.
- Execution gate rechecks current-state rules immediately before any action.
- View/persistence layers display provenance and store only the permitted data.

## Failure behaviour

Show a neutral action catalogue and let the user choose a tool manually.

Transport failure, invalid responses, missing configuration and quota exhaustion are distinct operational outcomes. Do not disguise them as successful semantic decisions. Use bounded requests, cancel superseded work and avoid retrying non-idempotent operations automatically.

## Evaluation and telemetry

Keep the request ID, domain version, provider/configuration version, elapsed time and outcome category. Log content only when explicitly enabled for a synthetic evaluation. Never treat confidence alone as proof of correctness. The local fixture format in `examples/cases.json` describes end-to-end expected behaviour, including deterministic policy gates.

## Provider integration boundary

A future TypeSafe adapter is server-side. Validate its current request/response shape against the official SDK reference in [sources](SOURCES.md), keep the dependency pinned through the chosen package manager and leave the rest of the app independent of vendor-specific types. No on-device or on-premise Jev runtime is assumed by this design.
