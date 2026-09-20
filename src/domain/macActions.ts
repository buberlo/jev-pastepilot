import { buildIcsDraft, buildPhoneHref, buildVcard } from "./drafts";
import { firstAllowlistedUrl } from "./openUrl";
import { parseFacts } from "./parsers";
import { buildLocalSaveEntry } from "./saveLocal";
import { appleMapsUrl, mapsWebUrl } from "./searchLinks";
import {
  collapsedText,
  dictionaryWord,
  firstFilePath,
  looksLikeCode,
  looksLikePreviewPath,
} from "./signals";
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
  "open_maps",
  "open_in_editor",
  "save_to_desktop",
  "save_to_downloads",
  "reveal_downloads",
  "reveal_desktop",
  "reveal_documents",
  "open_in_preview",
  "call_phone",
  "message_phone",
  "open_enclosing_folder",
  "save_contact",
] as const;

export type MacActionToolId = (typeof MAC_ACTION_TOOLS)[number];

export type PreferredBrowser = "safari" | "chrome" | "default";

export type PreferredEditor = "cursor" | "vscode" | "textedit";

export type MacFolder = "desktop" | "downloads" | "documents";

export type MacClientSettings = {
  preferredBrowser: PreferredBrowser;
  preferredEditor: PreferredEditor;
  shortcutName: string;
};

