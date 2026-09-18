import {
  MAX_SUGGESTIONS,
  TOOL_IDS,
  type ContentKind,
  type ToolDefinition,
  type ToolId,
} from "./types";

export const KIND_TOOLS: Record<ContentKind, readonly ToolId[]> = {
  error_log: ["open_log_viewer", "search_docs"],
  url: ["open_url", "save_note"],
  meeting: ["draft_event"],
  task: ["capture_task"],
  idea: ["capture_idea"],
  ordinary: ["save_note", "capture_idea", "capture_task"],
};

export const CLARIFY_TOOLS: readonly ToolId[] = ["capture_task", "capture_idea"];

export const TOOLS: Record<ToolId, ToolDefinition> = {
  open_log_viewer: {
    id: "open_log_viewer",
    label: "Open log viewer",
    description: "Open a local preview of the pasted log text.",
    safeFallback: false,
  },
  search_docs: {
    id: "search_docs",
    label: "Search docs",
    description: "Prepare a local documentation search from the pasted text.",
    safeFallback: false,
  },
  open_url: {
    id: "open_url",
    label: "Open link",
    description: "Show the parsed link in a local preview.",
    safeFallback: false,
  },
  draft_event: {
    id: "draft_event",
    label: "Draft event",
    description: "Draft a calendar event locally.",
    safeFallback: false,
  },
  capture_task: {
    id: "capture_task",
    label: "Save as task",
    description: "Save the text as a local task draft.",
    safeFallback: true,
  },
  capture_idea: {
    id: "capture_idea",
    label: "Save idea",
    description: "Save the text as a local idea draft.",
    safeFallback: true,
  },
  save_note: {
    id: "save_note",
    label: "Save note",
    description: "Save the text as a local note.",
    safeFallback: true,
  },
};

export const ALLOWLIST = new Set<string>(TOOL_IDS);

export const SAFE_FALLBACK_IDS: ToolId[] = TOOL_IDS.filter((id) => TOOLS[id].safeFallback);

export function isToolId(value: string): value is ToolId {
  return ALLOWLIST.has(value);
}

export function toolLabel(id: ToolId): string {
  return TOOLS[id].label;
}

export function catalogueCandidates(
  ids: readonly string[] = TOOL_IDS,
): Array<{ id: string; description: string }> {
  return ids.filter(isToolId).map((id) => ({
    id,
    description: TOOLS[id].description,
  }));
}

export function offeredToolIds(candidates: ReadonlyArray<{ id: string }>): ToolId[] {
  return candidates.map((candidate) => candidate.id).filter(isToolId);
}

export function expandSuggestions(selected: ToolId, offered: readonly ToolId[]): ToolId[] {
  const offeredSet = new Set(offered);
  const family =
    Object.values(KIND_TOOLS).find((ids) => ids.includes(selected)) ?? ([selected] as const);
  const ranked = family.filter((id) => offeredSet.has(id));
  const ordered = [selected, ...ranked.filter((id) => id !== selected)];
  return ordered.filter((id, index) => ordered.indexOf(id) === index).slice(0, MAX_SUGGESTIONS);
}

export function clarifySuggestions(offered: readonly ToolId[]): ToolId[] {
  const offeredSet = new Set(offered);
  return CLARIFY_TOOLS.filter((id) => offeredSet.has(id)).slice(0, MAX_SUGGESTIONS);
}

export function fallbackSuggestions(offered: readonly ToolId[]): ToolId[] {
  const offeredSet = new Set(offered);
  return SAFE_FALLBACK_IDS.filter((id) => offeredSet.has(id)).slice(0, MAX_SUGGESTIONS);
}
