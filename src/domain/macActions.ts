import { buildIcsDraft } from "./drafts";
import { firstAllowlistedUrl } from "./openUrl";
import { parseFacts } from "./parsers";
import { buildLocalSaveEntry } from "./saveLocal";
import { collapsedText, dictionaryWord, firstFilePath } from "./signals";
import type { MacActionFallback, ParsedFacts } from "./types";

export const MAC_ACTION_TOOLS = [
  "open_in_notes",
  "add_reminder",
  "open_in_calendar",
  "reveal_in_finder",
  "open_in_safari",
  "open_in_chrome",
  "dictionary_lookup",
  "spotlight_search",
  "open_in_terminal",
  "run_shortcut",
  "speak_text",
  "share_text",
] as const;

export type MacActionToolId = (typeof MAC_ACTION_TOOLS)[number];

export type PreferredBrowser = "safari" | "chrome" | "default";

export type MacClientSettings = {
  preferredBrowser: PreferredBrowser;
  shortcutName: string;
};

export type MacActionPayload = {
  toolId: MacActionToolId;
  text: string;
  url?: string;
  path?: string;
  query?: string;
  fallback: MacActionFallback;
};

export function isMacActionTool(id: string): id is MacActionToolId {
  return (MAC_ACTION_TOOLS as readonly string[]).includes(id);
}

