import { firstAllowlistedUrl } from "./openUrl";
import { parseFacts } from "./parsers";
import { buildLocalSaveEntry, isLocalSaveTool, type LocalSaveEntry } from "./saveLocal";
import { isToolId, toolLabel } from "./tools";
import type { ActionPreview, ExecutionResult, ToolId } from "./types";

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

export type StubEffect = {
  type: "stub";
  toolId: ToolId;
};

export type ExecutionEffect = OpenUrlEffect | SaveLocalEffect | StubEffect;

function urlsForOpen(preview: ActionPreview, input: string | undefined): string[] {
  if (input !== undefined) {
    return parseFacts(input).urls;
  }
  return preview.facts
    .filter((fact) => fact.startsWith("Link: "))
    .map((fact) => fact.slice("Link: ".length));
}

/**
 * Execution gate. Rechecks current-state rules immediately before any adapter.
 * Never auto-runs. Confirm is required. Email, calendar, and unrelated network
 * writes stay unwired.
 */
export function confirmExecution(args: ConfirmArgs): ExecutionResult {
  if (!args.confirmed) {
    return {
      ok: false,
      reason: "unconfirmed",
      message: "Nothing ran. Confirm is required.",
    };
  }
  if (args.preview.stateVersion !== args.currentStateVersion) {
    return {
      ok: false,
      reason: "stale",
      message: "The pasted text changed. Confirm was ignored.",
    };
  }
  if (!isToolId(args.preview.toolId)) {
    return {
      ok: false,
      reason: "unknown_tool",
      message: "That tool is not on the allowlist.",
    };
  }

  const toolId = args.preview.toolId;
  const input = args.input ?? "";

  if (toolId === "open_url") {
    const candidates = urlsForOpen(args.preview, args.input);
    if (candidates.length === 0) {
      return {
        ok: false,
        reason: "no_url",
        message: "No link to open. Confirm was ignored.",
      };
    }
    const url = firstAllowlistedUrl(candidates);
    if (!url) {
      return {
        ok: false,
        reason: "blocked_url",
        message: "That link is not http or https. Confirm was ignored.",
      };
    }
    return {
      ok: true,
      message: `Opened ${url} in your browser. Nothing else was sent or scheduled.`,
      effect: { type: "open_url", url },
    };
  }

  if (isLocalSaveTool(toolId)) {
    const entry = buildLocalSaveEntry(toolId, input);
    if (!entry) {
      return {
        ok: false,
        reason: "empty",
        message: "Nothing to save. Confirm was ignored.",
      };
    }
    return {
      ok: true,
      message: `Saving “${toolLabel(toolId)}” to your local inbox. Nothing was sent or scheduled.`,
      effect: { type: "save_local", entry },
    };
  }

  return {
    ok: true,
    message: `Prepared “${toolLabel(toolId)}” locally. Nothing was sent or scheduled.`,
    effect: { type: "stub", toolId },
  };
}
