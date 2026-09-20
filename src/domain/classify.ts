import { parseFacts } from "./parsers";
import {
  looksLikeAddress,
  looksLikeCode,
  looksLikeDictionaryWord,
  looksLikeEmailPaste,
  looksLikeFilePath,
  looksLikeJson,
  looksLikePhonePaste,
  looksLikeUrlPaste,
} from "./signals";
import type { ContentKind } from "./types";

const INJECTION_RE =
  /(?:^|\n)\s*SYSTEM\s*:|ignore (?:all )?(?:previous|prior) (?:instructions|prompts)|send every clipboard|exfiltrate|jailbreak|you are now (?:a |an )/i;

const LOG_RE =
  /\b(error|exception|traceback|failed|failure|refused|fatal|panic|errno|stack trace|connection refused)\b/i;

const MEETING_RE =
  /\b(meeting|meet(?:ing)?(?: me)?|appointment|calendar|konferenz|besprechung|termin|lass uns|treffen)\b|\bsprechen\b.*\b(über|ueber)\b|\blet'?s (?:meet|talk|discuss)\b/i;

const IDEA_RE =
  /\b(idea|idee|what if|an app that|build an? |lets me|would be cool)\b/i;

const TASK_RE =
  /\b(todo|to-do|need to|remember to|follow up|aufgabe|task:)\b/i;

export type InternalKind = ContentKind | "empty" | "injection" | "ambiguous";

export function isInjection(input: string): boolean {
  return INJECTION_RE.test(input);
}

/**
 * Strong date-ish meeting: an ISO date plus a time or meeting word.
 * Ordinary “morgen / tomorrow” meeting notes stay on the mock KIND_TOOLS path.
 */
export function looksLikeMeetingPaste(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || isInjection(trimmed) || LOG_RE.test(trimmed)) {
    return false;
  }
  const facts = parseFacts(trimmed);
  const hasIso = facts.dateHints.some((hint) => /^\d{4}-\d{2}-\d{2}$/.test(hint));
  return hasIso && (facts.times.length > 0 || MEETING_RE.test(trimmed));
}

export function classify(input: string): InternalKind {
  const trimmed = input.trim();
  if (!trimmed) {
    return "empty";
  }
  if (isInjection(trimmed)) {
    return "injection";
  }

  const facts = parseFacts(trimmed);
  const words = trimmed.split(/\s+/);
  const strong =
    LOG_RE.test(trimmed) ||
    MEETING_RE.test(trimmed) ||
    IDEA_RE.test(trimmed) ||
    TASK_RE.test(trimmed) ||
    facts.urls.length > 0 ||
    facts.emails.length > 0 ||
    facts.phones.length > 0 ||
    looksLikeJson(trimmed) ||
    looksLikeAddress(trimmed) ||
    looksLikeCode(trimmed) ||
    looksLikeFilePath(trimmed) ||
    looksLikeDictionaryWord(trimmed) ||
    looksLikePhonePaste(trimmed) ||
    looksLikeEmailPaste(trimmed);

  if (words.length <= 3 && !strong) {
    return "ambiguous";
  }
  if (LOG_RE.test(trimmed)) {
    return "error_log";
  }
  if (MEETING_RE.test(trimmed)) {
    return "meeting";
  }
  if (looksLikeUrlPaste(trimmed) || isMostlyUrl(trimmed, facts.urls)) {
    return "url";
  }
  if (IDEA_RE.test(trimmed)) {
    return "idea";
  }
  if (TASK_RE.test(trimmed)) {
    return "task";
  }
  return "ordinary";
}

function isMostlyUrl(text: string, urls: string[]): boolean {
  if (urls.length === 0) {
    return false;
  }
  const withoutUrls = urls.reduce((acc, url) => acc.replace(url, ""), text).trim();
  return withoutUrls.length === 0 || withoutUrls.length < 24;
}
