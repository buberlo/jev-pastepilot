import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  appleString,
  dictUrl,
  isMacActionTool,
  macActionMessage,
  readMacSettings,
  shortcutsRunUrl,
  type MacActionToolId,
} from "../domain/macActions.ts";
import { firstFilePath } from "../domain/signals.ts";
import { writeExportFile } from "./export.ts";
import { resolveDataDir } from "./save.ts";

const execFileAsync = promisify(execFile);
const MAX_BODY_BYTES = 64 * 1024;
const MAX_TEXT = 4000;

export type MacHttpResult = {
  status: number;
  body: unknown;
};

export type MacCommandRunner = {
  platform: NodeJS.Platform;
  open: (args: string[]) => Promise<boolean>;
  osascript: (source: string) => Promise<boolean>;
  say: (text: string) => Promise<boolean>;
  notify: (title: string, subtitle: string) => Promise<boolean>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createDefaultMacRunner(platform = process.platform): MacCommandRunner {
  return {
    platform,
    async open(args) {
      await execFileAsync("open", args, { timeout: 8000 });
      return true;
    },
    async osascript(source) {
      await execFileAsync("osascript", ["-e", source], { timeout: 8000 });
      return true;
    },
    async say(text) {
      await execFileAsync("say", [text], { timeout: 20_000 });
      return true;
    },
    async notify(title, subtitle) {
      const script = `display notification "${appleString(subtitle)}" with title "${appleString(title)}"`;
      await execFileAsync("osascript", ["-e", script], { timeout: 5000 });
      return true;
    },
  };
}

async function tryRun(run: () => Promise<boolean>): Promise<boolean> {
  try {
    return await run();
  } catch {
    return false;
  }
}

export async function executeMacAction(
  toolId: MacActionToolId,
  input: {
    text?: string;
    url?: string;
    path?: string;
    query?: string;
    content?: string;
  },
  options: {
    runner?: MacCommandRunner;
    dataDir?: string;
    env?: Record<string, string | undefined>;
  } = {},
): Promise<{ ok: true; used: "mac" | "fallback"; message: string } | { ok: false; error: string }> {
  const runner = options.runner ?? createDefaultMacRunner();
  const settings = readMacSettings(options.env ?? process.env);
  const text = (input.text ?? "").trim().slice(0, MAX_TEXT);

  if (runner.platform !== "darwin") {
    return {
      ok: true,
      used: "fallback",
      message: macActionMessage(toolId, "fallback"),
    };
  }

  if (toolId === "open_in_notes") {
    if (!text) {
      return { ok: false, error: "empty" };
    }
    const title = appleString(text.slice(0, 80).replace(/\s+/g, " "));
    const body = appleString(text);
    const wrote = await tryRun(() =>
      runner.osascript(
        `tell application "Notes" to make new note with properties {name:"${title}", body:"${body}"}`,
      ),
    );
    if (!wrote) {
      await tryRun(() => runner.open(["-a", "Notes"]));
    }
    return { ok: true, used: "mac", message: macActionMessage(toolId, "mac") };
  }

  if (toolId === "add_reminder") {
    if (!text) {
      return { ok: false, error: "empty" };
    }
    const name = appleString(text.slice(0, 120).replace(/\s+/g, " "));
    const wrote = await tryRun(() =>
      runner.osascript(`tell application "Reminders" to make new reminder with properties {name:"${name}"}`),
    );
    if (!wrote) {
      await tryRun(() => runner.open(["x-apple-reminderkit://"]));
    }
    return { ok: true, used: "mac", message: macActionMessage(toolId, "mac") };
  }

  if (toolId === "open_in_calendar") {
    const content = (input.content || input.text || "").trim();
    if (!content.includes("BEGIN:VCALENDAR")) {
      return { ok: false, error: "empty" };
    }
    const saved = await writeExportFile("pastepilot-draft.ics", content, {
      dataDir: options.dataDir ?? resolveDataDir(),
    });
    if ("error" in saved) {
      return { ok: false, error: saved.error };
    }
    const opened = await tryRun(() => runner.open([saved.path]));
    if (!opened) {
      return { ok: false, error: "mac_failed" };
    }
    return { ok: true, used: "mac", message: macActionMessage(toolId, "mac") };
  }

  if (toolId === "reveal_in_finder") {
    const target = input.path || firstFilePath(text) || options.dataDir || resolveDataDir();
    const revealed = await tryRun(() => runner.open(["-R", target]));
    if (!revealed) {
      await tryRun(() => runner.open([target]));
    }
    return { ok: true, used: "mac", message: macActionMessage(toolId, "mac") };
  }

  if (toolId === "open_in_safari" || toolId === "open_in_chrome") {
    const url = input.url?.trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      return { ok: false, error: "no_url" };
    }
    const app = toolId === "open_in_safari" ? "Safari" : "Google Chrome";
    const opened = await tryRun(() => runner.open(["-a", app, url]));
    if (!opened) {
      await tryRun(() => runner.open([url]));
    }
    return { ok: true, used: "mac", message: macActionMessage(toolId, "mac") };
  }

  if (toolId === "dictionary_lookup") {
    const word = (input.query || text).trim();
    if (!word) {
      return { ok: false, error: "no_query" };
    }
    const opened = await tryRun(() => runner.open([dictUrl(word)]));
    if (!opened) {
      return { ok: false, error: "mac_failed" };
    }
    return { ok: true, used: "mac", message: macActionMessage(toolId, "mac") };
  }

  if (toolId === "spotlight_search") {
    const query = (input.query || text).trim();
    if (!query) {
      return { ok: false, error: "no_query" };
    }
    await tryRun(() =>
      runner.osascript(
        `tell application "System Events" to keystroke " " using {command down}`,
      ),
    );
    await tryRun(() => runner.notify("PastePilot", "Query copied. Paste into Spotlight."));
    return { ok: true, used: "mac", message: macActionMessage(toolId, "mac") };
  }

  if (toolId === "open_in_terminal") {
    const pathArg = input.path || firstFilePath(text);
    const opened = pathArg
      ? await tryRun(() => runner.open(["-a", "Terminal", pathArg]))
      : await tryRun(() => runner.open(["-a", "Terminal"]));
    if (!opened) {
      return { ok: false, error: "mac_failed" };
    }
    return { ok: true, used: "mac", message: macActionMessage(toolId, "mac") };
  }

  if (toolId === "run_shortcut") {
    const url = shortcutsRunUrl(settings.shortcutName, text);
    if (!url) {
      return { ok: false, error: "no_shortcut" };
    }
    const opened = await tryRun(() => runner.open([url]));
    if (!opened) {
      return { ok: false, error: "mac_failed" };
    }
    return { ok: true, used: "mac", message: macActionMessage(toolId, "mac") };
  }

  if (toolId === "speak_text") {
    if (!text) {
      return { ok: false, error: "empty" };
    }
    const spoke = await tryRun(() => runner.say(text.slice(0, 400)));
    if (!spoke) {
      return { ok: false, error: "mac_failed" };
    }
    return { ok: true, used: "mac", message: macActionMessage(toolId, "mac") };
  }

  await tryRun(() => runner.notify("PastePilot", "Text copied. Share from another app if you want."));
  return { ok: true, used: "mac", message: macActionMessage("share_text", "mac") };
}

