import { allowlistedHttpUrl } from "./openUrl";

export const MAX_COLLAPSE = 400;
export const MAX_SAVE_TRANSFORM = 32_000;

const ADDRESS_RE =
  /\b\d{1,5}\s+[\p{L}].{4,}|\b(?:street|strasse|straße|str\.|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|platz|lane|ln\.?|drive|dr\.?)\b/iu;

const CODE_RE =
  /^```|^(?:function |const |let |var |class |def |import |from |#include |package |fn )/m;

const GITHUB_HOSTS = new Set(["github.com", "www.github.com", "gist.github.com"]);

const UNSAFE_PATH = /[;|&$`\n\r]|\$\(/;

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

/** First line looks like a file or folder path. Never treat URLs as paths. */
export function firstFilePath(input: string): string | null {
  const firstLine = input.trim().split(/\r?\n/, 1)[0]?.trim() ?? "";
  if (!firstLine || firstLine.length > 400 || UNSAFE_PATH.test(firstLine)) {
    return null;
  }
  if (/^https?:\/\//i.test(firstLine) || /\s/.test(firstLine)) {
    return null;
  }
  if (/^(?:~|\/|[A-Za-z]:[\\/])/.test(firstLine)) {
    return firstLine;
  }
  return null;
}

export function looksLikeFilePath(input: string): boolean {
  return firstFilePath(input) !== null;
}

/** One dictionary-like word. Used to surface dict:// / Spotlight, not to classify meaning. */
export function looksLikeDictionaryWord(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length < 3 || trimmed.length > 40 || /\s/.test(trimmed)) {
    return false;
  }
  if (/^https?:\/\//i.test(trimmed) || looksLikeJson(trimmed) || looksLikeCode(trimmed)) {
    return false;
  }
  return /^[\p{L}][\p{L}'’-]*$/u.test(trimmed);
}

export function dictionaryWord(input: string): string | null {
  const trimmed = input.trim();
  if (looksLikeDictionaryWord(trimmed)) {
    return trimmed;
  }
  const first = trimmed.split(/\s+/)[0]?.replace(/[),.;!?]+$/u, "") ?? "";
  if (looksLikeDictionaryWord(first)) {
    return first;
  }
  return null;
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
