import { mockDecide, suggestionFromId } from "./mockProvider";
import { parseFacts } from "./parsers";
import { catalogueCandidates, SAFE_FALLBACK_IDS } from "./tools";
import type { RouteOutcome } from "./types";

export type RouteOptions = {
  requestId?: string;
  stateVersion?: string;
  availableActions?: readonly string[];
};

export function newStateVersion(): string {
  return crypto.randomUUID();
}

export function newRequestId(): string {
  return crypto.randomUUID();
}

export function routePaste(input: string, options: RouteOptions = {}): RouteOutcome {
  const requestId = options.requestId ?? newRequestId();
  const stateVersion = options.stateVersion ?? newStateVersion();
  const candidates = catalogueCandidates(options.availableActions);
  const parsed = parseFacts(input);

  const mock = mockDecide({
    requestId,
    stateVersion,
    input,
    context: { parsed },
    candidates,
  });

  const suggestions = mock.rankedIds.map(suggestionFromId);
  const fallbackTools =
    mock.result.status === "abstain"
      ? SAFE_FALLBACK_IDS.filter((id) => candidates.some((candidate) => candidate.id === id)).map(
          suggestionFromId,
        )
      : [];

  return {
    requestId,
    stateVersion,
    status: mock.result.status,
    contentKind: mock.contentKind,
    suggestions,
    fallbackTools,
    parsed,
    primaryActionId: mock.result.actionId,
    decision: mock.result,
  };
}
