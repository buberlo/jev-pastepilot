import { createJevHttpProvider } from "./jevHttp";
import { heuristicDecide } from "./mockProvider";
import { ProviderQuotaError } from "./providerErrors";
import type { DecisionProviderId, DecisionRequest } from "./types";

export { ProviderNotConfiguredError, ProviderQuotaError } from "./providerErrors";

export const DECISION_SCENARIOS = [
  "none",
  "timeout",
  "malformed",
  "stale",
  "unknown_action",
  "select_without_id",
  "quota",
] as const;

export type DecisionScenario = (typeof DECISION_SCENARIOS)[number];

export type DecisionProvider = {
  readonly id: DecisionProviderId;
  decide(request: DecisionRequest, signal?: AbortSignal): Promise<unknown>;
};

function waitForAbort(signal?: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    signal?.addEventListener(
      "abort",
      () => reject(new DOMException("Aborted", "AbortError")),
      { once: true },
    );
  });
}

function heuristicProvider(id: Exclude<DecisionProviderId, "jev">): DecisionProvider {
  return {
    id,
    async decide(request) {
      return heuristicDecide(request, id).result;
    },
  };
}

/** Tests replace the browser HTTP client with the in-process server adapter. */
let jevOverride: DecisionProvider | null = null;

export function setJevProviderOverride(provider: DecisionProvider | null): void {
  jevOverride = provider;
}

function jevProvider(): DecisionProvider {
  return jevOverride ?? createJevHttpProvider();
}

export function createProvider(id: DecisionProviderId): DecisionProvider {
  if (id === "local") {
    return heuristicProvider("local");
  }
  if (id === "jev") {
    return jevProvider();
  }
  return heuristicProvider("mock");
}

export function isProviderId(value: string | null | undefined): value is DecisionProviderId {
  return value === "mock" || value === "local" || value === "jev";
}

export function isScenario(value: string | null | undefined): value is DecisionScenario {
  return DECISION_SCENARIOS.includes(value as DecisionScenario);
}

/** Deterministic wrappers for fixture and demo failure paths. No network. */
export function wrapProvider(
  provider: DecisionProvider,
  scenario: DecisionScenario,
): DecisionProvider {
  if (scenario === "none") {
    return provider;
  }

  return {
    id: provider.id,
    async decide(request, signal) {
      if (scenario === "timeout") {
        return waitForAbort(signal);
      }
      if (scenario === "quota") {
        throw new ProviderQuotaError();
      }
      if (scenario === "malformed") {
        return { not: "a decision" };
      }
      const valid = await provider.decide(request, signal);
      if (!valid || typeof valid !== "object") {
        return valid;
      }
      if (scenario === "stale") {
        return { ...valid, stateVersion: `stale-${request.stateVersion}` };
      }
      if (scenario === "unknown_action") {
        return {
          ...valid,
          status: "select",
          actionId: "send_email",
        };
      }
      return {
        ...valid,
        status: "select",
        actionId: null,
      };
    },
  };
}
