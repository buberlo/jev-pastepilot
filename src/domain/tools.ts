import { parseFacts } from "./parsers";
import {
  firstGithubUrl,
  looksLikeAddress,
  looksLikeCode,
  looksLikeDictionaryWord,
  looksLikeFilePath,
  looksLikeJson,
} from "./signals";
import {
  MAX_SUGGESTIONS,
  TOOL_IDS,
  type ContentKind,
  type ParsedFacts,
  type ToolDefinition,
  type ToolId,
} from "./types";

export const KIND_TOOLS: Record<ContentKind, readonly ToolId[]> = {
  error_log: ["open_log_viewer", "search_error", "search_stack_overflow"],
  url: ["open_url", "open_in_safari", "open_in_chrome"],
  meeting: ["draft_event", "open_in_calendar", "add_reminder"],
  task: ["capture_task", "add_reminder", "create_checklist"],
  idea: ["capture_idea", "open_in_notes", "share_text"],
  ordinary: ["save_note", "open_in_notes", "search_web"],
};

export const CLARIFY_TOOLS: readonly ToolId[] = ["capture_task", "capture_idea", "save_note"];

const COMPANION_TOOLS: Partial<Record<ToolId, readonly ToolId[]>> = {
  search_docs: ["search_docs", "search_web", "save_note"],
  search_wikipedia: ["search_wikipedia", "search_web", "save_note"],
  open_maps: ["open_maps", "search_web", "copy_to_clipboard"],
  draft_message: ["draft_message", "draft_email", "copy_to_clipboard"],
  extract_urls: ["extract_urls", "open_url", "save_note"],
  format_json: ["format_json", "save_note", "copy_to_clipboard"],
  summarize_locally: ["summarize_locally", "save_note", "copy_to_clipboard"],
  save_markdown: ["save_markdown", "save_note", "copy_to_clipboard"],
  save_code_snippet: ["save_code_snippet", "save_note", "copy_to_clipboard"],
  save_quote: ["save_quote", "save_note", "copy_to_clipboard"],
  open_github: ["open_github", "open_url", "save_link"],
  open_in_notes: ["open_in_notes", "save_note", "share_text"],
  add_reminder: ["add_reminder", "capture_task", "create_checklist"],
  open_in_calendar: ["open_in_calendar", "draft_event", "add_reminder"],
  reveal_in_finder: ["reveal_in_finder", "open_in_terminal", "save_note"],
  open_in_safari: ["open_in_safari", "open_in_chrome", "open_url"],
  open_in_chrome: ["open_in_chrome", "open_in_safari", "open_url"],
  dictionary_lookup: ["dictionary_lookup", "spotlight_search", "search_web"],
  spotlight_search: ["spotlight_search", "search_web", "save_note"],
  open_in_terminal: ["open_in_terminal", "reveal_in_finder", "save_note"],
  run_shortcut: ["run_shortcut", "save_note", "copy_to_clipboard"],
  speak_text: ["speak_text", "share_text", "save_note"],
  share_text: ["share_text", "copy_to_clipboard", "save_note"],
  screen_paste: ["screen_paste", "save_note", "copy_to_clipboard"],
};

