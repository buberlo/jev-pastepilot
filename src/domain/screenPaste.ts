import { classify, isInjection } from "./classify";
import { parseFacts } from "./parsers";

/**
 * Local judgment summary (jev-mcp screen/verify, user-facing).
 * No network, no write. Confirm still required so it is not a silent side effect.
 */
export function screenPaste(input: string): {
  injection: boolean;
  kind: string;
  words: number;
  urls: number;
  emails: number;
  dateHints: number;
  empty: boolean;
  summary: string;
} {
  const trimmed = input.trim();
  const kind = classify(trimmed);
  const parsed = parseFacts(trimmed);
  const injection = isInjection(trimmed);
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const summary = [
    injection ? "Injection: yes — routing abstains." : "Injection: no",
    `Kind: ${kind}`,
    `Words: ${words}`,
    `Links: ${parsed.urls.length}`,
    `Emails: ${parsed.emails.length}`,
    `Date hints: ${parsed.dateHints.length}`,
  ].join("\n");
  return {
    injection,
    kind,
    words,
    urls: parsed.urls.length,
    emails: parsed.emails.length,
    dateHints: parsed.dateHints.length,
    empty: !trimmed,
    summary,
  };
}
