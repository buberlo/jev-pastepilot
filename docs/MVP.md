# MVP: PastePilot

## Milestone 1 — Offline vertical slice

Build the paste panel and six categories with deterministic mock routing and visible action previews.

Deliver an actually usable slice, tests of its domain behaviour and exact local run instructions. Do not label a mock as a live Jev integration.

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

This file defines intended future work. The current repository does not claim that any milestone is implemented. A milestone is complete only when its behaviour can be reproduced locally and its result is recorded in the README.
