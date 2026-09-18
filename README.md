# PastePilot

Explicit paste-to-action launcher that routes text to useful tools without automatic side effects.

## Status

**Specification scaffold, not an implemented application.** This repository contains a concrete product brief, MVP milestones, architecture, hand-labelled synthetic examples and an implementation handoff. No live Jev calls, frontend, application backend or deployment are included yet.

## Product

Paste a piece of text and get a focused set of useful actions rather than a generic chat reply. Error logs, meeting notes and project ideas lead to different existing tools.

### Example experience

Paste a service startup error. The interface offers a log viewer and a documentation search. A pasted meeting proposal instead opens a draft preview; nothing is sent or scheduled automatically.

### Model boundary

The intended semantic responsibility is: Classify pasted text and choose suitable actions from an allowlisted catalogue; optional content generation uses a different component.

Code remains authoritative for: Exact URL/date parsing, permissions, tool parameters, confirmation screens and execution.

## MVP

- Six content categories: error log, URL, meeting proposal, task, project idea and ordinary text.
- An action bar, tool previews and an explicit no-match state.
- No background clipboard watcher, inbox access or automatic calendar writes.

Out of scope: Passive clipboard surveillance, autonomous browsing, automatic email sending and a general-purpose shell.

## Repository map

- [MVP and acceptance criteria](docs/MVP.md)
- [Proposed architecture](docs/ARCHITECTURE.md)
- [Evaluation plan](docs/EVALUATION.md)
- [Synthetic acceptance examples](examples/cases.json)
- [Implementation handoff](prompts/IMPLEMENT.md)
- [Project constraints](AGENTS.md)
- [External references](docs/SOURCES.md)

## Current local check

Python 3 is sufficient for the included structural check:

```sh
python scripts/validate_scaffold.py
```

This validates fixture structure and relative documentation links. It does **not** run an app, measure model accuracy or contact TypeSafe.

## Implementation direction

Proposed: TypeScript React/Vite web app, explicit paste input, local parsers and a server-side decision adapter. Native clipboard integration belongs to a later desktop version.

The first build should be usable without an API key. A future live provider belongs behind a server-side adapter; the optional `.env.example` is a proposed configuration template, not an active integration. SDK versions, model availability, data handling and costs must be checked when the live adapter is implemented.

No GitHub Actions workflow, production deployment, external account integration or software licence has been configured. Do not treat the absence of a licence file as an open-source licence grant.
