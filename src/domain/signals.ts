import { allowlistedHttpUrl } from "./openUrl";

export const MAX_COLLAPSE = 400;
export const MAX_SAVE_TRANSFORM = 32_000;

const ADDRESS_RE =
  /\b\d{1,5}\s+[\p{L}].{4,}|\b(?:street|strasse|straße|str\.|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|platz|lane|ln\.?|drive|dr\.?)\b/iu;

const CODE_RE =
  /^```|^(?:function |const |let |var |class |def |import |from |#include |package |fn )/m;

const GITHUB_HOSTS = new Set(["github.com", "www.github.com", "gist.github.com"]);

/** Collapse whitespace for previews and search queries. Does not log. */
export function collapsedText(input: string, max = MAX_COLLAPSE): string {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function looksLikeJson(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) {
    return false;
  }
  try {
    const value: unknown = JSON.parse(trimmed);
    return value !== null && typeof value === "object";
  } catch {
    return false;
  }
}

export function looksLikeAddress(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) {
    return false;
  }
  return ADDRESS_RE.test(trimmed);
}

export function looksLikeCode(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || looksLikeJson(trimmed)) {
    return false;
  }
  return CODE_RE.test(trimmed);
}

export function firstGithubUrl(urls: readonly string[]): string | null {
  for (const raw of urls) {
    const allowed = allowlistedHttpUrl(raw);
    if (!allowed) {
      continue;
    }
    try {
      const host = new URL(allowed).hostname.toLowerCase();
      if (GITHUB_HOSTS.has(host)) {
        return allowed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function asChecklist(input: string): string {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return "";
  }
  return lines
    .map((line) => {
      if (/^[-*]\s+\[[ xX]\]\s+/.test(line)) {
        return line;
      }
      if (/^[-*]\s+/.test(line)) {
        return `- [ ] ${line.replace(/^[-*]\s+/, "")}`;
      }
      return `- [ ] ${line}`;
    })
    .join("\n")
    .slice(0, MAX_SAVE_TRANSFORM);
}

export function prettyJson(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(trimmed);
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}