const SHORTCUT_NAME = /^[A-Za-z0-9][A-Za-z0-9 ._'-]{0,79}$/;

export function sanitizeShortcutName(raw: string): string {
  const trimmed = raw.trim();
  return SHORTCUT_NAME.test(trimmed) ? trimmed : "";
}

export function readMacSettings(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): MacClientSettings {
  const browser = env.PASTEPILOT_PREFERRED_BROWSER?.trim().toLowerCase();
  const preferredBrowser: PreferredBrowser =
    browser === "safari" || browser === "chrome" ? browser : "default";
  return {
    preferredBrowser,
    shortcutName: sanitizeShortcutName(env.PASTEPILOT_SHORTCUT_NAME ?? ""),
  };
}

export function appleString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function dictUrl(word: string): string {
  return `dict://${encodeURIComponent(word)}`;
}

export function wiktionaryUrl(word: string): string {
  return `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;
}

export function shortcutsRunUrl(name: string, input = ""): string | null {
  const safe = sanitizeShortcutName(name);
  if (!safe) {
    return null;
  }
  const url = new URL("shortcuts://run-shortcut");
  url.searchParams.set("name", safe);
  const trimmed = input.trim().slice(0, 1000);
  if (trimmed) {
    url.searchParams.set("input", trimmed);
  }
  return url.toString();
}

export function notesTitle(input: string): string {
  return collapsedText(input, 80).replace(/…$/, "") || "PastePilot note";
}

export function reminderTitle(input: string): string {
  return collapsedText(input, 120).replace(/…$/, "") || "PastePilot reminder";
}

function firstHttpUrl(input: string, parsed: ParsedFacts): string | undefined {
  return firstAllowlistedUrl(parsed.urls.length > 0 ? parsed.urls : [input]) ?? undefined;
}

/**
 * Build a Confirm payload for a Mac-oriented tool.
 * Execution still goes through the gate. The Mac app runs side-effects in Swift.
 * Node osascript/`open` is only a web/dev fallback on darwin.
 */
export function buildMacActionPayload(
  toolId: MacActionToolId,
  input: string,
  parsed: ParsedFacts = parseFacts(input),
): MacActionPayload | { error: "empty" | "no_url" | "no_query" } {
  const text = input.trim().slice(0, 4000);
  if (
    !text &&
    toolId !== "reveal_in_finder" &&
    toolId !== "open_in_terminal" &&
    toolId !== "run_shortcut"
  ) {
    return { error: "empty" };
  }

  if (toolId === "open_in_notes") {
    const entry = buildLocalSaveEntry("save_note", text);
    if (!entry) {
      return { error: "empty" };
    }
    return {
      toolId,
      text,
      fallback: { type: "save_local", entry },
    };
  }

  if (toolId === "add_reminder") {
    const entry = buildLocalSaveEntry("capture_task", text);
    if (!entry) {
      return { error: "empty" };
    }
    return {
      toolId,
      text,
      fallback: { type: "save_local", entry },
    };
  }

  if (toolId === "open_in_calendar") {
    const content = buildIcsDraft(text, parsed);
    if (!content) {
      return { error: "empty" };
    }
    return {
      toolId,
      text,
      fallback: {
        type: "download",
        filename: "pastepilot-draft.ics",
        content,
        mime: "text/calendar;charset=utf-8",
      },
    };
  }

  if (toolId === "reveal_in_finder") {
    return {
      toolId,
      text,
      path: firstFilePath(input) ?? undefined,
      fallback: { type: "stub" },
    };
  }

  if (toolId === "open_in_safari" || toolId === "open_in_chrome") {
    const url = firstHttpUrl(input, parsed);
    if (!url) {
      return { error: "no_url" };
    }
    return {
      toolId,
      text,
      url,
      fallback: { type: "open_url", url },
    };
  }

  if (toolId === "dictionary_lookup") {
    const word = dictionaryWord(input);
    if (!word) {
      return { error: "no_query" };
    }
    return {
      toolId,
      text: word,
      query: word,
      fallback: { type: "open_url", url: wiktionaryUrl(word) },
    };
  }

  if (toolId === "spotlight_search") {
    const query = collapsedText(input, 200).replace(/…$/, "");
    if (!query) {
      return { error: "no_query" };
    }
    return {
      toolId,
      text,
      query,
      fallback: { type: "copy", text: query },
    };
  }

  if (toolId === "open_in_terminal") {
    return {
      toolId,
      text,
      path: firstFilePath(input) ?? undefined,
      fallback: { type: "stub" },
    };
  }

  if (toolId === "run_shortcut") {
    return {
      toolId,
      text,
      fallback: { type: "stub" },
    };
  }

  if (toolId === "speak_text") {
    if (!text) {
      return { error: "empty" };
    }
    return {
      toolId,
      text: text.slice(0, 400),
      fallback: { type: "stub" },
    };
  }

  if (!text) {
    return { error: "empty" };
  }
  return {
    toolId: "share_text",
    text,
    fallback: { type: "copy", text },
  };
}

export function macActionMessage(toolId: MacActionToolId, used: "mac" | "fallback"): string {
  if (used === "fallback") {
    if (toolId === "open_in_notes") {
      return "Apple Notes is Mac-only. Saved a local note instead. Nothing was sent.";
    }
    if (toolId === "add_reminder") {
      return "Reminders is Mac-only. Saved a local task instead. Nothing was sent.";
    }
    if (toolId === "open_in_calendar") {
      return "Calendar open is Mac-only. Saved an .ics draft. Nothing was scheduled.";
    }
    if (toolId === "open_in_safari" || toolId === "open_in_chrome") {
      return "Opened the link in this browser. Safari/Chrome targeting is Mac-only.";
    }
    if (toolId === "dictionary_lookup") {
      return "Opened a web dictionary. dict:// is Mac-only.";
    }
    if (toolId === "spotlight_search") {
      return "Copied the query. Spotlight is Mac-only.";
    }
    if (toolId === "share_text") {
      return "Copied the text. The Mac share sheet is not available here.";
    }
    if (toolId === "speak_text") {
      return "Speak is Mac-only (say). Nothing was sent.";
    }
    if (toolId === "run_shortcut") {
      return "Shortcuts is Mac-only. Nothing ran.";
    }
    return "That Mac action is not available here. Nothing was sent or scheduled.";
  }

  if (toolId === "open_in_notes") {
    return "Opened Apple Notes with this text. Nothing else was sent.";
  }
  if (toolId === "add_reminder") {
    return "Created a Reminders draft. Nothing else was sent.";
  }
  if (toolId === "open_in_calendar") {
    return "Opened Calendar with an .ics draft. Nothing was scheduled.";
  }
  if (toolId === "reveal_in_finder") {
    return "Opened the path in Finder.";
  }
  if (toolId === "open_in_safari") {
    return "Opened the link in Safari.";
  }
  if (toolId === "open_in_chrome") {
    return "Opened the link in Chrome.";
  }
  if (toolId === "dictionary_lookup") {
    return "Opened Dictionary for that word.";
  }
  if (toolId === "spotlight_search") {
    return "Copied the query and opened Spotlight. Paste if needed (⌘Space).";
  }
  if (toolId === "open_in_terminal") {
    return "Opened Terminal. The paste was not executed as a shell command.";
  }
  if (toolId === "run_shortcut") {
    return "Opened the configured Shortcut. The API key was not put on the URL.";
  }
  if (toolId === "speak_text") {
    return "Spoke the text with say. Nothing was sent.";
  }
  return "Copied the text and posted a notification. Nothing was sent.";
}
