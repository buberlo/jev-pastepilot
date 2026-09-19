import { failureFromIssue, validateDecisionResult } from "./contract";
import { logOperational } from "./log";
import { suggestionFromId } from "./mockProvider";
import { parseFacts } from "./parsers";
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
  const candidates = catalogueCandidates(options.availableActions);
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
      return failed(failure);
    }

    const decision = checked.result;
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

    logOperational("decision", {
      requestId,
      stateVersion,
      provider: decision.provider,
      status: decision.status,
      elapsedMs: Date.now() - started,
    });

    return finish({
      requestId,
      stateVersion,
      parsed,
      offered,
      status: decision.status,
      primaryActionId: primary,
      decision,
      failure: null,
      contentKind: null,
      suggestionIds,
    });
  } catch (error) {
    if (isAbortError(error) || controller.signal.aborted) {
      logOperational("decision_timeout", {
        requestId,
        stateVersion,
        provider: providerId,
        elapsedMs: Date.now() - started,
      });
      return failed("timeout");
    }
    if (error instanceof ProviderNotConfiguredError) {
      logOperational("decision_unavailable", {
        requestId,
        stateVersion,
        provider: providerId,
        elapsedMs: Date.now() - started,
      });
      return failed("not_configured");
    }
    if (error instanceof ProviderQuotaError) {
      logOperational("decision_quota", {
        requestId,
        stateVersion,
        provider: providerId,
        elapsedMs: Date.now() - started,
      });
      return failed("quota");
    }
    logOperational("decision_error", {
      requestId,
      stateVersion,
      provider: providerId,
      elapsedMs: Date.now() - started,
    });
    return failed("malformed");
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
