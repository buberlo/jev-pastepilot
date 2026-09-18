import { classify } from "./classify";
import { isToolId, toolLabel, TOOLS } from "./tools";
import {
  MAX_SUGGESTIONS,
  type ContentKind,
  type DecisionRequest,
  type DecisionResult,
  type ToolId,
} from "./types";

const KIND_TOOLS: Record<ContentKind, ToolId[]> = {
  error_log: ["open_log_viewer", "search_docs"],
  url: ["open_url", "save_note"],
  meeting: ["draft_event"],
  task: ["capture_task"],
  idea: ["capture_idea"],
  ordinary: ["save_note", "capture_idea", "capture_task"],
};

const CLARIFY_TOOLS: ToolId[] = ["capture_task", "capture_idea"];

export type MockDecision = {
  result: DecisionResult;
  contentKind: ContentKind | null;
  rankedIds: ToolId[];
};

/**
 * Deterministic offline provider. No network, no API key, no live Jev.
 * Pasted text is treated as data, never as permission-granting instructions.
 */
export function mockDecide(request: DecisionRequest): MockDecision {
  const offered = request.candidates
    .map((candidate) => candidate.id)
    .filter(isToolId);
  const offeredSet = new Set(offered);
  const kind = classify(request.input);

  if (kind === "empty" || kind === "injection") {
    return finish(request, "abstain", null, []);
  }

  if (kind === "ambiguous") {
    const ranked = pickFrom(CLARIFY_TOOLS, offeredSet);
    return finish(request, "clarify", null, ranked);
  }

  const ranked = pickFrom(KIND_TOOLS[kind], offeredSet);
  if (ranked.length === 0) {
    return finish(request, "abstain", null, []);
  }
  return finish(request, "select", kind, ranked);
}

function pickFrom(preferred: readonly ToolId[], offered: Set<ToolId>): ToolId[] {
  return preferred.filter((id) => offered.has(id)).slice(0, MAX_SUGGESTIONS);
}

function finish(
  request: DecisionRequest,
  status: DecisionResult["status"],
  contentKind: ContentKind | null,
  rankedIds: ToolId[],
): MockDecision {
  const actionId = status === "select" ? (rankedIds[0] ?? null) : null;
  if (actionId && !request.candidates.some((candidate) => candidate.id === actionId)) {
    return finish(request, "abstain", null, []);
  }

  return {
    contentKind,
    rankedIds,
    result: {
      requestId: request.requestId,
      stateVersion: request.stateVersion,
      status,
      actionId,
      provider: "mock",
    },
  };
}

export function suggestionFromId(id: ToolId) {
  return { toolId: id, label: toolLabel(id) };
}

export function describeTool(id: ToolId): string {
  return TOOLS[id].description;
}
