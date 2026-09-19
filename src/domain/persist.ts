import { formatInboxMarkdown, type LocalSaveEntry } from "./saveLocal";

export type PersistResult = {
  ok: boolean;
  message: string;
  path?: string;
  count?: number;
  downloaded?: boolean;
};

function triggerInboxDownload(entry: LocalSaveEntry): boolean {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    return false;
  }
  try {
    const blob = new Blob([formatInboxMarkdown(entry)], {
      type: "text/markdown;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `pastepilot-${entry.toolId}.md`;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
    return true;
  } catch {
    return false;
  }
}

/**
 * Append via the local dev server, or download a markdown snippet if the
 * server is unavailable. Never emails, calendars, or calls an external API.
 */
export async function persistLocalSave(entry: LocalSaveEntry): Promise<PersistResult> {
  try {
    const response = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId: entry.toolId, text: entry.text }),
    });
    if (response.ok) {
      const body = (await response.json()) as { path?: string; count?: number };
      const where = body.path ?? "your local inbox";
      const n = typeof body.count === "number" ? ` (${body.count} saved)` : "";
      return {
        ok: true,
        message: `Saved to ${where}${n}. Nothing was sent or scheduled.`,
        path: body.path,
        count: body.count,
      };
    }
  } catch {
    // Fall through to a browser download. Do not log the pasted text.
  }

  if (triggerInboxDownload(entry)) {
    return {
      ok: true,
      message: "Saved a local download. Nothing was sent or scheduled.",
      downloaded: true,
    };
  }

  return { ok: false, message: "Could not save locally." };
}

export function openConfirmedUrl(url: string): boolean {
  if (typeof window === "undefined" || typeof window.open !== "function") {
    return false;
  }
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  return opened !== null;
}
