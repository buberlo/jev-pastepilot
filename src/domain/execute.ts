import { buildIcsDraft, buildMailtoUrl } from "./drafts";
import { buildMacActionPayload, isMacActionTool, type MacActionPayload } from "./macActions";
import { firstAllowlistedUrl } from "./openUrl";
import { parseFacts } from "./parsers";
import { screenPaste } from "./screenPaste";
import { buildLocalSaveEntry, isLocalSaveTool, type LocalSaveEntry } from "./saveLocal";
import { isSearchOpenTool, urlForSearchTool } from "./searchLinks";
import { firstFilePath, prettyJson } from "./signals";
import { isToolId, toolLabel } from "./tools";
import type { ActionPreview, ExecutionResult, MacActionFallback, ToolId } from "./types";

export type ConfirmArgs = {
  preview: ActionPreview;
  currentStateVersion: string;
  confirmed: boolean;
  /** Current paste text. Used for URL allowlist and local save. */
  input?: string;
};

export type OpenUrlEffect = {
  type: "open_url";
  url: string;
};

export type SaveLocalEffect = {
  type: "save_local";
  entry: LocalSaveEntry;
};

export type CopyEffect = {
  type: "copy";
  text: string;
};

export type DownloadEffect = {
  type: "download";
  filename: string;
  content: string;
  mime: string;
};

export type StubEffect = {
  type: "stub";
  toolId: ToolId;
};

export type MacActionEffect = {
  type: "mac_action";
  toolId: ToolId;
  text: string;
  url?: string;
  path?: string;
  query?: string;
  filename?: string;
  folder?: string;
  fallback: MacActionFallback;
};

export type ScreenEffect = {
  type: "screen";
  summary: string;
};

export type ExecutionEffect =
  | OpenUrlEffect
  | SaveLocalEffect
  | CopyEffect
  | DownloadEffect
  | MacActionEffect
  | ScreenEffect
  | StubEffect;

function urlsForOpen(preview: ActionPreview, input: string | undefined): string[] {
  if (input !== undefined) {
    return parseFacts(input).urls;
  }
  return preview.facts
    .filter((fact) => fact.startsWith("Link: "))
    .map((fact) => fact.slice("Link: ".length));
}

function fail(reason: ExecutionResult["reason"], message: string): ExecutionResult {
  return { ok: false, reason, message };
}

/**
 * Execution gate. Rechecks current-state rules immediately before any adapter.
 * Never auto-runs. Confirm is required. Email and calendar stay drafts only
 * (mailto: / .ics download). No unrelated network write.
 */