export const TOOLS: Record<ToolId, ToolDefinition> = {
  open_url: {
    id: "open_url",
    label: "Open link",
    description: "Open the first parsed http(s) link in the browser after Confirm.",
    safeFallback: false,
  },
  search_web: {
    id: "search_web",
    label: "Search the web",
    description: "Open a DuckDuckGo search for the pasted text after Confirm.",
    safeFallback: false,
  },
  search_docs: {
    id: "search_docs",
    label: "Search docs",
    description: "Open a DuckDuckGo documentation search for the pasted text after Confirm.",
    safeFallback: false,
  },
  search_wikipedia: {
    id: "search_wikipedia",
    label: "Search Wikipedia",
    description: "Open a Wikipedia search for the pasted text after Confirm.",
    safeFallback: false,
  },
  search_error: {
    id: "search_error",
    label: "Search this error",
    description: "Open a DuckDuckGo search for the pasted error text after Confirm.",
    safeFallback: false,
  },
  search_stack_overflow: {
    id: "search_stack_overflow",
    label: "Search Stack Overflow",
    description: "Open a Stack Overflow search for the pasted text after Confirm.",
    safeFallback: false,
  },
  open_log_viewer: {
    id: "open_log_viewer",
    label: "Open log viewer",
    description: "Download the pasted log as a local .log file after Confirm.",
    safeFallback: false,
  },
  open_maps: {
    id: "open_maps",
    label: "Open maps",
    description: "Open a maps search for the pasted address or text after Confirm.",
    safeFallback: false,
  },
  open_github: {
    id: "open_github",
    label: "Open GitHub",
    description: "Open a parsed GitHub link, or a GitHub search, after Confirm.",
    safeFallback: false,
  },
  draft_email: {
    id: "draft_email",
    label: "Draft email",
    description: "Open a mailto: draft from the paste. Confirm never sends mail.",
    safeFallback: false,
  },
  draft_message: {
    id: "draft_message",
    label: "Draft message",
    description: "Copy a ready-to-send message from the paste after Confirm.",
    safeFallback: false,
  },
  draft_event: {
    id: "draft_event",
    label: "Draft event",
    description: "Download an .ics calendar draft. Confirm never writes a calendar.",
    safeFallback: false,
  },
  copy_to_clipboard: {
    id: "copy_to_clipboard",
    label: "Copy text",
    description: "Copy the pasted text to the clipboard after Confirm.",
    safeFallback: false,
  },
  extract_urls: {
    id: "extract_urls",
    label: "Extract links",
    description: "Copy parsed http(s) links from the paste after Confirm.",
    safeFallback: false,
  },
  format_json: {
    id: "format_json",
    label: "Format JSON",
    description: "Pretty-print JSON and save a local .json file after Confirm.",
    safeFallback: false,
  },
  summarize_locally: {
    id: "summarize_locally",
    label: "Save for later",
    description: "Append the paste to the local inbox. No model summary is generated.",
    safeFallback: false,
  },
  capture_task: {
    id: "capture_task",
    label: "Save as task",
    description: "Append the text as a task in your local inbox after Confirm.",
    safeFallback: true,
  },
  capture_idea: {
    id: "capture_idea",
    label: "Save idea",
    description: "Append the text as an idea in your local inbox after Confirm.",
    safeFallback: true,
  },
  save_note: {
    id: "save_note",
    label: "Save note",
    description: "Append the text as a note in your local inbox after Confirm.",
    safeFallback: true,
  },
  save_markdown: {
    id: "save_markdown",
    label: "Save markdown",
    description: "Append the text as a markdown block in your local inbox after Confirm.",
    safeFallback: false,
  },
  save_code_snippet: {
    id: "save_code_snippet",
    label: "Save code",
    description: "Append the text as a code snippet in your local inbox after Confirm.",
    safeFallback: false,
  },
  save_quote: {
    id: "save_quote",
    label: "Save quote",
    description: "Append the text as a quote in your local inbox after Confirm.",
    safeFallback: false,
  },
  save_link: {
    id: "save_link",
    label: "Save link",
    description: "Append the parsed link and text to your local inbox after Confirm.",
    safeFallback: false,
  },
  create_checklist: {
    id: "create_checklist",
    label: "Save checklist",
    description: "Turn lines into a markdown checklist and append them locally after Confirm.",
    safeFallback: false,
  },
  open_in_notes: {
    id: "open_in_notes",
    label: "Open in Notes",
    description: "Create an Apple Notes draft after Confirm. Web/Linux saves a local note instead.",
    safeFallback: false,
  },
  add_reminder: {
    id: "add_reminder",
    label: "Add reminder",
    description: "Create a Reminders item after Confirm. Web/Linux saves a local task instead.",
    safeFallback: false,
  },
  open_in_calendar: {
    id: "open_in_calendar",
    label: "Open in Calendar",
    description: "Open Calendar with an .ics draft after Confirm. Never writes a calendar itself.",
    safeFallback: false,
  },
  reveal_in_finder: {
    id: "reveal_in_finder",
    label: "Open in Finder",
    description: "Open a pasted path in Finder after Confirm. Home and absolute paths only.",
    safeFallback: false,
  },
  open_in_safari: {
    id: "open_in_safari",
    label: "Open in Safari",
    description: "Open the parsed http(s) link in Safari after Confirm. Other browsers on web/Linux.",
    safeFallback: false,
  },
  open_in_chrome: {
    id: "open_in_chrome",
    label: "Open in Chrome",
    description: "Open the parsed http(s) link in Chrome after Confirm if Chrome is installed.",
    safeFallback: false,
  },
  dictionary_lookup: {
    id: "dictionary_lookup",
    label: "Look up word",
    description: "Open Dictionary (dict://) for a word after Confirm. Web uses Wiktionary.",
    safeFallback: false,
  },
  spotlight_search: {
    id: "spotlight_search",
    label: "Spotlight search",
    description: "Open Spotlight with the paste as a query after Confirm. Copies the query elsewhere.",
    safeFallback: false,
  },
  open_in_terminal: {
    id: "open_in_terminal",
    label: "Open in Terminal",
    description: "Open Terminal at a pasted path after Confirm. Never runs the paste as a shell command.",
    safeFallback: false,
  },
  run_shortcut: {
    id: "run_shortcut",
    label: "Run Shortcut",
    description: "Run the Shortcut named in Settings after Confirm. The API key is never put on the URL.",
    safeFallback: false,
  },
  speak_text: {
    id: "speak_text",
    label: "Speak text",
    description: "Speak the paste with say after Confirm. Mac only; elsewhere this is a labeled stub.",
    safeFallback: false,
  },
  share_text: {
    id: "share_text",
    label: "Share text",
    description: "Copy the paste and notify after Confirm. Mac may show a notification; no silent send.",
    safeFallback: false,
  },
  screen_paste: {
    id: "screen_paste",
    label: "Screen paste",
    description: "Show an injection and substance summary after Confirm. Local only; nothing is sent.",
    safeFallback: false,
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

function uniqueIds(ids: readonly ToolId[]): ToolId[] {
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

export function familyFor(selected: ToolId): readonly ToolId[] {
  const primary = Object.values(KIND_TOOLS).find((ids) => ids[0] === selected);
  if (primary) {
    return primary;
  }
  const containing = Object.values(KIND_TOOLS).find((ids) => ids.includes(selected));
  if (containing) {
    return containing;
  }
  return COMPANION_TOOLS[selected] ?? ([selected, "save_note", "copy_to_clipboard"] as const);
}

/**
 * Ranked pool for the mock/local heuristic. Jev still sees the full catalogue.
 * Refinements (JSON, GitHub, address) go first so ordinary pastes are not starved.
 */
export function preferredTools(kind: ContentKind, input: string, parsed: ParsedFacts): ToolId[] {
  const extras: ToolId[] = [];
  if (looksLikeJson(input) && kind !== "error_log") {
    extras.push("format_json", "copy_to_clipboard", "save_note");
  }
  if (firstGithubUrl(parsed.urls)) {
    extras.push("open_github", "open_url", "save_link");
  }
  if (looksLikeAddress(input) && kind === "ordinary") {
    extras.push("open_maps", "search_web", "copy_to_clipboard");
  }
  if (parsed.emails.length > 0 && kind === "ordinary") {
    extras.push("draft_email", "draft_message", "save_note");
  }
  if (looksLikeCode(input) && (kind === "ordinary" || kind === "idea")) {
    extras.push("save_code_snippet", "copy_to_clipboard", "save_note");
  }
  if (looksLikeFilePath(input) && kind === "ordinary") {
    extras.push("reveal_in_finder", "open_in_terminal", "save_note");
  }
  if (looksLikeDictionaryWord(input) && kind === "ordinary") {
    extras.push("dictionary_lookup", "spotlight_search", "search_web");
  }
  return uniqueIds([...extras, ...KIND_TOOLS[kind]]);
}

export function preferredToolsForInput(kind: ContentKind, input: string): ToolId[] {
  return preferredTools(kind, input, parseFacts(input));
}

export function expandSuggestions(selected: ToolId, offered: readonly ToolId[]): ToolId[] {
  const offeredSet = new Set(offered);
  const ranked = familyFor(selected).filter((id) => offeredSet.has(id));
  const ordered = [selected, ...ranked.filter((id) => id !== selected)];
  return uniqueIds(ordered).slice(0, MAX_SUGGESTIONS);
}

export function clarifySuggestions(offered: readonly ToolId[]): ToolId[] {
  const offeredSet = new Set(offered);
  return CLARIFY_TOOLS.filter((id) => offeredSet.has(id)).slice(0, MAX_SUGGESTIONS);
}

export function fallbackSuggestions(offered: readonly ToolId[]): ToolId[] {
  const offeredSet = new Set(offered);
  return SAFE_FALLBACK_IDS.filter((id) => offeredSet.has(id)).slice(0, MAX_SUGGESTIONS);
}
