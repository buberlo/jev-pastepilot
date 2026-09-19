# Implement the first playable/usable slice of PastePilot

This file is the original Milestone 1 handoff. Current product status, Mac release CI, and constraints live in [README.md](../README.md), [docs/MVP.md](../docs/MVP.md), and [AGENTS.md](../AGENTS.md).

Work in this repository only. Preserve its explicit project constraints.

## Deliverable

Build the paste panel and six categories with deterministic mock routing and visible action previews.

Proposed stack: Proposed: TypeScript React/Vite web app, explicit paste input, local parsers and a server-side decision adapter. Native clipboard integration belongs to a later desktop version.

Build the real user-facing flow rather than a landing page or a chat-only mock. Start with deterministic domain behaviour and a local/mock decision provider. For this milestone do not add a live model dependency or require any API key.

## Boundaries

Semantic work to support later: Classify pasted text and choose suitable actions from an allowlisted catalogue; optional content generation uses a different component.

Keep in ordinary code: Exact URL/date parsing, permissions, tool parameters, confirmation screens and execution.

Required offline/failure behaviour: Show a neutral action catalogue and let the user choose a tool manually.

## Verification

Use the acceptance criteria in `docs/MVP.md`; add tests that execute the domain and UI behaviour rather than only inspecting fixtures. Include empty input, unavailable actions and stale state where relevant. Choose supported package versions from official documentation, commit a lockfile with the implemented app and document exact install/run/check commands. Do not create fake scripts that always pass or claim tests that were not run.

Update the README to distinguish implemented features from remaining milestones. Do not deploy or modify another repository. GitHub Actions is allowed only for the Mac release workflow (see AGENTS.md). No commits or pushes beyond this repository are authorised by this handoff.