export function confirmExecution(args: ConfirmArgs): ExecutionResult {
  if (!args.confirmed) {
    return fail("unconfirmed", "Nothing ran. Confirm is required.");
  }
  if (args.preview.stateVersion !== args.currentStateVersion) {
    return fail("stale", "The pasted text changed. Confirm was ignored.");
  }
  if (!isToolId(args.preview.toolId)) {
    return fail("unknown_tool", "That tool is not on the allowlist.");
  }

  const toolId = args.preview.toolId;
  const input = args.input ?? "";
  const parsed = parseFacts(input);

  if (toolId === "open_url") {
    const candidates = urlsForOpen(args.preview, args.input);
    if (candidates.length === 0) {
      return fail("no_url", "No link to open. Confirm was ignored.");
    }
    const url = firstAllowlistedUrl(candidates);
    if (!url) {
      return fail("blocked_url", "That link is not http or https. Confirm was ignored.");
    }
    return {
      ok: true,
      message: `Opened ${url} in your browser. Nothing else was sent or scheduled.`,
      effect: { type: "open_url", url },
    };
  }

  if (isSearchOpenTool(toolId)) {
    const url = urlForSearchTool(toolId, input, parsed);
    if (!url) {
      return fail("no_query", "Nothing to search. Confirm was ignored.");
    }
    return {
      ok: true,
      message: `Opened ${url} in your browser. Nothing else was sent or scheduled.`,
      effect: { type: "open_url", url },
    };
  }

  if (toolId === "draft_email") {
    const url = buildMailtoUrl(input, parsed);
    if (!url) {
      return fail("empty", "Nothing to draft. Confirm was ignored.");
    }
    return {
      ok: true,
      message: "Opened a mail draft. Nothing was sent.",
      effect: { type: "open_url", url },
    };
  }

  if (toolId === "copy_to_clipboard" || toolId === "draft_message" || toolId === "copy_posix_path") {
    const text = toolId === "copy_posix_path" ? (firstFilePath(input) ?? "") : input.trim();
    if (!text) {
      return fail(toolId === "copy_posix_path" ? "no_path" : "empty", "Nothing to copy. Confirm was ignored.");
    }
    return {
      ok: true,
      message: `Copied “${toolLabel(toolId)}”. Nothing was sent or scheduled.`,
      effect: { type: "copy", text },
    };
  }

  if (toolId === "extract_urls") {
    const urls = parsed.urls.filter((url) => Boolean(firstAllowlistedUrl([url])));
    if (urls.length === 0) {
      return fail("no_url", "No http(s) links to copy. Confirm was ignored.");
    }
    return {
      ok: true,
      message: "Copied parsed links. Nothing was sent or scheduled.",
      effect: { type: "copy", text: urls.join("\n") },
    };
  }

  if (toolId === "draft_event") {
    const content = buildIcsDraft(input, parsed);
    if (!content) {
      return fail("empty", "Nothing to draft. Confirm was ignored.");
    }
    return {
      ok: true,
      message: "Saving an .ics draft. Nothing was sent or scheduled.",
      effect: {
        type: "download",
        filename: "pastepilot-draft.ics",
        content,
        mime: "text/calendar;charset=utf-8",
      },
    };
  }

  if (toolId === "format_json") {
    const content = prettyJson(input);
    if (!content) {
      return fail("invalid_json", "That text is not JSON. Confirm was ignored.");
    }
    return {
      ok: true,
      message: "Saving pretty-printed JSON. Nothing was sent or scheduled.",
      effect: {
        type: "download",
        filename: "pastepilot.json",
        content: `${content}\n`,
        mime: "application/json;charset=utf-8",
      },
    };
  }

  if (toolId === "open_log_viewer") {
    const text = input.trim();
    if (!text) {
      return fail("empty", "Nothing to save. Confirm was ignored.");
    }
    return {
      ok: true,
      message: "Saving a local log file. Nothing was sent or scheduled.",
      effect: {
        type: "download",
        filename: "pastepilot.log",
        content: `${text}\n`,
        mime: "text/plain;charset=utf-8",
      },
    };
  }

  if (isLocalSaveTool(toolId)) {
    const entry = buildLocalSaveEntry(toolId, input);
    if (!entry) {
      return fail("empty", "Nothing to save. Confirm was ignored.");
    }
    return {
      ok: true,
      message: `Saving “${toolLabel(toolId)}” to your local inbox. Nothing was sent or scheduled.`,
      effect: { type: "save_local", entry },
    };
  }

  if (toolId === "screen_paste") {
    if (!input.trim()) {
      return fail("empty", "Nothing to screen. Confirm was ignored.");
    }
    const screened = screenPaste(input);
    return {
      ok: true,
      message: "Screened this paste locally. Nothing was sent or written.",
      effect: { type: "screen", summary: screened.summary },
    };
  }

  if (isMacActionTool(toolId)) {
    const payload = buildMacActionPayload(toolId, input, parsed);
    if ("error" in payload) {
      const reason =
        payload.error === "empty"
          ? "empty"
          : payload.error === "no_path"
            ? "no_path"
            : payload.error;
      const message =
        payload.error === "no_url"
          ? "No http(s) link to open. Confirm was ignored."
          : payload.error === "no_query"
            ? "Nothing to look up. Confirm was ignored."
            : payload.error === "no_path"
              ? "No safe path to open. Confirm was ignored."
              : "Nothing to run. Confirm was ignored.";
      return fail(reason, message);
    }
    return okMacAction(payload);
  }

  return {
    ok: true,
    message: `Prepared “${toolLabel(toolId)}” locally. Nothing was sent or scheduled.`,
    effect: { type: "stub", toolId },
  };
}

function okMacAction(payload: MacActionPayload): ExecutionResult {
  return {
    ok: true,
    message: `Confirm will run “${toolLabel(payload.toolId)}” on this Mac if available. Nothing silent runs.`,
    effect: {
      type: "mac_action",
      toolId: payload.toolId,
      text: payload.text,
      url: payload.url,
      path: payload.path,
      query: payload.query,
      filename: payload.filename,
      folder: payload.folder,
      fallback: payload.fallback,
    },
  };
}
