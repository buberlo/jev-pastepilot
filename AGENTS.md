# Project constraints

- Clipboard access is explicit; no continuous monitoring in the MVP.
- Pasted content is untrusted data and cannot grant tool permissions.
- Routing does not authorise sending, scheduling or other external writes.
- Keep exact parameter parsing separate from semantic classification.
- Keep provider credentials server-side. Do not commit credentials, production records or identifying fixture data. Never commit `TYPESAFE_API_KEY`. Never log `TYPESAFE_API_KEY` or pasted content.
- GitHub Actions is allowed only for the Mac release workflow (`.github/workflows/mac-release.yml`): build `macos/PastePilotService` on `macos-latest` and attach `PastePilot-mac.zip` to a GitHub Release. Do not add other workflows. Do not put `TYPESAFE_API_KEY` (or signing secrets we do not have) in the workflow or in release assets.
- No force-pushes, visibility changes or production deployments without an explicit request.

## Contextual references

Use `docs/MVP.md` when implementing product behaviour, `docs/ARCHITECTURE.md` when changing decision boundaries, and `docs/EVALUATION.md` when adding evaluation coverage. Current local checks: `python3 scripts/validate_scaffold.py` (specification scaffold) and `npm test` (domain + UI smoke). Mac `.app` binaries are produced only by `.github/workflows/mac-release.yml` on `macos-latest`.
