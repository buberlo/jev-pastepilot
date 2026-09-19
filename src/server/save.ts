import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildLocalSaveEntry,
  countInboxEntries,
  formatInboxMarkdown,
  isLocalSaveTool,
} from "../domain/saveLocal.ts";
import { isToolId } from "../domain/tools.ts";

const MAX_BODY_BYTES = 64 * 1024;
const INBOX_NAME = "inbox.md";

export type SaveHttpResult = {
  status: number;
  body: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function resolveDataDir(cwd = process.cwd()): string {
  const env = process.env.PASTEPILOT_DATA_DIR?.trim();
  if (env) {
    return path.resolve(env);
  }
  return path.join(cwd, ".local", "pastepilot");
}

export function inboxFilePath(dataDir = resolveDataDir()): string {
  return path.join(dataDir, INBOX_NAME);
}

export async function appendLocalSave(
  toolId: string,
  text: string,
  options: { dataDir?: string; savedAt?: string } = {},
): Promise<{ path: string; count: number } | { error: "unknown_tool" | "empty" }> {
  if (!isToolId(toolId) || !isLocalSaveTool(toolId)) {
    return { error: "unknown_tool" };
  }
  const entry = buildLocalSaveEntry(toolId, text, options.savedAt);
  if (!entry) {
    return { error: "empty" };
  }

  const dataDir = options.dataDir ?? resolveDataDir();
  const filePath = inboxFilePath(dataDir);
  await mkdir(dataDir, { recursive: true });
  let existing = "";
  try {
    existing = await readFile(filePath, "utf8");
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code !== "ENOENT") {
      throw error;
    }
  }
  const next = `${existing}${formatInboxMarkdown(entry)}`;
  await writeFile(filePath, next, "utf8");
  return { path: filePath, count: countInboxEntries(next) };
}

export async function runSave(
  body: string,
  options: { dataDir?: string } = {},
): Promise<SaveHttpResult> {
  if (body.length > MAX_BODY_BYTES) {
    return { status: 400, body: { error: "malformed" } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return { status: 400, body: { error: "malformed" } };
  }
  if (!isRecord(parsed) || typeof parsed.toolId !== "string" || typeof parsed.text !== "string") {
    return { status: 400, body: { error: "malformed" } };
  }

  try {
    const saved = await appendLocalSave(parsed.toolId, parsed.text, { dataDir: options.dataDir });
    if ("error" in saved) {
      const status = saved.error === "unknown_tool" ? 400 : 400;
      return { status, body: { error: saved.error } };
    }
    return { status: 200, body: { ok: true, path: saved.path, count: saved.count } };
  } catch {
    return { status: 500, body: { error: "save_failed" } };
  }
}
