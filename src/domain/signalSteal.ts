import { isInjection, looksLikeMeetingPaste } from "./classify";
import { firstGithubUrl } from "./signals";
import { readMacSettings, type PreferredBrowser } from "./macActions";
import { parseFacts } from "./parsers";
import { applyPathSteal, PATH_STEAL_TOOLS, shouldStealPath } from "./pathSteal";
import {
  looksLikeAddress,
  looksLikeCode,
  looksLikeDictionaryWord,
  looksLikeEmailPaste,
  looksLikeJson,
  looksLikePhonePaste,
  looksLikePreviewPath,
  looksLikeUrlPaste,
} from "./signals";
import { MAX_SUGGESTIONS, type RouteStatus, type ToolId } from "./types";

export type StealKind =
  | "path"
  | "url"
  | "email"
  | "phone"
  | "address"
  | "json"
  | "code"
  | "word"
  | "meeting";

export type StealMatch = {
  kind: StealKind;
  tools: readonly ToolId[];
};

export type SignalStealResult = {
  status: "select";
  primaryActionId: ToolId;
  suggestionIds: ToolId[];
};

function uniqueIds(ids: readonly ToolId[]): ToolId[] {
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

function urlStealTools(browser: PreferredBrowser, input: string): ToolId[] {
  const parsed = parseFacts(input);
  if (firstGithubUrl(parsed.urls)) {
    return ["open_github", "open_url", "save_link"];
  }
  if (browser === "safari") {
    return ["open_in_safari", "open_url", "open_in_chrome"];
  }
  if (browser === "chrome") {
    return ["open_in_chrome", "open_url", "open_in_safari"];
  }
  return ["open_url", "open_in_safari", "open_in_chrome"];
}

function pathStealTools(input: string): ToolId[] {
  if (looksLikePreviewPath(input)) {
    return ["reveal_in_finder", "open_in_preview", "open_enclosing_folder"];
  }
  return [...PATH_STEAL_TOOLS];
}

/**
 * First matching strong signal. Injection and empty never steal.
 * Exact tokens stay in parsers; this only ranks allowlisted tools.
 */
export function detectSteal(
  input: string,
  browser: PreferredBrowser = readMacSettings().preferredBrowser,
): StealMatch | null {
  if (!input.trim() || isInjection(input)) {
    return null;
  }
  if (shouldStealPath(input)) {
    return { kind: "path", tools: pathStealTools(input) };
  }
  if (looksLikeUrlPaste(input)) {
    return { kind: "url", tools: urlStealTools(browser, input) };
  }
  if (looksLikeEmailPaste(input)) {
    return { kind: "email", tools: ["draft_email", "copy_to_clipboard", "save_note"] };
  }
  if (looksLikePhonePaste(input)) {
    return { kind: "phone", tools: ["call_phone", "message_phone", "save_contact"] };
  }
  if (looksLikeJson(input)) {
    return { kind: "json", tools: ["format_json", "copy_to_clipboard", "save_note"] };
  }
  if (looksLikeCode(input)) {
    return { kind: "code", tools: ["save_code_snippet", "open_in_editor", "copy_to_clipboard"] };
  }
  if (looksLikeMeetingPaste(input)) {
    return { kind: "meeting", tools: ["open_in_calendar", "add_reminder", "capture_task"] };
  }
  if (looksLikeAddress(input)) {
    return { kind: "address", tools: ["open_maps", "search_web", "copy_to_clipboard"] };
  }
  if (looksLikeDictionaryWord(input)) {
    return { kind: "word", tools: ["dictionary_lookup", "spotlight_search", "search_web"] };
  }
  return null;
}

function stealPrimary(tools: readonly ToolId[], offered: readonly ToolId[]): ToolId | null {
  const offeredSet = new Set(offered);
  return tools.find((id) => offeredSet.has(id)) ?? null;
}

/**
 * Deterministic steal/pre-rank after any provider, including live Jev.
 * Never upgrades injection or empty. Never invents a tool that was not offered.
 * Confirm is still required.
 */
export function applySignalSteal(
  input: string,
  offered: readonly ToolId[],
  current: {
    status: RouteStatus;
    primaryActionId: ToolId | null;
    suggestionIds: readonly ToolId[];
  },
  browser: PreferredBrowser = readMacSettings().preferredBrowser,
): SignalStealResult | null {
  const match = detectSteal(input, browser);
  if (!match) {
    return applyPathSteal(input, offered, current);
  }
  const primary = stealPrimary(match.tools, offered);
  if (!primary) {
    return null;
  }
  const offeredSet = new Set(offered);
  const suggestionIds = uniqueIds([
    primary,
    ...match.tools.filter((id) => offeredSet.has(id)),
    ...current.suggestionIds.filter((id) => offeredSet.has(id)),
  ]).slice(0, MAX_SUGGESTIONS);

  return {
    status: "select",
    primaryActionId: primary,
    suggestionIds,
  };
}

/** Put the steal family first in the catalogue Jev sees. Steal still guarantees rank. */
export function preRankCandidates<T extends { id: string }>(
  input: string,
  candidates: readonly T[],
  browser: PreferredBrowser = readMacSettings().preferredBrowser,
): T[] {
  const match = detectSteal(input, browser);
  if (!match) {
    return [...candidates];
  }
  const preferred = new Set<string>(match.tools);
  return [
    ...candidates.filter((candidate) => preferred.has(candidate.id)),
    ...candidates.filter((candidate) => !preferred.has(candidate.id)),
  ];
}