export type MacActionPayload = {
  toolId: MacActionToolId;
  text: string;
  url?: string;
  path?: string;
  query?: string;
  filename?: string;
  folder?: MacFolder;
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
  const editor = env.PASTEPILOT_PREFERRED_EDITOR?.trim().toLowerCase();
  const preferredEditor: PreferredEditor =
    editor === "cursor" || editor === "vscode" || editor === "textedit" ? editor : "cursor";
  return {
    preferredBrowser,
    preferredEditor,
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
  const first = input.trim().split(/\r?\n/, 1)[0]?.trim() ?? "";
  return collapsedText(first || input, 80).replace(/…$/, "") || "PastePilot note";
}

export function reminderTitle(input: string): string {
  const first = input.trim().split(/\r?\n/, 1)[0]?.trim() ?? "";
  return collapsedText(first || input, 120).replace(/…$/, "") || "PastePilot reminder";
}

export function safeNoteFilename(input: string, ext: "txt" | "md" | "json" | "vcf"): string {
  const base =
    collapsedText(input, 40)
      .replace(/…$/, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "pastepilot-note";
  return `${base}.${ext}`;
}

function firstHttpUrl(input: string, parsed: ParsedFacts): string | undefined {
  return firstAllowlistedUrl(parsed.urls.length > 0 ? parsed.urls : [input]) ?? undefined;
}

function noteExtension(input: string): "txt" | "md" {
  return looksLikeCode(input) || input.trim().startsWith("#") ? "md" : "txt";
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
): MacActionPayload | { error: "empty" | "no_url" | "no_query" | "no_path" } {
  const text = input.trim().slice(0, 4000);
  const folderTools: MacActionToolId[] = [
    "reveal_in_finder",
    "open_in_terminal",
    "run_shortcut",
    "reveal_downloads",
    "reveal_desktop",
    "reveal_documents",
  ];
  if (!text && !folderTools.includes(toolId)) {
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

  if (toolId === "open_maps") {
    const query = collapsedText(input, 400).replace(/…$/, "");
    if (!query) {
      return { error: "no_query" };
    }
    const web = mapsWebUrl(query);
    return {
      toolId,
      text,
      query,
      url: appleMapsUrl(query),
      fallback: { type: "open_url", url: web },
    };
  }

  if (toolId === "open_in_editor") {
    const path = firstFilePath(input) ?? undefined;
    const ext = noteExtension(text);
    const filename = path ? undefined : safeNoteFilename(text, ext);
    return {
      toolId,
      text,
      path,
      filename,
      fallback: path
        ? { type: "stub" }
        : {
            type: "download",
            filename: filename ?? "pastepilot-note.txt",
            content: `${text}\n`,
            mime: ext === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8",
          },
    };
  }

  if (toolId === "save_to_desktop" || toolId === "save_to_downloads") {
    if (!text) {
      return { error: "empty" };
    }
    const ext = noteExtension(text);
    const filename = safeNoteFilename(text, ext);
    return {
      toolId,
      text,
      filename,
      folder: toolId === "save_to_desktop" ? "desktop" : "downloads",
      fallback: {
        type: "download",
        filename,
        content: `${text}\n`,
        mime: ext === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8",
      },
    };
  }

  if (toolId === "reveal_downloads" || toolId === "reveal_desktop" || toolId === "reveal_documents") {
    const folder: MacFolder =
      toolId === "reveal_downloads" ? "downloads" : toolId === "reveal_desktop" ? "desktop" : "documents";
    return {
      toolId,
      text,
      folder,
      fallback: { type: "stub" },
    };
  }

  if (toolId === "open_in_preview") {
    const path = firstFilePath(input);
    if (!path || !looksLikePreviewPath(input)) {
      return { error: "no_path" };
    }
    return {
      toolId,
      text,
      path,
      fallback: { type: "stub" },
    };
  }

  if (toolId === "call_phone" || toolId === "message_phone") {
    const phone = parsed.phones[0];
    const href = phone ? buildPhoneHref(toolId === "call_phone" ? "tel" : "sms", phone) : null;
    if (!phone || !href) {
      return { error: "no_query" };
    }
    return {
      toolId,
      text,
      query: phone,
      url: href,
      fallback: { type: "open_url", url: href },
    };
  }

  if (toolId === "open_enclosing_folder") {
    const path = firstFilePath(input);
    if (!path) {
      return { error: "no_path" };
    }
    return {
      toolId,
      text,
      path,
      fallback: { type: "stub" },
    };
  }

  if (toolId === "save_contact") {
    const content = buildVcard(text, parsed);
    if (!content) {
      return { error: "empty" };
    }
    const filename = safeNoteFilename(text || parsed.phones[0] || parsed.emails[0] || "contact", "vcf");
    return {
      toolId,
      text,
      filename,
      query: parsed.phones[0],
      fallback: {
        type: "download",
        filename,
        content,
        mime: "text/vcard;charset=utf-8",
      },
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
    if (toolId === "open_maps") {
      return "Opened a maps search in this browser. Apple Maps is Mac-only.";
    }
    if (toolId === "open_in_editor") {
      return "Saved a local file. Opening Cursor/VS Code/TextEdit is Mac-only.";
    }
    if (toolId === "save_to_desktop" || toolId === "save_to_downloads") {
      return "Saved a local download. Writing to Desktop/Downloads is Mac-only.";
    }
    if (toolId === "reveal_downloads" || toolId === "reveal_desktop" || toolId === "reveal_documents") {
      return "That folder reveal is Mac-only. Nothing was sent.";
    }
    if (toolId === "open_in_preview") {
      return "Preview is Mac-only. Nothing was sent.";
    }
    if (toolId === "call_phone") {
      return "Opened a tel: link. Phone.app targeting is Mac-only.";
    }
    if (toolId === "message_phone") {
      return "Opened an sms: draft. Messages.app targeting is Mac-only.";
    }
    if (toolId === "open_enclosing_folder") {
      return "Opening the enclosing folder is Mac-only. Nothing was sent.";
    }
    if (toolId === "save_contact") {
      return "Saved a vCard download. Contacts.app is Mac-only.";
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
  if (toolId === "open_maps") {
    return "Opened the address in Apple Maps.";
  }
  if (toolId === "open_in_editor") {
    return "Opened the text in the preferred editor. Missing apps fall back to TextEdit.";
  }
  if (toolId === "save_to_desktop") {
    return "Saved a new file on the Desktop. Existing files were not overwritten.";
  }
  if (toolId === "save_to_downloads") {
    return "Saved a new file in Downloads. Existing files were not overwritten.";
  }
  if (toolId === "reveal_downloads") {
    return "Opened Downloads in Finder.";
  }
  if (toolId === "reveal_desktop") {
    return "Opened Desktop in Finder.";
  }
  if (toolId === "reveal_documents") {
    return "Opened Documents in Finder.";
  }
  if (toolId === "open_in_preview") {
    return "Opened the file in Preview.";
  }
  if (toolId === "call_phone") {
    return "Opened a tel: link. Nothing was dialed until you confirm in Phone.";
  }
  if (toolId === "message_phone") {
    return "Opened an sms: draft. Nothing was sent.";
  }
  if (toolId === "open_enclosing_folder") {
    return "Opened the enclosing folder in Finder.";
  }
  if (toolId === "save_contact") {
    return "Opened a vCard stub. Nothing was sent.";
  }
  return "Opened the share sheet. Nothing was sent.";
}
