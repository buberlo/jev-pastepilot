import {
  APIConnectionError,
  APIError,
  APITimeoutError,
  APIUserAbortError,
  AuthenticationError,
  RateLimitError,
  TypeSafeClient,
  TypeSafeError,
  VERSION,
  choice,
  noul,
  score,
  type Fetch,
} from "@typesafe-ai/sdk";
import { isInjection } from "../domain/classify";
import {
  confidenceBand,
  readGateThresholds,
  type GateThresholds,
} from "../domain/decisionLayer";
import { ProviderNotConfiguredError, ProviderQuotaError } from "../domain/providerErrors";
import type { DecisionProvider } from "../domain/providers";
import { logOperational } from "../domain/log";
import { JEV_TIMEOUT_MS, type DecisionRequest } from "../domain/types";
import {
  buildSystemOnePayload,
  decisionFromSystemOne,
  JevMappingError,
  systemOneModel,
} from "./jevMap";

export type JevClientLike = {
  systemOne(
    request: unknown,
    options?: { signal?: AbortSignal; timeout?: number; retry?: { maxRetries: number } },
  ): Promise<unknown>;
};

export type EnvMap = Record<string, string | undefined>;

export type JevAdapterOptions = {
  apiKey?: string | null;
  model?: string;
  fetch?: Fetch;
  client?: JevClientLike;
  timeoutMs?: number;
  env?: EnvMap;
  thresholds?: GateThresholds;
};

export const TYPESAFE_SDK_VERSION = VERSION;

function processEnv(): EnvMap {
  const runtime = globalThis as { process?: { env?: EnvMap } };
  return runtime.process?.env ?? {};
}

export function readApiKey(env: EnvMap = processEnv()): string | null {
  const value = env.TYPESAFE_API_KEY;
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readJevModel(env: EnvMap = processEnv()): string {
  const explicit = env.TYPESAFE_MODEL ?? env.TYPESAFE_DEFAULT_MODEL;
  if (typeof explicit === "string" && explicit.trim()) {
    return explicit.trim();
  }
  return "jev-latest";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

function abortTimeout(): never {
  throw new DOMException("Aborted", "AbortError");
}

function mapJevError(error: unknown): never {
  if (error instanceof ProviderNotConfiguredError || error instanceof ProviderQuotaError) {
    throw error;
  }
  if (error instanceof JevMappingError) {
    throw error;
  }
  if (isAbortError(error) || error instanceof APIUserAbortError) {
    abortTimeout();
  }
  if (error instanceof APITimeoutError || error instanceof APIConnectionError) {
    abortTimeout();
  }
  if (error instanceof AuthenticationError || (error instanceof APIError && error.status === 401)) {
    throw new ProviderNotConfiguredError("Live Jev rejected the server credential.");
  }
  if (
    error instanceof RateLimitError ||
    (error instanceof APIError && (error.status === 429 || error.status === 529))
  ) {
    throw new ProviderQuotaError();
  }
  if (error instanceof TypeSafeError && /api key/i.test(error.message)) {
    throw new ProviderNotConfiguredError();
  }
  throw error;
}

function policyAbstain(request: DecisionRequest) {
  return {
    requestId: request.requestId,
    stateVersion: request.stateVersion,
    status: "abstain" as const,
    actionId: null,
    provider: "jev" as const,
  };
}

/**
 * Server-side TypeSafe adapter. Credentials stay in process env.
 * Fail-open: callers must treat thrown errors as operational, not success.
 */
export function createJevAdapter(options: JevAdapterOptions = {}): DecisionProvider {
  const env = options.env ?? processEnv();
  const timeoutMs = options.timeoutMs ?? JEV_TIMEOUT_MS;

  return {
    id: "jev",
    async decide(request: DecisionRequest, signal?: AbortSignal) {
      if (!request.input.trim() || isInjection(request.input)) {
        return policyAbstain(request);
      }

      const apiKey = options.apiKey !== undefined ? options.apiKey : readApiKey(env);
      if (!apiKey) {
        throw new ProviderNotConfiguredError();
      }

      const model = options.model ?? readJevModel(env);
      const thresholds = options.thresholds ?? readGateThresholds(env);
      const payload = buildSystemOnePayload(request, model);

      try {
        const raw = options.client
          ? await options.client.systemOne(
              {
                state: payload.state,
                model: payload.model,
                questions: payload.questions,
              },
              { signal, timeout: timeoutMs, retry: { maxRetries: 0 } },
            )
          : await new TypeSafeClient({
              apiKey,
              defaultModel: model,
              timeout: timeoutMs,
              retry: { maxRetries: 0 },
              logLevel: "off",
              fetch: options.fetch,
            }).systemOne(
              {
                state: payload.state,
                model: payload.model,
                questions: {
                  action: choice(
                    payload.questions.action.instructions,
                    payload.questions.action.criteria,
                  ),
                  suspicious: noul(
                    payload.questions.suspicious.instructions,
                    payload.questions.suspicious.criteria,
                  ),
                  unclear: noul(payload.questions.unclear.instructions),
                  fit: score(payload.questions.fit.instructions, payload.questions.fit.criteria),
                },
              },
              { signal, timeout: timeoutMs, retry: { maxRetries: 0 } },
            );

        const decision = decisionFromSystemOne(raw, request, thresholds);
        logOperational("jev_response", {
          requestId: request.requestId,
          stateVersion: request.stateVersion,
          provider: "jev",
          model: systemOneModel(raw) ?? model,
          sdk: TYPESAFE_SDK_VERSION,
          status: decision.status,
          band: confidenceBand(decision.confidence, thresholds),
        });
        return decision;
      } catch (error) {
        mapJevError(error);
      }
    },
  };
}
