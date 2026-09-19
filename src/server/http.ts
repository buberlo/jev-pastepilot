import type { IncomingMessage } from "node:http";
import { handleShareRequest } from "../domain/share.ts";
import { runDecide } from "./decide.ts";
import { runExport } from "./export.ts";
import { runMacAction } from "./macAction.ts";
import { runSave } from "./save.ts";

export type ApiResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const TEXT_HEADERS = { "Content-Type": "text/plain; charset=utf-8" };

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

/**
 * Decide / save / export / mac / share / health. Returns null when the path is static UI.
 * Never logs the request body (pasted text) or TYPESAFE_API_KEY.
 */
export async function handleApiRequest(args: {
  method: string;
  url: string;
  contentType?: string;
  body?: string;
}): Promise<ApiResponse | null> {
  const method = args.method.toUpperCase();
  const pathOnly = (args.url.split("?")[0] ?? "/").replace(/\/+$/, "") || "/";

  if (pathOnly === "/health") {
    if (method !== "GET" && method !== "HEAD") {
      return json(405, { error: "method_not_allowed" });
    }
    return json(200, { ok: true });
  }

  if (pathOnly === "/api/decide") {
    if (method !== "POST") {
      return json(405, { error: "method_not_allowed" });
    }
    const result = await runDecide(args.body ?? "");
    return json(result.status, result.body);
  }

  if (pathOnly === "/api/save") {
    if (method !== "POST") {
      return json(405, { error: "method_not_allowed" });
    }
    const result = await runSave(args.body ?? "");
    return json(result.status, result.body);
  }

  if (pathOnly === "/api/export") {
    if (method !== "POST") {
      return json(405, { error: "method_not_allowed" });
    }
    const result = await runExport(args.body ?? "");
    return json(result.status, result.body);
  }

  if (pathOnly === "/api/mac") {
    if (method !== "POST") {
      return json(405, { error: "method_not_allowed" });
    }
    const result = await runMacAction(args.body ?? "");
    return json(result.status, result.body);
  }

  const share = handleShareRequest({
    method,
    url: args.url,
    contentType: args.contentType,
    body: args.body,
  });
  if (!share) {
    return null;
  }
  if (share.status === 400) {
    return {
      status: 400,
      headers: TEXT_HEADERS,
      body: "PastePilot share target expected text, q, or url.",
    };
  }
  return {
    status: share.status,
    headers: { Location: share.location },
    body: "",
  };
}

function json(status: number, body: unknown): ApiResponse {
  return {
    status,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}
