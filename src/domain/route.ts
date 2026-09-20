import { failureFromIssue, validateDecisionResult } from "./contract";
import { applyConfidenceGate, confidenceBand } from "./decisionLayer";
import { logOperational } from "./log";
import { suggestionFromId } from "./mockProvider";
import { parseFacts } from "./parsers";
import { applySignalSteal, preRankCandidates } from "./signalSteal";
import {
  createProvider,
  isProviderId,
  isScenario,
  ProviderNotConfiguredError,
  ProviderQuotaError,
  wrapProvider,
  type DecisionScenario,
} from "./providers";
import {
  clarifySuggestions,
  catalogueCandidates,
  expandSuggestions,
  fallbackSuggestions,
  isToolId,
  offeredToolIds,
} from "./tools";
import {
  JEV_TIMEOUT_MS,
  PROVIDER_TIMEOUT_MS,
  type DecisionProviderId,
  type OperationalFailure,
  type RouteOutcome,
} from "./types";

export type RouteOptions = {
  requestId?: string;
  stateVersion?: string;
  availableActions?: readonly string[];
  provider?: DecisionProviderId;
  scenario?: DecisionScenario;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export function newStateVersion(): string {
  return crypto.randomUUID();
}

export function newRequestId(): string {
  return crypto.randomUUID();
}

function envProvider(): DecisionProviderId {
  const value = typeof __PASTEPILOT_PROVIDER__ === "string" ? __PASTEPILOT_PROVIDER__ : "mock";
  return isProviderId(value) ? value : "mock";
}

export function readDemoOptions(search = ""): {
  provider: DecisionProviderId;
  scenario: DecisionScenario;
} {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const providerRaw = params.get("provider");
  const scenarioRaw = params.get("scenario");
  return {
    provider: isProviderId(providerRaw) ? providerRaw : envProvider(),
    scenario: isScenario(scenarioRaw) ? scenarioRaw : "none",
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

export async function routePaste(input: string, options: RouteOptions = {}): Promise<RouteOutcome> {
  const requestId = options.requestId ?? newRequestId();
  const stateVersion = options.stateVersion ?? newStateVersion();
  const providerId = options.provider ?? "mock";
  const scenario = options.scenario ?? "none";
  const timeoutMs =
    options.timeoutMs ?? (providerId === "jev" ? JEV_TIMEOUT_MS : PROVIDER_TIMEOUT_MS);
  const candidates = preRankCandidates(input, catalogueCandidates(options.availableActions));
  const parsed = parseFacts(input);
  const offered = offeredToolIds(candidates);
  const started = Date.now();

  const request = {
    requestId,
    stateVersion,
    input,
    context: { parsed },
    candidates,
  };

  const base = wrapProvider(createProvider(providerId), scenario);
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const failed = (failure: OperationalFailure): RouteOutcome =>
    finish({
      requestId,
      stateVersion,
      parsed,
      offered,
      status: "failed",
      primaryActionId: null,
      decision: null,
      failure,
      contentKind: null,
    });

  try {
    const raw = await base.decide(request, controller.signal);
    const checked = validateDecisionResult(raw, request);
    if (!checked.ok) {
      const failure = failureFromIssue(checked.issue);
      logOperational("decision_invalid", {
        requestId,
        stateVersion,
        provider: providerId,
        issue: checked.issue,
        elapsedMs: Date.now() - started,
      });
      const stolen = applySignalSteal(input, offered, {
        status: "failed",
        primaryActionId: null,
        suggestionIds: [],
      });
      if (stolen) {
        return finish({
          requestId,
          stateVersion,
          parsed,
          offered,
          status: stolen.status,
          primaryActionId: stolen.primaryActionId,
          decision: null,
          failure: null,
          contentKind: null,
          suggestionIds: stolen.suggestionIds,
        });
      }
      return failed(failure);
    }

    let decision = checked.result;
    if (decision.confidence !== undefined) {
      const gated = applyConfidenceGate(decision.status, decision.confidence);
      if (gated !== decision.status) {
        logOperational("decision_gated", {
          requestId,
          stateVersion,
          provider: decision.provider,
          from: decision.status,
          to: gated,
          band: confidenceBand(decision.confidence),
        });
        decision = {
          ...decision,
          status: gated,
          actionId: gated === "select" ? decision.actionId : null,
        };
      }
    }

    const primary =
      decision.status === "select" && decision.actionId && isToolId(decision.actionId)
        ? decision.actionId
        : null;
    const suggestionIds =
      decision.status === "select" && primary
        ? expandSuggestions(primary, offered)
        : decision.status === "clarify"
          ? clarifySuggestions(offered)
          : [];

    const stolen = applySignalSteal(input, offered, {
      status: decision.status,
      primaryActionId: primary,
      suggestionIds,
    });

    logOperational("decision", {
      requestId,
      stateVersion,
      provider: decision.provider,
      status: stolen?.status ?? decision.status,
      elapsedMs: Date.now() - started,
    });

    return finish({
      requestId,
      stateVersion,
      parsed,
      offered,
      status: stolen?.status ?? decision.status,
      primaryActionId: stolen?.primaryActionId ?? primary,
      decision,
      failure: null,
      contentKind: null,
      suggestionIds: stolen?.suggestionIds ?? suggestionIds,
    });
  } catch (error) {
    const operational = (): OperationalFailure => {
      if (isAbortError(error) || controller.signal.aborted) {
        return "timeout";
      }
      if (error instanceof ProviderNotConfiguredError) {
        return "not_configured";
      }
      if (error instanceof ProviderQuotaError) {
        return "quota";
      }
      return "malformed";
    };
    const failure = operational();
    logOperational(
      failure === "timeout"
        ? "decision_timeout"
        : failure === "not_configured"
          ? "decision_unavailable"
          : failure === "quota"
            ? "decision_quota"
            : "decision_error",
      {
        requestId,
        stateVersion,
        provider: providerId,
        elapsedMs: Date.now() - started,
      },
    );
    const stolen = applySignalSteal(input, offered, {
      status: "failed",
      primaryActionId: null,
      suggestionIds: [],
    });
    if (stolen) {
      return finish({
        requestId,
        stateVersion,
        parsed,
        offered,
        status: stolen.status,
        primaryActionId: stolen.primaryActionId,
        decision: null,
        failure: null,
        contentKind: null,
        suggestionIds: stolen.suggestionIds,
      });
    }
    return failed(failure);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

function finish(args: {
  requestId: string;
  stateVersion: string;
  parsed: RouteOutcome["parsed"];
  offered: ReturnType<typeof offeredToolIds>;
  status: RouteOutcome["status"];
  primaryActionId: string | null;
  decision: RouteOutcome["decision"];
  failure: RouteOutcome["failure"];
  contentKind: RouteOutcome["contentKind"];
  suggestionIds?: ReturnType<typeof expandSuggestions>;
}): RouteOutcome {
  const suggestions = (args.suggestionIds ?? []).map(suggestionFromId);
  const fallbackTools =
    args.status === "abstain" || args.status === "failed"
      ? fallbackSuggestions(args.offered).map(suggestionFromId)
      : [];

  return {
    requestId: args.requestId,
    stateVersion: args.stateVersion,
    status: args.status,
    contentKind: args.contentKind,
    suggestions,
    fallbackTools,
    parsed: args.parsed,
    primaryActionId: args.primaryActionId,
    decision: args.decision,
    failure: args.failure,
  };
}
