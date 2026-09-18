import { isToolId, toolLabel } from "./tools";
import type { ActionPreview, ExecutionResult } from "./types";

export type ConfirmArgs = {
  preview: ActionPreview;
  currentStateVersion: string;
  confirmed: boolean;
};

/**
 * Execution gate. Rechecks current-state rules immediately before the local stub.
 * This never sends email, writes a calendar, or calls an external API.
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

  return {
    ok: true,
    message: `Prepared “${toolLabel(args.preview.toolId)}” locally. Nothing was sent or scheduled.`,
  };
}
