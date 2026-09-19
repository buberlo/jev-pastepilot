import { isMacActionTool, macActionMessage, type MacActionToolId } from "./macActions";
import { formatInboxMarkdown, type LocalSaveEntry } from "./saveLocal";

export type PersistResult = {
  ok: boolean;
  message: string;
  path?: string;
  count?: number;
  downloaded?: boolean;
};

function triggerDownload(filename: string, content: string, mime: string): boolean {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    return false;
  }
  try {
    const blob = new Blob([content], { type: mime });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
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

function triggerInboxDownload(entry: LocalSaveEntry): boolean {
  return triggerDownload(
    `pastepilot-${entry.toolId}.md`,
    formatInboxMarkdown(entry),
    "text/markdown;charset=utf-8",
  );
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
  // Chrome returns null when noopener is set, even if the tab opened.
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export async function copyConfirmedText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to execCommand. Do not log the pasted text.
  }
  if (typeof document === "undefined") {
    return false;
  }
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "true");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    document.body.append(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  } catch {
    return false;
  }
}

export async function persistDownload(args: {
  filename: string;
  content: string;
  mime: string;
}): Promise<PersistResult> {
  try {
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: args.filename, content: args.content }),
    });
    if (response.ok) {
      const body = (await response.json()) as { path?: string };
      const where = body.path ?? "your local folder";
      return {
        ok: true,
        message: `Saved to ${where}. Nothing was sent or scheduled.`,
        path: body.path,
      };
    }
  } catch {
    // Fall through to a browser download. Do not log the pasted text.
  }

  if (triggerDownload(args.filename, args.content, args.mime)) {
    return {
      ok: true,
      message: "Saved a local download. Nothing was sent or scheduled.",
      downloaded: true,
    };
  }

  return { ok: false, message: "Could not save locally." };
}

export type MacPersistResult = {
  ok: boolean;
  used: "mac" | "fallback";
  message: string;
  reason?: "no_shortcut" | "mac_failed" | "not_mac";
};

type NativeMacHandler = {
  postMessage: (payload: Record<string, unknown>) => unknown;
};

/**
 * WKWebView bridge registered by the Mac app (`webkit.messageHandlers.macAction`).
 * Missing in browsers and in tests unless stubbed.
 */
export function nativeMacBridge(): NativeMacHandler | null {
  const webkit = (globalThis as {
    webkit?: { messageHandlers?: { macAction?: NativeMacHandler } };
  }).webkit;
  const handler = webkit?.messageHandlers?.macAction;
  if (!handler || typeof handler.postMessage !== "function") {
    return null;
  }
  return handler;
}

function readMacReply(raw: unknown, toolId: MacActionToolId): MacPersistResult | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const body = raw as { ok?: boolean; used?: string; message?: string; error?: string };
  if (body.error === "no_shortcut") {
    return {
      ok: false,
      used: "fallback",
      message: "No Shortcut name in Settings. Confirm was ignored.",
      reason: "no_shortcut",
    };
  }
  if (body.ok === false) {
    return {
      ok: false,
      used: "fallback",
      message: body.message ?? "That Mac action could not run. Confirm was ignored.",
      reason: "mac_failed",
    };
  }
  if (body.used === "mac" || body.used === "fallback") {
    return {
      ok: true,
      used: body.used,
      message: body.message ?? macActionMessage(toolId, body.used),
    };
  }
  return null;
}

/**
 * Prefer the Mac app's native Swift Confirm (WKWebView). Web/Linux and
 * `npm run dev` on a Mac fall through to `POST /api/mac`. Never sends the
 * API key. Never logs the paste.
 */
export async function persistMacAction(args: {
  toolId: string;
  text: string;
  url?: string;
  path?: string;
  query?: string;
  content?: string;
}): Promise<MacPersistResult> {
  if (!isMacActionTool(args.toolId)) {
    return { ok: false, used: "fallback", message: "That tool is not a Mac action.", reason: "mac_failed" };
  }
  const payload = {
    toolId: args.toolId,
    text: args.text,
    url: args.url,
    path: args.path,
    query: args.query,
    content: args.content,
  };

  const native = nativeMacBridge();
  if (native) {
    try {
      const parsed = readMacReply(await Promise.resolve(native.postMessage(payload)), args.toolId);
      if (parsed) {
        return parsed;
      }
    } catch {
      // Fall through to the local server. Do not log the pasted text.
    }
  }

  try {
    const response = await fetch("/api/mac", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { used?: string; message?: string; error?: string };
    const parsed = readMacReply({ ...body, ok: response.ok }, args.toolId);
    if (parsed) {
      return parsed;
    }
    if (body.error === "no_shortcut") {
      return {
        ok: false,
        used: "fallback",
        message: "No Shortcut name in Settings. Confirm was ignored.",
        reason: "no_shortcut",
      };
    }
  } catch {
    // Fall through. Do not log the pasted text.
  }
  return {
    ok: true,
    used: "fallback",
    message: macActionMessage(args.toolId, "fallback"),
    reason: "not_mac",
  };
}
