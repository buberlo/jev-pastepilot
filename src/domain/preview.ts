import { parseFacts } from "./parsers";
import { isLocalSaveTool } from "./saveLocal";
import { isSearchOpenTool } from "./searchLinks";
import { collapsedText, firstGithubUrl } from "./signals";
import { toolLabel } from "./tools";
import type { ActionPreview, ToolId } from "./types";

export function buildPreview(
  toolId: ToolId,
  input: string,
  stateVersion: string,
): ActionPreview {
  const parsed = parseFacts(input);
  const snippet = collapsedText(input, 180);
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
  if (toolId === "open_github") {
    const github = firstGithubUrl(parsed.urls);
    facts.push(github ? `GitHub: ${github}` : "No GitHub link — Confirm opens a GitHub search.");
  }
  if (toolId === "format_json") {
    facts.push("Pretty-print only runs if the paste is valid JSON.");
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
  if (isSearchOpenTool(toolId)) {
    return "Confirm will open an http(s) search or maps page. Nothing is typed into other apps.";
  }
  if (toolId === "draft_email") {
    return "Confirm will open a mailto: draft. Nothing is sent.";
  }
  if (toolId === "draft_event") {
    return "Confirm will download an .ics draft. Nothing is sent, scheduled, or written to a calendar.";
  }
  if (toolId === "copy_to_clipboard" || toolId === "draft_message" || toolId === "extract_urls") {
    return "Confirm will copy text to the clipboard. Nothing is sent or scheduled.";
  }
  if (toolId === "format_json") {
    return "Confirm will pretty-print JSON and save a local .json file. Nothing is sent.";
  }
  if (toolId === "open_log_viewer") {
    return "Confirm will save the paste as a local .log file. Nothing is sent.";
  }
  if (isLocalSaveTool(toolId)) {
    if (toolId === "summarize_locally") {
      return "Confirm will append this text to a local inbox. PastePilot does not generate a summary.";
    }
    return "Confirm will append this text to a local inbox file. Nothing is emailed or scheduled.";
  }
  return "Confirm is required. Nothing is sent, scheduled, or written externally.";
}
