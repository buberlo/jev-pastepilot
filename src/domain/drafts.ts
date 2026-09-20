import { collapsedText } from "./signals";
import type { ParsedFacts } from "./types";

const MAX_MAILTO = 4000;
const MAX_ICS_DESC = 4000;

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function icsStamp(date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function exactIsoDate(parsed: ParsedFacts): string | null {
  const hit = parsed.dateHints.find((hint) => /^\d{4}-\d{2}-\d{2}$/.test(hint));
  return hit ?? null;
}

function exactClock(parsed: ParsedFacts): string | null {
  const hit = parsed.times.find((time) => /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(time));
  if (!hit) {
    return null;
  }
  const [hours, minutes] = hit.split(":");
  return `${hours.padStart(2, "0")}${minutes}00`;
}

/** mailto: draft only. Never sends. Rejects control characters and oversize bodies. */
export function buildMailtoUrl(input: string, parsed: ParsedFacts): string | null {
  const body = input.trim().slice(0, 2000);
  if (!body) {
    return null;
  }
  const to = parsed.emails[0] ?? "";
  if (to && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(to)) {
    return null;
  }
  const subject = collapsedText(input, 80).replace(/…$/, "");
  const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return allowlistedMailtoUrl(url);
}

/** tel: or sms: draft. Never places a call or sends a message. */
export function buildPhoneHref(scheme: "tel" | "sms", phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.replace(/\D/g, "").length < 10 || digits.length > 20) {
    return null;
  }
  return `${scheme}:${digits}`;
}

/** Minimal vCard. Confirm never writes Contacts itself on web/Linux. */
export function buildVcard(input: string, parsed: ParsedFacts): string | null {
  const phone = parsed.phones[0] ?? "";
  const email = parsed.emails[0] ?? "";
  const text = input.trim();
  if (!phone && !email && !text) {
    return null;
  }
  const name = collapsedText(text, 60).replace(/…$/, "") || phone || email || "PastePilot contact";
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${name.replace(/[\r\n;]/g, " ")}`,
    phone ? `TEL:${phone.replace(/[\r\n;]/g, "")}` : "",
    email ? `EMAIL:${email}` : "",
    "END:VCARD",
    "",
  ];
  return lines.filter((line, index) => line !== "" || index === lines.length - 1).join("\r\n");
}

export function allowlistedMailtoUrl(raw: string): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_MAILTO) {
    return null;
  }
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return null;
  }
  if (!trimmed.toLowerCase().startsWith("mailto:")) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "mailto:") {
      return null;
    }
  } catch {
    return null;
  }
  return trimmed;
}

/**
 * Calendar draft as ICS text. DTSTART is set only from an exact ISO date.
 * Date words like "tomorrow" stay in the description. Not a schedule write.
 */
export function buildIcsDraft(input: string, parsed: ParsedFacts, createdAt = new Date()): string | null {
  const text = input.trim();
  if (!text) {
    return null;
  }
  const stamp = icsStamp(createdAt);
  const summary = collapsedText(text, 80).replace(/…$/, "") || "PastePilot draft";
  const hints = [
    ...parsed.dateHints.map((hint) => `Date hint: ${hint}`),
    ...parsed.times.map((time) => `Time: ${time}`),
  ];
  const description = [
    text.slice(0, MAX_ICS_DESC),
    "",
    "PastePilot draft — not scheduled. Confirm never writes a calendar.",
    ...hints,
  ].join("\n");

  const iso = exactIsoDate(parsed);
  const clock = exactClock(parsed);
  const dtStart = iso
    ? clock
      ? `DTSTART:${iso.replace(/-/g, "")}T${clock}`
      : `DTSTART;VALUE=DATE:${iso.replace(/-/g, "")}`
    : `DTSTART:${stamp}`;
  const placeholder = iso ? "" : "X-PASTEPILOT-DRAFT:1\n";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PastePilot//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:pastepilot-${stamp}@local`,
    `DTSTAMP:${stamp}`,
    dtStart,
    placeholder.trimEnd(),
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    "STATUS:TENTATIVE",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ]
    .filter((line) => line !== "")
    .join("\r\n");
}
