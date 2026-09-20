import { isMacActionTool } from "./macActions";
import { parseFacts } from "./parsers";
import { isLocalSaveTool } from "./saveLocal";
import { isSearchOpenTool } from "./searchLinks";
import { collapsedText, firstFilePath, firstGithubUrl, firstPhone } from "./signals";
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
  if (parsed.phones.length > 0) {
    facts.push(...parsed.phones.map((phone) => `Phone: ${phone}`));
  }
  if (toolId === "draft_event" || toolId === "open_in_calendar") {
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
  if (
    toolId === "reveal_in_finder" ||
    toolId === "open_in_terminal" ||
    toolId === "open_in_editor" ||
    toolId === "open_in_preview" ||
    toolId === "copy_posix_path" ||
    toolId === "open_enclosing_folder"
  ) {
    const path = firstFilePath(input);
    facts.push(path ? `Path: ${path}` : "No pasted path — Confirm uses a local folder or a temp file.");
  }
  if (toolId === "reveal_in_finder") {
    const path = firstFilePath(input);
    facts.push(path ? `Finder will open ${path}.` : "Finder will open the local inbox folder.");
  }
  if (toolId === "open_enclosing_folder") {
    facts.push("Opens the folder that contains the file, not the file itself.");
  }
  if (toolId === "open_in_terminal") {
    facts.push("Opens Terminal at a pasted path, or the app alone. The paste is never a shell command.");
  }
  if (toolId === "save_to_desktop") {
    facts.push("Writes a new file on the Desktop. Existing files are not overwritten.");
  }
  if (toolId === "save_to_downloads") {
    facts.push("Writes a new file in Downloads. Existing files are not overwritten.");
  }
  if (toolId === "reveal_downloads") {
    facts.push("Finder will open the Downloads folder.");
  }
  if (toolId === "reveal_desktop") {
    facts.push("Finder will open the Desktop folder.");
  }
  if (toolId === "reveal_documents") {
    facts.push("Finder will open the Documents folder.");
  }
  if (toolId === "open_maps") {
    facts.push("Apple Maps will search for this address. Web/Linux open Google Maps instead.");
  }
  if (toolId === "call_phone" || toolId === "message_phone") {
    const phone = firstPhone(input);
    facts.push(phone ? `Number: ${phone}` : "No phone number found.");
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
    summary: previewSummary(toolId, parsed.urls[0], parsed.emails[0], firstFilePath(input)),
    facts,
    stateVersion,
  };
}

function previewSummary(
  toolId: ToolId,
  url?: string,
  email?: string,
  path?: string | null,
): string {
  if (toolId === "open_url") {
    return url
      ? `Confirm will open ${url} in your browser. Other schemes are blocked.`
      : "Confirm will open the first http or https link in your browser. Other schemes are blocked.";
  }
  if (isSearchOpenTool(toolId)) {
    return "Confirm will open an http(s) search or maps page. Nothing is typed into other apps.";
  }
  if (toolId === "draft_email") {
    return email
      ? `Confirm will open a Mail draft to ${email}. Nothing is sent.`
      : "Confirm will open a mailto: draft. Nothing is sent.";
  }
  if (toolId === "draft_event") {
    return "Confirm will download an .ics draft. Nothing is sent, scheduled, or written to a calendar.";
  }
  if (toolId === "copy_to_clipboard" || toolId === "draft_message" || toolId === "extract_urls") {
    return "Confirm will copy text to the clipboard. Nothing is sent or scheduled.";
  }
  if (toolId === "copy_posix_path") {
    return path
      ? `Confirm will copy ${path} to the clipboard.`
      : "Confirm will copy the pasted POSIX path. Nothing is sent.";
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
      return path
        ? `Confirm will open ${path} in Finder on Mac. Finder is Mac-only.`
        : "Confirm will open a pasted path in Finder on Mac. Finder is Mac-only.";
    }
    if (toolId === "open_in_safari") {
      return url
        ? `Confirm will open ${url} in Safari on Mac. Elsewhere the default browser is used.`
        : "Confirm will open the first http(s) link in Safari on Mac. Elsewhere the default browser is used.";
    }
    if (toolId === "open_in_chrome") {
      return url
        ? `Confirm will open ${url} in Chrome on Mac. Elsewhere the default browser is used.`
        : "Confirm will open the first http(s) link in Chrome on Mac. Elsewhere the default browser is used.";
    }
    if (toolId === "dictionary_lookup") {
      return "Confirm will open Dictionary (dict://) on Mac, or Wiktionary on the web.";
    }
    if (toolId === "spotlight_search") {
      return "Confirm will copy the query and try Spotlight on Mac. Elsewhere the query is copied.";
    }
    if (toolId === "open_in_terminal") {
      return path
        ? `Confirm will open Terminal at ${path}. The paste is never executed as a command.`
        : "Confirm will open Terminal at a pasted path. The paste is never executed as a command.";
    }
    if (toolId === "run_shortcut") {
      return "Confirm will run the Shortcut named in Settings. If none is set, nothing runs.";
    }
    if (toolId === "speak_text") {
      return "Confirm will speak the text with say on Mac. Elsewhere this is a labeled stub.";
    }
    if (toolId === "share_text") {
      return "Confirm will open the Mac share sheet. Elsewhere the text is copied. No silent send.";
    }
    if (toolId === "open_maps") {
      return "Confirm will open Apple Maps for this address on Mac. Elsewhere Google Maps opens.";
    }
    if (toolId === "open_in_editor") {
      return path
        ? `Confirm will open ${path} in the preferred editor (Cursor, VS Code, or TextEdit).`
        : "Confirm will open this text in the preferred editor on Mac. Elsewhere a file is downloaded.";
    }
    if (toolId === "save_to_desktop") {
      return "Confirm will write a new .txt or .md file on the Desktop. Existing files are not overwritten.";
    }
    if (toolId === "save_to_downloads") {
      return "Confirm will write a new .txt or .md file in Downloads. Existing files are not overwritten.";
    }
    if (toolId === "reveal_downloads") {
      return "Confirm will open the Downloads folder in Finder on Mac.";
    }
    if (toolId === "reveal_desktop") {
      return "Confirm will open the Desktop folder in Finder on Mac.";
    }
    if (toolId === "reveal_documents") {
      return "Confirm will open the Documents folder in Finder on Mac.";
    }
    if (toolId === "open_in_preview") {
      return path
        ? `Confirm will open ${path} in Preview on Mac.`
        : "Confirm will open a pasted PDF or image in Preview on Mac.";
    }
    if (toolId === "call_phone") {
      return "Confirm will open a tel: link. Nothing is dialed until you confirm in Phone.";
    }
    if (toolId === "message_phone") {
      return "Confirm will open an sms: draft. Nothing is sent.";
    }
    if (toolId === "open_enclosing_folder") {
      return path
        ? `Confirm will open the folder that contains ${path}.`
        : "Confirm will open the folder that contains the pasted file.";
    }
    if (toolId === "save_contact") {
      return "Confirm will save a vCard stub from the parsed phone or email. Nothing is sent.";
    }
  }
  return "Confirm is required. Nothing is sent, scheduled, or written externally.";
}
