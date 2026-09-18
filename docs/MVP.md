# MVP: PastePilot

## Milestone 1 — Offline vertical slice

**Done in this repository.** The paste panel and six internal content kinds use deterministic mock routing and visible action previews. Domain tests and UI smoke tests cover the labelled cases in `examples/cases.json`. Local run commands are in the README.

This is a mock. It is not a live Jev integration.

Implemented behaviour:

- Explicit paste only (Ctrl/Cmd+V and a Paste button). No native clipboard watcher.
- Offline mock provider with no API key.
- At most three action buttons, or a “nothing fitting” empty state with a manual fallback list.
- Preview and a single Confirm before a local execution stub. Confirm never sends email, writes a calendar, or calls an external API.

## Milestone 2 — Decision contract and failure paths

**Done in this repository.** Exact parsers, allowlisted action IDs, and a replaceable provider adapter are in the domain core. Pasted content is treated as data, not application instructions.

Implemented behaviour:

- Exact URL, date/time, and email parsers feed previews and Confirm. They do not invent send or schedule actions.
- `DecisionResult` is validated in full against the current request: `requestId` and `stateVersion` must match, a `select` needs an offered allowlisted ID, and `clarify` / `abstain` carry no action.
- Adapter interface: `mock` | `local` | future `jev`. The mock stays the default. The `jev` adapter is not configured and makes no network calls. No API key is required.
- Deterministic fixtures for select, clarify, abstain, empty, injection, timeout, malformed output, and stale `stateVersion`.
- Provider failures leave the text editable and offer the manual safe-tool list. Those outcomes are operational, not semantic abstains.
- The execution gate rechecks state immediately before the local stub. Confirm is still required.

This is still not a live Jev integration.

## Milestone 3 — Live adapter and measured comparison

Integrate Jev and evaluate routing. Add individual external integrations only when their permission and confirmation flows exist.

Record the tested SDK/model version and configuration. Keep the local provider selectable. Report measured accuracy, abstention behaviour, latency and request volume separately; do not substitute a vendor claim for a measurement.

## Acceptance criteria

- Pasting alone never executes a tool or transmits data to an unrelated service.
- Date, URL and parameter values come from parsers or explicit confirmation.
- Commands embedded in pasted content cannot expand permissions.
- Provider errors leave the text editable and allow manual tool selection.
- No clipboard content is retained in logs by default.

## Explicit exclusions

Passive clipboard surveillance, autonomous browsing, automatic email sending and a general-purpose shell.

## Delivery boundary

Milestones 1 and 2 are implemented and can be reproduced with the README commands. Milestone 3 remains future work until its behaviour can be reproduced locally and recorded in the README.
