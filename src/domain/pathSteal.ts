import { isInjection } from "./classify";
import { looksLikeFilePath } from "./signals";
import { MAX_SUGGESTIONS, type RouteStatus, type ToolId } from "./types";

/** Finder first, then Terminal, then a local save. Capped at three UI buttons. */
export const PATH_STEAL_TOOLS: readonly ToolId[] = [
  "reveal_in_finder",
  "open_in_terminal",
  "save_note",
];

export type PathStealResult = {
  status: "select";
  primaryActionId: ToolId;
  suggestionIds: ToolId[];
};

function uniqueIds(ids: readonly ToolId[]): ToolId[] {
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

/**
 * Strong path signal: first line is an absolute/home path and not injection.
 * Exact path parsing stays in `firstFilePath`; this only decides whether to steal rank.
 */
export function shouldStealPath(input: string): boolean {
  if (!input.trim() || isInjection(input)) {
    return false;
  }
  return looksLikeFilePath(input);
}

export function pathStealPrimary(offered: readonly ToolId[]): ToolId | null {
  const offeredSet = new Set(offered);
  return PATH_STEAL_TOOLS.find((id) => offeredSet.has(id) && id !== "save_note") ?? null;
}

/**
 * Deterministic steal/pre-rank for Finder + Terminal.
 * Applies after any provider (including live Jev) so a path paste is not left
 * to the LLM. Never upgrades injection or empty. Never invents a tool that
 * was not offered. Confirm is still required.
 */
export function applyPathSteal(
  input: string,
  offered: readonly ToolId[],
  current: {
    status: RouteStatus;
    primaryActionId: ToolId | null;
    suggestionIds: readonly ToolId[];
  },
): PathStealResult | null {
  if (!shouldStealPath(input)) {
    return null;
  }
  const primary = pathStealPrimary(offered);
  if (!primary) {
    return null;
  }
  const offeredSet = new Set(offered);
  const suggestionIds = uniqueIds([
    primary,
    ...PATH_STEAL_TOOLS.filter((id) => offeredSet.has(id)),
    ...current.suggestionIds.filter((id) => offeredSet.has(id)),
  ]).slice(0, MAX_SUGGESTIONS);

  if (
    current.status === "select" &&
    current.primaryActionId === primary &&
    current.suggestionIds[0] === primary &&
    current.suggestionIds.length === suggestionIds.length &&
    current.suggestionIds.every((id, index) => id === suggestionIds[index])
  ) {
    return {
      status: "select",
      primaryActionId: primary,
      suggestionIds,
    };
  }

  return {
    status: "select",
    primaryActionId: primary,
    suggestionIds,
  };
}

/** Put Finder/Terminal first in the catalogue Jev sees. Steal still guarantees rank. */
export function preRankCandidates<T extends { id: string }>(
  input: string,
  candidates: readonly T[],
): T[] {
  if (!shouldStealPath(input)) {
    return [...candidates];
  }
  const preferred = new Set<string>(["reveal_in_finder", "open_in_terminal"]);
  return [
    ...candidates.filter((candidate) => preferred.has(candidate.id)),
    ...candidates.filter((candidate) => !preferred.has(candidate.id)),
  ];
}
