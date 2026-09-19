import { ProviderNotConfiguredError, ProviderQuotaError } from "./providerErrors";
import type { DecisionProvider } from "./providers";
import type { DecisionRequest } from "./types";

export const DECIDE_PATH = "/api/decide";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

/**
 * Browser-side Jev provider. Posts the domain request to the local server
 * adapter. Never reads TYPESAFE_API_KEY.
 */
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function createJevHttpProvider(
  fetchFn: FetchLike = fetch,
  path = DECIDE_PATH,
): DecisionProvider {
  return {
    id: "jev",
    async decide(request: DecisionRequest, signal?: AbortSignal) {
      let response: Response;
      try {
        response = await fetchFn(path, {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify(request),
          signal,
        });
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
        throw new ProviderNotConfiguredError("Live Jev endpoint is unavailable.");
      }

      if (response.status === 401 || response.status === 503) {
        throw new ProviderNotConfiguredError();
      }
      if (response.status === 429 || response.status === 529) {
        throw new ProviderQuotaError();
      }
      if (!response.ok) {
        throw new Error("Live Jev returned a non-success status.");
      }

      return response.json() as Promise<unknown>;
    },
  };
}
