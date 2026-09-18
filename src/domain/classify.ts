import { parseFacts } from "./parsers";
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
    facts.urls.length > 0;

  if (words.length <= 3 && !strong) {
    return "ambiguous";
  }
  if (LOG_RE.test(trimmed)) {
    return "error_log";
  }
  if (MEETING_RE.test(trimmed)) {
    return "meeting";
  }
  if (isMostlyUrl(trimmed, facts.urls)) {
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
