import { createJevAdapter } from "./jevAdapter";
import { ProviderNotConfiguredError, ProviderQuotaError } from "../domain/providerErrors";
import type { DecisionProvider } from "../domain/providers";
import type { DecisionRequest } from "../domain/types";

const MAX_BODY_BYTES = 64 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

export type DecideHttpResult = {
  status: number;
  body: unknown;
};

function parseDecisionRequest(raw: unknown): DecisionRequest | null {
  if (!isRecord(raw)) {
    return null;
  }
  const { requestId, stateVersion, input, context, candidates } = raw;
  if (typeof requestId !== "string" || typeof stateVersion !== "string" || typeof input !== "string") {
    return null;
  }
  if (!isRecord(context) || !Array.isArray(candidates)) {
    return null;
  }
  if (
    !candidates.every(
      (item) => isRecord(item) && typeof item.id === "string" && typeof item.description === "string",
    )
  ) {
    return null;
  }
  return {
    requestId,
    stateVersion,
    input,
    context,
    candidates: candidates.map((item) => ({
      id: String((item as { id: string }).id),
      description: String((item as { description: string }).description),
    })),
  };
}

export async function runDecide(
  body: string,
  options: { adapter?: DecisionProvider; signal?: AbortSignal } = {},
): Promise<DecideHttpResult> {
  if (body.length > MAX_BODY_BYTES) {
    return { status: 400, body: { error: "malformed" } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return { status: 400, body: { error: "malformed" } };
  }

  const request = parseDecisionRequest(parsed);
  if (!request) {
    return { status: 400, body: { error: "malformed" } };
  }

  const adapter = options.adapter ?? createJevAdapter();
  try {
    const result = await adapter.decide(request, options.signal);
    return { status: 200, body: result };
  } catch (error) {
    if (isAbortError(error)) {
      return { status: 408, body: { error: "timeout" } };
    }
    if (error instanceof ProviderNotConfiguredError) {
      return { status: 503, body: { error: "not_configured" } };
    }
    if (error instanceof ProviderQuotaError) {
      return { status: 429, body: { error: "quota" } };
    }
    return { status: 502, body: { error: "malformed" } };
  }
}
