import { parseFacts } from "./parsers";
import { asChecklist } from "./signals";
import type { ToolId } from "./types";

export const LOCAL_SAVE_TOOL_IDS = [
  "capture_idea",
  "capture_task",
  "save_note",
  "save_markdown",
  "save_code_snippet",
  "save_quote",
  "save_link",
  "create_checklist",
  "summarize_locally",
] as const;

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
  save_markdown: "Markdown",
  save_code_snippet: "Code",
  save_quote: "Quote",
  save_link: "Link",
  create_checklist: "Checklist",
  summarize_locally: "Local note (no summary generated)",
};

const MAX_SAVE_CHARS = 32_000;

export function isLocalSaveTool(id: string): id is LocalSaveToolId {
  return (LOCAL_SAVE_TOOL_IDS as readonly string[]).includes(id);
}

function bodyForSave(toolId: LocalSaveToolId, input: string): string {
  const trimmed = input.trim();
  if (toolId === "create_checklist") {
    return asChecklist(trimmed);
  }
  if (toolId === "save_link") {
    const urls = parseFacts(trimmed).urls;
    if (urls.length === 0) {
      return trimmed;
    }
    return `${urls.join("\n")}\n\n${trimmed}`.slice(0, MAX_SAVE_CHARS);
  }
  if (toolId === "summarize_locally") {
    return `No generated summary.\n\n${trimmed}`.slice(0, MAX_SAVE_CHARS);
  }
  if (toolId === "save_code_snippet") {
    if (trimmed.startsWith("```")) {
      return trimmed.slice(0, MAX_SAVE_CHARS);
    }
    return `\`\`\`\n${trimmed}\n\`\`\``.slice(0, MAX_SAVE_CHARS);
  }
  return trimmed.slice(0, MAX_SAVE_CHARS);
}

export function buildLocalSaveEntry(
  toolId: ToolId,
  input: string,
  savedAt = new Date().toISOString(),
): LocalSaveEntry | null {
  if (!isLocalSaveTool(toolId)) {
    return null;
  }
  const text = bodyForSave(toolId, input);
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
