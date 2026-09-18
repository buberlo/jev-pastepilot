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

Add exact parsers, allowlisted action IDs and a provider adapter. Treat pasted content as data, not application instructions.

Demonstrate selection, clarification, abstention, malformed output, timeout and stale-state handling with deterministic fixtures.

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

Milestone 1 is implemented and can be reproduced with the README commands. Later milestones remain future work until their behaviour can be reproduced locally and recorded in the README.
