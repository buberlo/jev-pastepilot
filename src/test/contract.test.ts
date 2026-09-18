import { validateDecisionResult } from "../domain/contract";
import type { DecisionRequest } from "../domain/types";

const request: DecisionRequest = {
  requestId: "req-1",
  stateVersion: "v-1",
  input: "Service failed: connection refused.",
  context: {},
  candidates: [
    { id: "open_log_viewer", description: "Open a local preview of the pasted log text." },
    { id: "capture_task", description: "Save the text as a local task draft." },
  ],
};

function validSelect(overrides: Record<string, unknown> = {}) {
  return {
    requestId: "req-1",
    stateVersion: "v-1",
    status: "select",
    actionId: "open_log_viewer",
    provider: "mock",
    ...overrides,
  };
}

describe("DecisionResult contract", () => {
  it("accepts a complete select result on an offered allowlisted id", () => {
    const checked = validateDecisionResult(validSelect(), request);
    expect(checked.ok).toBe(true);
    if (checked.ok) {
      expect(checked.result.actionId).toBe("open_log_viewer");
    }
  });

  it("requires requestId and stateVersion to match the request", () => {
    expect(validateDecisionResult(validSelect({ requestId: "other" }), request)).toEqual({
      ok: false,
      issue: "request_mismatch",
    });
    expect(validateDecisionResult(validSelect({ stateVersion: "v-old" }), request)).toEqual({
      ok: false,
      issue: "state_mismatch",
    });
  });

  it("requires select to carry a valid offered id", () => {
    expect(validateDecisionResult(validSelect({ actionId: null }), request)).toMatchObject({
      ok: false,
      issue: "select_requires_id",
    });
    expect(validateDecisionResult(validSelect({ actionId: "send_email" }), request)).toMatchObject({
      ok: false,
      issue: "unknown_action",
    });
    expect(validateDecisionResult(validSelect({ actionId: "draft_event" }), request)).toMatchObject({
      ok: false,
      issue: "action_not_offered",
    });
  });

  it("requires clarify and abstain to carry no action", () => {
    expect(
      validateDecisionResult(validSelect({ status: "clarify", actionId: "capture_task" }), request),
    ).toMatchObject({ ok: false, issue: "nonselect_has_action" });
    expect(
      validateDecisionResult(validSelect({ status: "abstain", actionId: "open_log_viewer" }), request),
    ).toMatchObject({ ok: false, issue: "nonselect_has_action" });
    const clarify = validateDecisionResult(validSelect({ status: "clarify", actionId: null }), request);
    expect(clarify.ok).toBe(true);
  });

  it("rejects malformed payloads and unknown statuses", () => {
    expect(validateDecisionResult(null, request)).toMatchObject({ ok: false, issue: "malformed" });
    expect(validateDecisionResult("select", request)).toMatchObject({
      ok: false,
      issue: "malformed",
    });
    expect(validateDecisionResult(validSelect({ status: "maybe" }), request)).toMatchObject({
      ok: false,
      issue: "unknown_status",
    });
    expect(validateDecisionResult(validSelect({ provider: "openai" }), request)).toMatchObject({
      ok: false,
      issue: "unknown_provider",
    });
    expect(validateDecisionResult(validSelect({ confidence: "high" }), request)).toMatchObject({
      ok: false,
      issue: "malformed",
    });
  });
});
