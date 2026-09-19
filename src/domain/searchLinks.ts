import { allowlistedHttpUrl } from "./openUrl";
import { collapsedText, firstGithubUrl } from "./signals";
import type { ParsedFacts, ToolId } from "./types";

export const SEARCH_OPEN_TOOLS = [
  "search_web",
  "search_docs",
  "search_wikipedia",
  "search_error",
  "search_stack_overflow",
  "open_maps",
  "open_github",
] as const;

export type SearchOpenToolId = (typeof SEARCH_OPEN_TOOLS)[number];

export function isSearchOpenTool(id: string): id is SearchOpenToolId {
  return (SEARCH_OPEN_TOOLS as readonly string[]).includes(id);
}

function duckDuckGo(query: string): string {
  return `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
}

/**
 * Build an allowlisted http(s) search or maps URL from the paste.
 * Confirm still required. Never logs the query.
 */
export function urlForSearchTool(
  toolId: SearchOpenToolId,
  input: string,
  parsed: ParsedFacts,
): string | null {
  if (toolId === "open_github") {
    const github = firstGithubUrl(parsed.urls);
    if (github) {
      return github;
    }
  }

  const query = collapsedText(input, 400).replace(/…$/, "");
  if (!query) {
    return null;
  }

  const raw =
    toolId === "search_web"
      ? duckDuckGo(query)
      : toolId === "search_docs"
        ? duckDuckGo(`${query} documentation`)
        : toolId === "search_error"
          ? duckDuckGo(query)
          : toolId === "search_stack_overflow"
            ? `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`
            : toolId === "open_maps"
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
              : toolId === "search_wikipedia"
                ? `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`
                : `https://github.com/search?q=${encodeURIComponent(query)}`;

  return allowlistedHttpUrl(raw);
}

export function isSearchOpenToolId(id: ToolId): id is SearchOpenToolId {
  return isSearchOpenTool(id);
}
