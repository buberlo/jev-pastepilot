import type { ToolId } from "./types";

export const LOCAL_SAVE_TOOL_IDS = ["capture_idea", "capture_task", "save_note"] as const;

export type LocalSaveToolId = (typeof LOCAL_SAVE_TOOL_IDS)[number];

export type LocalSaveEntry = {
  toolId: LocalSaveToolId;
  text: string;
  savedAt: string;
};

const HEADINGS: Record<LocalSaveToolId, string> = {
  capture_idea: "Idea",
  capture_task: "Task",
  save_note: "Note",
};

const MAX_SAVE_CHARS = 32_000;

export function isLocalSaveTool(id: string): id is LocalSaveToolId {
  return (LOCAL_SAVE_TOOL_IDS as readonly string[]).includes(id);
}

export function buildLocalSaveEntry(
  toolId: ToolId,
  input: string,
  savedAt = new Date().toISOString(),
): LocalSaveEntry | null {
  if (!isLocalSaveTool(toolId)) {
    return null;
  }
  const text = input.trim().slice(0, MAX_SAVE_CHARS);
  if (!text) {
    return null;
  }
  return { toolId, text, savedAt };
}

export function formatInboxMarkdown(entry: LocalSaveEntry): string {
  const heading = HEADINGS[entry.toolId];
  return `## ${heading} — ${entry.savedAt}\n\n${entry.text}\n\n`;
}

export function countInboxEntries(markdown: string): number {
  return [...markdown.matchAll(/^## /gm)].length;
}

export function localSaveHeading(toolId: LocalSaveToolId): string {
  return HEADINGS[toolId];
}
