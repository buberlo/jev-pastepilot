# External references

Checked/reference date: 2026-09-19.

- [Original Jev introduction](https://typesafe.ai/blog/introducing-system-one-models-and-jev) — origin of the model/app discussion; not a product specification for this repository.
- [Official TypeSafe JavaScript SDK](https://docs.typesafe.ai/sdk/javascript) — integration reference. Pinned package: `@typesafe-ai/sdk@0.6.0`. Server credential: `TYPESAFE_API_KEY`.
- [System One HTTP API](https://docs.typesafe.ai/api) — `POST https://api.typesafe.ai/v1/systemone`; Choice, Noul, and Score answers may be requested together against one state.
- [Primitives](https://docs.typesafe.ai/primitives) — independent questions; combine answers in application code.
- [Models](https://docs.typesafe.ai/models) — default alias `jev-latest` currently points to `jev-1.13.0`. An alias can move; pin `jev-1.13.0` if gates were tuned against that id. The response `model` field reports the versioned id.
- [TypeSafe confidence reference](https://docs.typesafe.ai/confidence) — vendor definitions. This app uses confidence only as a conservative routing gate in code, not as proof and not as UI chrome.

Adapter tests use recorded/mocked HTTP fixtures, not a live TypeSafe call. If you run the live E2E locally, record the response `model` field and the SDK version (`0.6.0`) with the measurement. Never put a real `TYPESAFE_API_KEY` in this file.

The product, architecture, milestones and fixtures in this repository are application designs. They do not claim measured Jev performance. Verify live API availability, current model identifiers, pricing, limits and data processing terms at integration time.
