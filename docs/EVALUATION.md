# Evaluation plan

The included JSON cases are **hand-labelled synthetic acceptance examples**, not recorded model outputs or a representative benchmark.

## Layers

1. The current `scripts/validate_scaffold.py` checks example structure and local documentation links only.
2. Domain tests added during implementation must enforce the deterministic acceptance criteria in [MVP](MVP.md).
3. Provider tests compare held-out inputs with expected semantic results; preserve both German and English examples and add real user phrasing only with appropriate data handling.
4. End-to-end tests cover timeout, malformed output, stale versions, ineligible candidates and the manual/offline path.

## Measurements

Measure correct selections, incorrect actions, abstentions and clarifications separately. Report sample counts and class balance; include precision/recall where meaningful. Distinguish model classification errors from execution-gate rejection. A correct abstention on a forbidden action is not a failed positive prediction.

Collect p50 and p95 wall-clock latency at the application boundary, request/token totals where exposed and failures by category. Report actual observed usage rather than assumed token cost. Compare the semantic provider with the deterministic baseline on the same inputs.

## Release gate

- Pasting alone never executes a tool or transmits data to an unrelated service.
- Date, URL and parameter values come from parsers or explicit confirmation.
- Commands embedded in pasted content cannot expand permissions.
- Provider errors leave the text editable and allow manual tool selection.
- No clipboard content is retained in logs by default.

Choose quantitative thresholds after a labelled pilot rather than inventing a universal confidence cutoff. Do not claim production readiness from the six seed cases. No evaluation results are claimed at scaffold creation.
