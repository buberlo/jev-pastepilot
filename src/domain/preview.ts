import { isMacActionTool } from "./macActions";
import { parseFacts } from "./parsers";
import { isLocalSaveTool } from "./saveLocal";
import { isSearchOpenTool } from "./searchLinks";
import { collapsedText, firstFilePath, firstGithubUrl } from "./signals";
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
  if (toolId === "run_shortcut") {
    facts.push("Uses the Shortcut name from Settings (PASTEPILOT_SHORTCUT_NAME). Never the API key.");
  }
  if (toolId === "reveal_in_finder" || toolId === "open_in_terminal") {
    const path = firstFilePath(input);
    facts.push(path ? `Path: ${path}` : "No pasted path — Confirm uses the local inbox folder.");
  }
  if (toolId === "open_in_terminal") {
    facts.push("Opens Terminal at a pasted path, or the app alone. The paste is never a shell command.");
  }
  if (toolId === "screen_paste") {
    facts.push("Local screen only: injection flag, kind, and parsed counts. No write.");
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
  if (toolId === "screen_paste") {
    return "Confirm will show an injection and substance summary. Nothing is sent or written.";
  }
  if (isMacActionTool(toolId)) {
    if (toolId === "open_in_notes") {
      return "Confirm will create an Apple Notes draft on Mac. Elsewhere this saves a local note.";
    }
    if (toolId === "add_reminder") {
      return "Confirm will create a Reminders item on Mac. Elsewhere this saves a local task.";
    }
    if (toolId === "open_in_calendar") {
      return "Confirm will open Calendar with an .ics draft on Mac. Elsewhere it downloads the draft. Nothing is scheduled.";
    }
    if (toolId === "reveal_in_finder") {
      return "Confirm will open a pasted path in Finder on Mac. Finder is Mac-only.";
    }
    if (toolId === "open_in_safari" || toolId === "open_in_chrome") {
      return "Confirm will open the first http(s) link in that browser on Mac. Elsewhere the default browser is used.";
    }
    if (toolId === "dictionary_lookup") {
      return "Confirm will open Dictionary (dict://) on Mac, or Wiktionary on the web.";
    }
    if (toolId === "spotlight_search") {
      return "Confirm will copy the query and try Spotlight on Mac. Elsewhere the query is copied.";
    }
    if (toolId === "open_in_terminal") {
      return "Confirm will open Terminal at a pasted path. The paste is never executed as a command.";
    }
    if (toolId === "run_shortcut") {
      return "Confirm will run the Shortcut named in Settings. If none is set, nothing runs.";
    }
    if (toolId === "speak_text") {
      return "Confirm will speak the text with say on Mac. Elsewhere this is a labeled stub.";
    }
    if (toolId === "share_text") {
      return "Confirm will copy the text and notify. No silent send.";
    }
  }
  return "Confirm is required. Nothing is sent, scheduled, or written externally.";
}
