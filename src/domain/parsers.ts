import type { ParsedFacts } from "./types";

const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
const DATE_HINT_RE =
  /\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|heute|morgen|nächste woche|naechste woche|next week|\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)\b/gi;

function trimTrailingPunctuation(value: string): string {
  return value.replace(/[),.;!?]+$/u, "");
}

/** Exact URL and date-hint extraction. Does not classify content. */
export function parseFacts(input: string): ParsedFacts {
  const urls = [
    ...new Set([...input.matchAll(URL_RE)].map((match) => trimTrailingPunctuation(match[0]))),
  ];
  const dateHints = [...new Set([...input.matchAll(DATE_HINT_RE)].map((match) => match[0]))];
  return { urls, dateHints };
}
