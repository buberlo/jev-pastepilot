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
  if (parsed.emails.length > 0) {
    facts.push(...parsed.emails.map((email) => `Email: ${email}`));
  }
  if (toolId === "draft_event") {
    if (parsed.dateHints.length > 0) {
      facts.push(...parsed.dateHints.map((hint) => `Date hint: ${hint}`));
    }
    if (parsed.times.length > 0) {
      facts.push(...parsed.times.map((time) => `Time: ${time}`));
    }
    if (parsed.dateHints.length === 0 && parsed.times.length === 0) {
      facts.push("No date found — draft without a time.");
    }
  }
  if (snippet) {
    facts.push(`Text: ${snippet}`);
  }

  return {
    toolId,
    title: toolLabel(toolId),
    summary: previewSummary(toolId),
    facts,
    stateVersion,
  };
}

function previewSummary(toolId: ToolId): string {
  if (toolId === "open_url") {
    return "Confirm will open the first http or https link in your browser. Other schemes are blocked.";
  }
  if (toolId === "capture_idea" || toolId === "capture_task" || toolId === "save_note") {
    return "Confirm will append this text to a local inbox file. Nothing is emailed or scheduled.";
  }
  return `${TOOLS[toolId].description} Still a local stub — Nothing is sent, scheduled, or written externally.`;
}

function collapse(input: string, max: number): string {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
