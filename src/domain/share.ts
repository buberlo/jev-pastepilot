/**
 * Thin Share / URL ingest. Turns a query string or share-target body into
 * pasted text. Does not route, execute, or log the payload.
 */

export const SHARED_TEXT_KEYS = ["text", "q"] as const;

const FORM_TYPE = "application/x-www-form-urlencoded";
const JSON_TYPE = "application/json";
const TEXT_TYPE = "text/plain";

export function mediaType(contentType = ""): string {
  return contentType.split(";")[0].trim().toLowerCase();
}

/** Read `?text=` or `?q=`. Missing keys mean "no share". An empty value is still a share. */
export function readSharedText(search: string): string | null {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  for (const key of SHARED_TEXT_KEYS) {
    if (params.has(key)) {
      return params.get(key) ?? "";
    }
  }
  return null;
}

/** Form / JSON / plain share-target bodies. Prefers `text`, then `q`, then `url`. */
export function parseShareBody(body: string, contentType = ""): string | null {
  const type = mediaType(contentType);
  if (type === FORM_TYPE) {
    return readSharedText(body) ?? readShareUrlField(body);
  }
  if (type === JSON_TYPE) {
    return parseShareJson(body);
  }
  if (type === TEXT_TYPE || type === "") {
    return body;
  }
  return null;
}

function readShareUrlField(body: string): string | null {
  const params = new URLSearchParams(body);
  if (params.has("url")) {
    return params.get("url") ?? "";
  }
  return null;
}

function parseShareJson(body: string): string | null {
  try {
    const data = JSON.parse(body) as { text?: unknown; q?: unknown; url?: unknown };
    if (typeof data.text === "string") {
      return data.text;
    }
    if (typeof data.q === "string") {
      return data.q;
    }
    if (typeof data.url === "string") {
      return data.url;
    }
    return null;
  } catch {
    return null;
  }
}

export function shareRedirectPath(text: string, extraSearch = ""): string {
  const extra = extraSearch.startsWith("?") ? extraSearch.slice(1) : extraSearch;
  const params = new URLSearchParams(extra);
  params.delete("text");
  params.delete("q");
  params.set("text", text);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export type ShareRedirect = {
  status: number;
  location: string;
};

/**
 * Map GET/POST /share onto the same `/?text=` ingest the React app already runs.
 * Returns null when the path is not the share target.
 */
export function handleShareRequest(args: {
  method: string;
  url: string;
  contentType?: string;
  body?: string;
}): ShareRedirect | null {
  const parsed = new URL(args.url, "http://pastepilot.local");
  if (parsed.pathname !== "/share") {
    return null;
  }

  const method = args.method.toUpperCase();
  const keep = new URLSearchParams(parsed.search);
  keep.delete("text");
  keep.delete("q");

  if (method === "GET" || method === "HEAD") {
    const text = readSharedText(parsed.search);
    if (text === null) {
      const leftover = keep.toString();
      return { status: 302, location: leftover ? `/?${leftover}` : "/" };
    }
    return { status: 302, location: shareRedirectPath(text, keep.toString()) };
  }

  if (method === "POST") {
    const text = parseShareBody(args.body ?? "", args.contentType ?? "");
    if (text === null) {
      return { status: 400, location: "" };
    }
    return { status: 303, location: shareRedirectPath(text, keep.toString()) };
  }

  return null;
}

export function shareAppUrl(
  text: string,
  base = "http://localhost:5173",
  options: { provider?: string } = {},
): string {
  const origin = base.replace(/\/$/, "");
  const extra = new URLSearchParams();
  const provider = options.provider?.trim().toLowerCase();
  if (provider === "jev" || provider === "local") {
    extra.set("provider", provider);
  }
  return `${origin}${shareRedirectPath(text, extra.toString())}`;
}
