import { allowlistedHttpUrl } from "./openUrl";
import { parseFacts } from "./parsers";

export const MAX_COLLAPSE = 400;
export const MAX_SAVE_TRANSFORM = 32_000;
export const PREVIEW_PATH_RE = /\.(?:pdf|png|jpe?g|gif|webp|tiff?|heic|bmp)$/i;
export const CODE_PATH_RE =
  /\.(?:[jt]sx?|mjs|cjs|json|md|py|rb|go|rs|swift|java|kt|c|cc|cpp|h|hpp|cs|php|sh|zsh|bash|sql|yml|yaml|toml|xml|html|css|scss)$/i;

const ADDRESS_RE =
  /\b\d{1,5}[A-Za-z]?\s+[\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,3}\s+(?:street|strasse|straße|str\.|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|platz|lane|ln\.?|drive|dr\.?|way|court|ct\.?|gasse|weg|allee)\b|\b(?:street|strasse|straße|avenue|ave\.|road|boulevard|blvd\.|platz|lane|drive|gasse|weg|allee)\b/iu;

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
export function looksLikePreviewPath(input: string): boolean {
  const path = firstFilePath(input);
  return Boolean(path && PREVIEW_PATH_RE.test(path));
}

export function looksLikeEditorPath(input: string): boolean {
  const path = firstFilePath(input);
  return Boolean(path && CODE_PATH_RE.test(path));
}

/** Whole paste is one http(s) link, or a link plus a short leftover. */
export function looksLikeUrlPaste(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || looksLikeFilePath(trimmed)) {
    return false;
  }
  const urls = parseFacts(trimmed).urls;
  if (urls.length === 0) {
    return false;
  }
  const leftover = urls.reduce((acc, url) => acc.replace(url, ""), trimmed).trim();
  return leftover.length === 0 || leftover.length < 24;
}

/** Whole paste is one email / mailto, or an email plus a short leftover. */
export function looksLikeEmailPaste(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || looksLikeFilePath(trimmed) || looksLikeUrlPaste(trimmed)) {
    return false;
  }
  if (/^mailto:/i.test(trimmed)) {
    return true;
  }
  const emails = parseFacts(trimmed).emails;
  if (emails.length === 0) {
    return false;
  }
  const leftover = emails.reduce((acc, email) => acc.replace(email, ""), trimmed).replace(/^mailto:/i, "").trim();
  return leftover.length === 0 || leftover.length < 24;
}

export function looksLikePhone(input: string): boolean {
  return firstPhone(input) !== null;
}

/** Whole paste is a phone number, optionally with a short leftover. */
export function looksLikePhonePaste(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || looksLikeFilePath(trimmed) || looksLikeUrlPaste(trimmed) || looksLikeEmailPaste(trimmed)) {
    return false;
  }
  const phones = parseFacts(trimmed).phones;
  if (phones.length === 0) {
    return false;
  }
  const leftover = phones.reduce((acc, phone) => acc.replace(phone, ""), trimmed).replace(/^tel:/i, "").trim();
  return leftover.length === 0 || leftover.length < 16;
}

export function firstPhone(input: string): string | null {
  return parseFacts(input).phones[0] ?? null;
}

export function phoneHref(scheme: "tel" | "sms", phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.replace(/\D/g, "").length < 10) {
    return null;
  }
  return `${scheme}:${digits}`;
}

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
