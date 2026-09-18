import { parseFacts } from "./parsers";
import { toolLabel, TOOLS } from "./tools";
import type { ActionPreview, ToolId } from "./types";

export function buildPreview(
  toolId: ToolId,
  input: string,
  stateVersion: string,
): ActionPreview {
  const parsed = parseFacts(input);
  const snippet = collapse(input, 180);
  const facts: string[] = [];

  if (parsed.urls.length > 0) {
    facts.push(...parsed.urls.map((url) => `Link: ${url}`));
  }
  if (toolId === "draft_event") {
    if (parsed.dateHints.length > 0) {
      facts.push(...parsed.dateHints.map((hint) => `Date hint: ${hint}`));
    } else {
      facts.push("No date found — draft without a time.");
    }
  }
  if (snippet) {
    facts.push(`Text: ${snippet}`);
  }

  return {
    toolId,
    title: toolLabel(toolId),
    summary: `${TOOLS[toolId].description} Nothing is sent, scheduled, or written externally.`,
    facts,
    stateVersion,
  };
}

function collapse(input: string, max: number): string {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
