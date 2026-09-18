import { classify } from "./classify";
import { CLARIFY_TOOLS, isToolId, KIND_TOOLS, offeredToolIds, toolLabel, TOOLS } from "./tools";
import type {
  ContentKind,
  DecisionProviderId,
  DecisionRequest,
  DecisionResult,
  DecisionStatus,
  ToolId,
} from "./types";

export type HeuristicDecision = {
  result: DecisionResult;
  contentKind: ContentKind | null;
};

/**
 * Deterministic offline heuristic. Used by the mock and local adapters.
 * No network, no API key, no live Jev. Pasted text is data, never a permission grant.
 */
export function heuristicDecide(
  request: DecisionRequest,
  provider: Exclude<DecisionProviderId, "jev">,
): HeuristicDecision {
  const offered = new Set(offeredToolIds(request.candidates));
  const kind = classify(request.input);

  if (kind === "empty" || kind === "injection") {
    return finish(request, provider, "abstain", null);
  }

  if (kind === "ambiguous") {
    const hasClarify = CLARIFY_TOOLS.some((id) => offered.has(id));
    return finish(request, provider, hasClarify ? "clarify" : "abstain", null);
  }

  const selected = KIND_TOOLS[kind].find((id) => offered.has(id)) ?? null;
  if (!selected) {
    return finish(request, provider, "abstain", null);
  }
  return finish(request, provider, "select", kind, selected);
}

function finish(
  request: DecisionRequest,
  provider: Exclude<DecisionProviderId, "jev">,
  status: DecisionStatus,
  contentKind: ContentKind | null,
  selected?: ToolId | null,
): HeuristicDecision {
  const actionId = status === "select" ? (selected ?? null) : null;
  if (actionId && !isToolId(actionId)) {
    return finish(request, provider, "abstain", null);
  }
  if (actionId && !request.candidates.some((candidate) => candidate.id === actionId)) {
    return finish(request, provider, "abstain", null);
  }

  return {
    contentKind,
    result: {
      requestId: request.requestId,
      stateVersion: request.stateVersion,
      status,
      actionId,
      provider,
    },
  };
}

export function mockDecide(request: DecisionRequest): HeuristicDecision {
  return heuristicDecide(request, "mock");
}

export function suggestionFromId(id: ToolId) {
  return { toolId: id, label: toolLabel(id) };
}

export function describeTool(id: ToolId): string {
  return TOOLS[id].description;
}
