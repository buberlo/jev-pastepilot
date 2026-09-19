import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveDataDir } from "./save.ts";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_CONTENT_CHARS = 64_000;
const ALLOWED_NAME = /^[A-Za-z0-9._-]{1,80}$/;
const ALLOWED_EXT = new Set([".ics", ".md", ".json", ".log", ".txt"]);

export type ExportHttpResult = {
  status: number;
  body: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeFilename(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("..")) {
    return null;
  }
  if (!ALLOWED_NAME.test(trimmed)) {
    return null;
  }
  const ext = path.extname(trimmed).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return null;
  }
  return trimmed;
}

export async function writeExportFile(
  filename: string,
  content: string,
  options: { dataDir?: string } = {},
): Promise<{ path: string } | { error: "bad_filename" | "empty" }> {
  const name = safeFilename(filename);
  if (!name) {
    return { error: "bad_filename" };
  }
  const text = content.slice(0, MAX_CONTENT_CHARS);
  if (!text) {
    return { error: "empty" };
  }
  const dataDir = options.dataDir ?? resolveDataDir();
  const filePath = path.join(dataDir, name);
  await mkdir(dataDir, { recursive: true });
  await writeFile(filePath, text, "utf8");
  return { path: filePath };
}

export async function runExport(
  body: string,
  options: { dataDir?: string } = {},
): Promise<ExportHttpResult> {
  if (body.length > MAX_BODY_BYTES) {
    return { status: 400, body: { error: "malformed" } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return { status: 400, body: { error: "malformed" } };
  }
  if (!isRecord(parsed) || typeof parsed.filename !== "string" || typeof parsed.content !== "string") {
    return { status: 400, body: { error: "malformed" } };
  }

  try {
    const saved = await writeExportFile(parsed.filename, parsed.content, { dataDir: options.dataDir });
    if ("error" in saved) {
      return { status: 400, body: { error: saved.error } };
    }
    return { status: 200, body: { ok: true, path: saved.path } };
  } catch {
    return { status: 500, body: { error: "save_failed" } };
  }
}
