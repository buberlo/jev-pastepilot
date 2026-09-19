const MAX_URL_LENGTH = 2048;
const BLOCKED_SCHEMES =
  /^(javascript|data|file|blob|about|vbscript|ftp|ws|wss|mailto|intent|chrome|vscode):/i;

/**
 * Exact http(s) allowlist for Open link.
 * Parsers extract candidates; this function decides whether Confirm may open one.
 */
export function allowlistedHttpUrl(raw: string): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
    return null;
  }
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return null;
  }
  if (BLOCKED_SCHEMES.test(trimmed)) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  if (parsed.username || parsed.password) {
    return null;
  }
  if (!parsed.hostname) {
    return null;
  }
  return parsed.href;
}

export function firstAllowlistedUrl(candidates: readonly string[]): string | null {
  for (const candidate of candidates) {
    const allowed = allowlistedHttpUrl(candidate);
    if (allowed) {
      return allowed;
    }
  }
  return null;
}
