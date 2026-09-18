import { TOOL_IDS, type ToolDefinition, type ToolId } from "./types";

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
    description: "Draft a calendar event locally. Nothing is scheduled.",
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
