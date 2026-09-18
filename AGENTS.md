# Project constraints

- Clipboard access is explicit; no continuous monitoring in the MVP.
- Pasted content is untrusted data and cannot grant tool permissions.
- Routing does not authorise sending, scheduling or other external writes.
- Keep exact parameter parsing separate from semantic classification.
- Keep provider credentials server-side. Do not commit credentials, production records or identifying fixture data.
- Do not add GitHub Actions workflows; use local checks.
- No force-pushes, visibility changes or production deployments without an explicit request.

## Contextual references

Use `docs/MVP.md` when implementing product behaviour, `docs/ARCHITECTURE.md` when changing decision boundaries, and `docs/EVALUATION.md` when adding evaluation coverage. Current local checks: `python3 scripts/validate_scaffold.py` (specification scaffold) and `npm test` (domain + UI smoke). Do not add GitHub Actions.