/**
 * Confirm-only Mac actions. Never logs the body or TYPESAFE_API_KEY.
 */
export async function runMacAction(
  body: string,
  options: {
    runner?: MacCommandRunner;
    dataDir?: string;
    env?: Record<string, string | undefined>;
  } = {},
): Promise<MacHttpResult> {
  if (body.length > MAX_BODY_BYTES) {
    return { status: 400, body: { error: "malformed" } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return { status: 400, body: { error: "malformed" } };
  }
  if (!isRecord(parsed) || typeof parsed.toolId !== "string") {
    return { status: 400, body: { error: "malformed" } };
  }
  if (!isMacActionTool(parsed.toolId)) {
    return { status: 400, body: { error: "unknown_tool" } };
  }

  const text = typeof parsed.text === "string" ? parsed.text : "";
  const url = typeof parsed.url === "string" ? parsed.url : undefined;
  const path = typeof parsed.path === "string" ? parsed.path : undefined;
  const query = typeof parsed.query === "string" ? parsed.query : undefined;
  const content = typeof parsed.content === "string" ? parsed.content : undefined;

  try {
    const result = await executeMacAction(
      parsed.toolId,
      { text, url, path, query, content },
      options,
    );
    if (!result.ok) {
      const status = result.error === "no_shortcut" ? 400 : 400;
      return { status, body: { error: result.error } };
    }
    return {
      status: 200,
      body: { ok: true, used: result.used, message: result.message, platform: (options.runner ?? createDefaultMacRunner()).platform },
    };
  } catch {
    return { status: 500, body: { error: "mac_failed" } };
  }
}
