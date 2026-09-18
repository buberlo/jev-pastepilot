import { isToolId } from "./tools";
import type { DecisionRequest, DecisionResult, DecisionStatus } from "./types";

const STATUSES = new Set<DecisionStatus>(["select", "clarify", "abstain"]);
const PROVIDERS = new Set(["mock", "local", "jev"]);

export type ContractIssue =
  | "malformed"
  | "request_mismatch"
  | "state_mismatch"
  | "unknown_status"
  | "unknown_provider"
  | "select_requires_id"
  | "unknown_action"
  | "action_not_offered"
  | "nonselect_has_action";

export type ContractValidation =
  | { ok: true; result: DecisionResult }
  | { ok: false; issue: ContractIssue };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate a provider payload against the request and the hard action allowlist.
 * Semantic classification is not done here.
 */
export function validateDecisionResult(
  raw: unknown,
  request: DecisionRequest,
): ContractValidation {
  if (!isRecord(raw)) {
    return { ok: false, issue: "malformed" };
  }

  const { requestId, stateVersion, status, actionId, provider, confidence } = raw;

  if (typeof requestId !== "string" || typeof stateVersion !== "string") {
    return { ok: false, issue: "malformed" };
  }
  if (requestId !== request.requestId) {
    return { ok: false, issue: "request_mismatch" };
  }
  if (stateVersion !== request.stateVersion) {
    return { ok: false, issue: "state_mismatch" };
  }
  if (typeof status !== "string" || !STATUSES.has(status as DecisionStatus)) {
    return { ok: false, issue: "unknown_status" };
  }
  if (typeof provider !== "string" || !PROVIDERS.has(provider)) {
    return { ok: false, issue: "unknown_provider" };
  }
  if (actionId !== null && typeof actionId !== "string") {
    return { ok: false, issue: "malformed" };
  }
  if (confidence !== undefined && (typeof confidence !== "number" || !Number.isFinite(confidence))) {
    return { ok: false, issue: "malformed" };
  }

  const offered = new Set(request.candidates.map((candidate) => candidate.id));

  if (status === "select") {
    if (typeof actionId !== "string" || actionId.length === 0) {
      return { ok: false, issue: "select_requires_id" };
    }
    if (!isToolId(actionId)) {
      return { ok: false, issue: "unknown_action" };
    }
    if (!offered.has(actionId)) {
      return { ok: false, issue: "action_not_offered" };
    }
  } else if (actionId !== null) {
    return { ok: false, issue: "nonselect_has_action" };
  }

  const result: DecisionResult = {
    requestId,
    stateVersion,
    status: status as DecisionStatus,
    actionId: status === "select" ? actionId : null,
    provider: provider as DecisionResult["provider"],
  };
  if (typeof confidence === "number") {
    result.confidence = confidence;
  }
  return { ok: true, result };
}

export function failureFromIssue(issue: ContractIssue): "malformed" | "stale" | "invalid_contract" {
  if (issue === "malformed") {
    return "malformed";
  }
  if (issue === "state_mismatch") {
    return "stale";
  }
  return "invalid_contract";
}
