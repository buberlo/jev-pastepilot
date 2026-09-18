import { heuristicDecide } from "./mockProvider";
import type { DecisionProviderId, DecisionRequest } from "./types";

export const DECISION_SCENARIOS = [
  "none",
  "timeout",
  "malformed",
  "stale",
  "unknown_action",
  "select_without_id",
] as const;

export type DecisionScenario = (typeof DECISION_SCENARIOS)[number];

export class ProviderNotConfiguredError extends Error {
  readonly failure = "not_configured" as const;

  constructor(message = "Live Jev is not part of Milestone 2.") {
    super(message);
    this.name = "ProviderNotConfiguredError";
  }
}

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

function jevProvider(): DecisionProvider {
  return {
    id: "jev",
    async decide() {
      throw new ProviderNotConfiguredError();
    },
  };
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
