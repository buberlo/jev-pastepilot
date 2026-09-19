/**
 * Live Jev E2E — requires a local TYPESAFE_API_KEY.
 * Skipped in CI and in this agent environment when the key is absent.
 * This is not a vendor accuracy claim.
 */
import { validateDecisionResult } from "../domain/contract";
import { catalogueCandidates } from "../domain/tools";
import { createJevAdapter, TYPESAFE_SDK_VERSION } from "../server/jevAdapter";

const LIVE = Boolean(
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.TYPESAFE_API_KEY?.trim(),
);

const request = {
  requestId: "live-req-1",
  stateVersion: "live-v-1",
  input: "Service failed: connection refused on the database socket.",
  context: { parsed: { urls: [], dateHints: [], times: [], emails: [] } },
  candidates: catalogueCandidates(),
};

describe.skipIf(!LIVE)("live Jev E2E (requires local key)", () => {
  it("returns a contract-valid DecisionResult from TypeSafe", async () => {
    const raw = await createJevAdapter().decide(request);
    const checked = validateDecisionResult(raw, request);
    expect(checked.ok).toBe(true);
    expect(TYPESAFE_SDK_VERSION).toBe("0.6.0");
  }, 20_000);
});
