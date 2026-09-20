import type { ParsedFacts } from "./types";

const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE =
  /(?:tel:)?(?:\+|00)\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}|\(\d{3}\)\s*\d{3}[\s.-]?\d{4}|\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/gi;
const DATE_HINT_RE =
  /\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|heute|morgen|übermorgen|uebermorgen|nächste woche|naechste woche|next week|\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)\b/gi;
const TIME_RE =
  /\b(?:[01]?\d|2[0-3]):[0-5]\d(?:\s*(?:uhr|h))?\b|\b(?:[1-9]|1[0-2])\s*(?:am|pm)\b|\bum\s+(?:[01]?\d|2[0-3])\s*uhr\b/gi;

function trimTrailingPunctuation(value: string): string {
  return value.replace(/[),.;!?]+$/u, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function matchAll(input: string, pattern: RegExp): string[] {
  return unique(
    [...input.matchAll(pattern)].map((match) => trimTrailingPunctuation(match[0])),
  );
}

function normalizePhone(raw: string): string {
  return raw.replace(/^tel:/i, "").trim();
}

function hasEnoughDigits(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 10;
}

/**
 * Exact URL, date, time, email and phone extraction.
 * Does not classify content and never invents a send, call, or schedule action.
 */
export function parseFacts(input: string): ParsedFacts {
  return {
    urls: matchAll(input, URL_RE),
    dateHints: matchAll(input, DATE_HINT_RE),
    times: matchAll(input, TIME_RE),
    emails: matchAll(input, EMAIL_RE),
    phones: unique(matchAll(input, PHONE_RE).map(normalizePhone).filter(hasEnoughDigits)),
  };
}
